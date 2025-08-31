// host/host.js
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { PROTOCOL } = require('./api-protocol');

const EXT_DIR = path.join(__dirname, '..', 'extensions');

function discoverExtensions() {
  const dirs = fs.readdirSync(EXT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(EXT_DIR, d.name));

  const exts = [];
  for (const dir of dirs) {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.main) pkg.main = 'extension.js';
    exts.push({
      id: pkg.name || path.basename(dir),
      dir,
      main: path.join(dir, pkg.main),
      activationEvents: pkg.activationEvents || ['*'],
      contributes: pkg.contributes || {},
    });
  }
  return exts;
}

function spawnExtension(ext) {
  const workerPath = path.join(__dirname, '..', 'worker', 'extension-worker.js');
  const nodeArgs = [
    // 可选：启用权限模型（Node 20+ 实验）
    // '--experimental-permission',
    // '--allow-fs-read', ext.dir, // 白名单
  ];

  const child = fork(workerPath, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      NODE_ENV: 'production',
      EXTENSION_ID: ext.id,
      EXTENSION_MAIN: ext.main,
      EXTENSION_DIR: ext.dir,
    },
    execArgv: nodeArgs,
    cwd: ext.dir, // 将工作目录限制为扩展目录
  });

  child.on('message', (msg) => handleMessage(ext, child, msg));
  child.stdout.on('data', d => process.stdout.write(`[${ext.id}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[${ext.id}][ERR] ${d}`));
  child.on('exit', (code, signal) => {
    console.log(`[host] extension ${ext.id} exited code=${code} sig=${signal}`);
    // 可选：重启策略
  });

  return child;
}

const extensionProcs = new Map();

function handleMessage(ext, child, msg) {
  switch (msg.type) {
    case PROTOCOL.READY:
      child.send({ type: PROTOCOL.ACTIVATE, payload: { context: {/* 可传 host 信息 */} } });
      break;
    case PROTOCOL.REGISTER_COMMAND:
      // 记录命令归属
      commands.set(msg.command, ext.id);
      break;
    case PROTOCOL.LOG:
      console.log(`[${ext.id}][log]`, ...msg.payload);
      break;
    case PROTOCOL.REQUEST_HOST:
      // 子进程向 host 请求操作（如文件选择/网络代理等）
      // 这里可根据 msg.action 做不同处理，然后再 child.send(...) 回应
      break;
    default:
      // 事件/通知广播等
      break;
  }
}

const commands = new Map(); // cmd -> extensionId

function executeCommand(command, args = []) {
  const extId = commands.get(command);
  if (!extId) throw new Error(`Command not found: ${command}`);
  const child = extensionProcs.get(extId);
  child.send({ type: PROTOCOL.EXECUTE_COMMAND, command, args });
}

function broadcastEvent(eventName, payload) {
  for (const child of extensionProcs.values()) {
    child.send({ type: PROTOCOL.EVENT, eventName, payload });
  }
}

function main() {
  const exts = discoverExtensions();
  for (const ext of exts) {
    const child = spawnExtension(ext);
    extensionProcs.set(ext.id, child);
  }

  // // 示例：所有扩展激活完再广播一个事件
  // setTimeout(() => broadcastEvent('onStartupFinished', {}), 100);

  // // 示例：3 秒后触发 hello-world.registerHello 命令
  // setTimeout(() => {
  //   try { executeCommand('hello.sayHello', ['from host']); }
  //   catch (e) { console.error(e); }
  // }, 3000);
}

main();