// worker/extension-worker.js
const path = require('path');
const { PROTOCOL } = require('../host/api-protocol');
const createVscodeApi = require('./vscode-shim');
const { createExtensionContext } = require('./vscode-extension-context');

const extId = process.env.EXTENSION_ID;
const extMain = process.env.EXTENSION_MAIN;
const extDir = process.env.EXTENSION_DIR;

let extensionModule;
let extensionContext = null;
let vscode = null;
const commandHandlers = new Map();

function log(...args) {
  process.send?.({ type: PROTOCOL.LOG, payload: args });
}

function registerCommand(command, handler) {
  commandHandlers.set(command, handler);
  process.send?.({ type: PROTOCOL.REGISTER_COMMAND, command });
}


function safeRequire(p) {
  // 只允许相对路径/本扩展内模块；外部内置模块可做白名单
  if (p === 'vscode') return vscode;

  if (p.startsWith('.') || p.startsWith('/')) {
    const target = path.join(extDir, p);
    if (!target.startsWith(extDir)) {
      throw new Error('Require path escapes extension dir');
    }
    return require(target);
  }

  // 可选白名单（例如 'path', 'url'）
  // const whitelist = new Set(['path', 'url']);
  // if (!whitelist.has(p)) throw new Error(`Module not allowed: ${p}`);
  return require(p);
}

function loadExtension() {
  // 注入最小 vscode API
  vscode = createVscodeApi({ log, registerCommand });

  // 将 require 覆盖到扩展模块内部（仅对 CommonJS 扩展生效）
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (p) {
    if (this?.filename && this.filename.startsWith(extDir)) {
      return safeRequire(p);
    }
    return originalRequire.call(this, p);
  };

  // 加载扩展主文件
  extensionModule = require(extMain);

  if (typeof extensionModule.activate !== 'function') {
    throw new Error('Extension missing activate()');
  }
}

process.on('message', async (msg) => {
  switch (msg.type) {
    case PROTOCOL.ACTIVATE:
      try {
        if (!extensionModule) loadExtension();
        if (!extensionContext) extensionContext = createExtensionContext(extDir);
        await extensionModule.activate(extensionContext);
        process.send?.({ type: PROTOCOL.LOG, payload: [`${extId} activated`] });
      } catch (e) {
        log('activate error', e?.stack || e?.message || String(e));
      }
      break;

    case PROTOCOL.DEACTIVATE:
      try {
        if (extensionModule?.deactivate) await extensionModule.deactivate();
        process.exit(0);
      } catch (e) {
        log('deactivate error', e?.stack || e?.message || String(e));
        process.exit(1);
      }
      break;

    case PROTOCOL.EXECUTE_COMMAND: {
      const fn = commandHandlers.get(msg.command);
      if (fn) {
        try { await Promise.resolve(fn(...(msg.args || []))); }
        catch (e) { log('command error', msg.command, e?.message); }
      }
      break;
    }

    case PROTOCOL.EVENT: {
      // 这里可以按照 activationEvents 策略决定是否调用 activate
      // 简化处理：扩展内部可通过 vscode.events.on(...) 订阅
      vscode.__emitEvent?.(msg.eventName, msg.payload);
      break;
    }
  }
});

process.send?.({ type: PROTOCOL.READY });