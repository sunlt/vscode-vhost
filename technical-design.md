# VS Code 扩展宿主模拟器技术设计

## 1. 主进程设计 (host/host.js)

### 1.1 功能概述
主进程负责：
- 发现和加载扩展
- 管理扩展生命周期
- 处理进程间通信
- 路由命令和事件

### 1.2 核心函数

#### discoverExtensions()
- 扫描 extensions 目录
- 读取每个扩展的 package.json
- 构建扩展元数据对象

#### spawnExtension(ext)
- 使用 child_process.fork 创建子进程
- 配置环境变量传递扩展信息
- 设置 IPC 通信监听器
- 重定向子进程的标准输出和错误输出

#### handleMessage(ext, child, msg)
- 处理来自扩展子进程的消息
- 根据消息类型执行相应操作：
  - READY: 扩展已准备就绪，发送 ACTIVATE 消息
  - REGISTER_COMMAND: 注册命令到命令表
  - LOG: 输出扩展日志
  - REQUEST_HOST: 处理扩展向主进程的请求

#### executeCommand(command, args)
- 根据命令查找对应的扩展
- 向目标扩展发送 EXECUTE_COMMAND 消息

#### broadcastEvent(eventName, payload)
- 向所有扩展子进程广播事件

## 2. 协议设计 (host/api-protocol.js)

### 2.1 消息类型
```js
const PROTOCOL = {
  READY: 'ready',              // 子进程准备就绪
  ACTIVATE: 'activate',        // 激活扩展
  DEACTIVATE: 'deactivate',    // 停用扩展
  EVENT: 'event',              // 事件广播
  REGISTER_COMMAND: 'register_command',  // 注册命令
  EXECUTE_COMMAND: 'execute_command',    // 执行命令
  LOG: 'log',                  // 日志消息
  REQUEST_HOST: 'request_host' // 扩展向主进程请求
};
```

## 3. 扩展工作进程设计 (worker/extension-worker.js)

### 3.1 功能概述
扩展工作进程负责：
- 加载扩展代码
- 提供最小化的 vscode API
- 处理主进程消息
- 管理扩展生命周期

### 3.2 核心函数

#### loadExtension()
- 创建 vscode API shim
- 覆盖 require 函数实现模块白名单
- 加载扩展主文件

#### buildContext()
- 构建扩展上下文对象
- 包含 subscriptions、globalState 等

#### safeRequire(p)
- 实现模块访问白名单
- 防止扩展访问受限模块

#### 消息处理
- 处理主进程发送的 ACTIVATE、DEACTIVATE、EXECUTE_COMMAND、EVENT 消息

## 4. VS Code API 模拟设计 (worker/vscode-shim.js)

### 4.1 实现的 API

#### window
- showInformationMessage: 显示信息消息

#### commands
- registerCommand: 注册命令
- executeCommand: 执行命令

#### workspace
- getConfiguration: 获取配置

#### events
- EventEmitter: 事件发射器
- __emitEvent: 内部事件发射函数

## 5. 扩展生命周期管理

### 5.1 激活流程
1. 主进程发现扩展
2. 创建扩展子进程
3. 子进程发送 READY 消息
4. 主进程发送 ACTIVATE 消息
5. 子进程加载扩展并调用 activate 函数

### 5.2 停用流程
1. 主进程发送 DEACTIVATE 消息
2. 子进程调用 deactivate 函数
3. 子进程退出

## 6. 安全设计

### 6.1 进程隔离
- 每个扩展在独立子进程中运行
- 崩溃不会影响其他扩展或主进程

### 6.2 模块白名单
- 限制扩展可访问的 Node.js 内置模块
- 防止访问文件系统或网络 API

### 6.3 工作目录限制
- 将子进程工作目录限制在扩展目录内
- 防止访问其他目录

## 7. 通信协议

### 7.1 消息格式
```js
{
  type: 'message_type',
  payload: { /* 消息内容 */ }
}
```

### 7.2 典型通信流程
1. 子进程启动 → 发送 READY 消息
2. 主进程响应 → 发送 ACTIVATE 消息
3. 子进程激活扩展 → 发送 REGISTER_COMMAND 消息注册命令
4. 用户触发命令 → 主进程发送 EXECUTE_COMMAND 消息
5. 扩展执行命令 → 可能发送 REQUEST_HOST 消息请求主进程功能