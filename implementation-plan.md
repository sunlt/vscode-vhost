# VS Code 扩展宿主模拟器实现计划

## 1. 创建主进程文件 (host/host.js)

### 1.1 实现要点
- 使用 Node.js 的 `child_process` 模块创建子进程
- 实现扩展发现机制，扫描 extensions 目录
- 建立 IPC 通信机制处理进程间消息
- 实现命令路由和事件广播功能

### 1.2 核心代码结构
```js
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { PROTOCOL } = require('./api-protocol');

// 扩展发现函数
function discoverExtensions() { /* ... */ }

// 创建扩展子进程
function spawnExtension(ext) { /* ... */ }

// 消息处理函数
function handleMessage(ext, child, msg) { /* ... */ }

// 命令执行函数
function executeCommand(command, args = []) { /* ... */ }

// 事件广播函数
function broadcastEvent(eventName, payload) { /* ... */ }

// 主函数
function main() { /* ... */ }
```

## 2. 创建协议定义文件 (host/api-protocol.js)

### 2.1 实现要点
- 定义所有 IPC 消息类型常量
- 导出协议对象供主进程和子进程使用

### 2.2 核心代码结构
```js
const PROTOCOL = {
  READY: 'ready',
  ACTIVATE: 'activate',
  DEACTIVATE: 'deactivate',
  EVENT: 'event',
  REGISTER_COMMAND: 'register_command',
  EXECUTE_COMMAND: 'execute_command',
  LOG: 'log',
  REQUEST_HOST: 'request_host',
};

module.exports = { PROTOCOL };
```

## 3. 创建子进程入口文件 (worker/extension-worker.js)

### 3.1 实现要点
- 从环境变量获取扩展信息
- 实现安全的模块加载机制
- 创建并注入 vscode API shim
- 处理主进程消息并调用扩展函数

### 3.2 核心代码结构
```js
const path = require('path');
const { PROTOCOL } = require('../host/api-protocol');
const createVscodeApi = require('./vscode-shim');

// 环境变量获取
const extId = process.env.EXTENSION_ID;
const extMain = process.env.EXTENSION_MAIN;
const extDir = process.env.EXTENSION_DIR;

// 日志函数
function log(...args) { /* ... */ }

// 命令注册函数
function registerCommand(command, handler) { /* ... */ }

// 构建扩展上下文
function buildContext() { /* ... */ }

// 安全模块加载
function safeRequire(p) { /* ... */ }

// 扩展加载函数
function loadExtension() { /* ... */ }

// 消息监听器
process.on('message', async (msg) => { /* ... */ });

// 发送准备就绪消息
process.send?.({ type: PROTOCOL.READY });
```

## 4. 创建最小 vscode API 实现 (worker/vscode-shim.js)

### 4.1 实现要点
- 实现基本的 window、commands、workspace API
- 提供事件系统支持
- 通过 IPC 与主进程通信

### 4.2 核心代码结构
```js
const { EventEmitter } = require('events');

module.exports = function createVscodeApi({ log, registerCommand }) {
  const events = new EventEmitter();

  const window = {
    showInformationMessage: async (...args) => { /* ... */ },
  };

  const commands = {
    registerCommand: (id, handler) => { /* ... */ },
    executeCommand: (id, ...args) => { /* ... */ }
  };

  const workspace = {
    getConfiguration: (section) => ({ /* ... */ }),
  };

  const __emitEvent = (name, payload) => events.emit(name, payload);

  return {
    window,
    commands,
    workspace,
    events,
    __emitEvent,
  };
};
```

## 5. 创建示例扩展 hello-world

### 5.1 package.json
```json
{
  "name": "hello-world",
  "main": "extension.js",
  "activationEvents": ["onStartupFinished", "onCommand:hello.sayHello"]
}
```

### 5.2 extension.js
```js
const vscode = require('vscode');

function activate(context) {
  vscode.commands.registerCommand('hello.sayHello', (from) => {
    vscode.window.showInformationMessage(`Hello World! ${from ?? ''}`);
  });

  vscode.events.on('onStartupFinished', () => {
    vscode.window.showInformationMessage('Startup finished, hello!');
  });

  console.log('[hello-world] activated');
}

function deactivate() {
  console.log('[hello-world] deactivated');
}

module.exports = { activate, deactivate };
```

## 6. 创建示例扩展 logger

### 6.1 package.json
```json
{
  "name": "logger",
  "main": "extension.js",
  "activationEvents": ["*"]
}
```

### 6.2 extension.js
```js
const vscode = require('vscode');

function activate() {
  console.log('[logger] activated');
  vscode.window.showInformationMessage('logger online');
}

module.exports = { activate };
```

## 7. 验证项目结构

### 7.1 验证要点
- 确保所有必需文件都已创建
- 验证文件内容符合设计要求
- 确认目录结构正确
- 检查示例扩展可以正常加载

### 7.2 验证步骤
1. 检查目录结构：
   ```
   ext-host/
   ├── host/
   │   ├── host.js
   │   └── api-protocol.js
   ├── worker/
   │   ├── extension-worker.js
   │   └── vscode-shim.js
   └── extensions/
       ├── hello-world/
       │   ├── package.json
       │   └── extension.js
       └── logger/
           ├── package.json
           └── extension.js
   ```

2. 验证各文件内容符合技术设计要求
3. 确认示例扩展符合规范