# VS Code 扩展宿主模拟器项目规划

## 项目结构

```
ext-host/
├── host/
│   ├── host.js                # 主进程：加载&管理扩展
│   └── api-protocol.js        # IPC 消息协议定义（常量/帮助函数）
├── worker/
│   ├── extension-worker.js    # 子进程：加载扩展并运行
│   └── vscode-shim.js         # 在子进程注入的最小 vscode API
└── extensions/
    ├── hello-world/
    │   ├── package.json
    │   └── extension.js
    └── logger/
        ├── package.json
        └── extension.js
```

## 核心组件说明

### 1. 主进程 (host/host.js)
- 负责发现和加载扩展
- 管理扩展的生命周期
- 处理扩展间的通信
- 广播事件给所有扩展
- 路由命令到指定扩展

### 2. 协议定义 (host/api-protocol.js)
- 定义主进程与扩展进程间的通信协议
- 包含消息类型常量和帮助函数

### 3. 扩展工作进程 (worker/extension-worker.js)
- 在独立子进程中运行每个扩展
- 提供隔离的运行环境
- 注入最小化的 vscode API
- 处理扩展的激活和停用

### 4. VS Code API 模拟 (worker/vscode-shim.js)
- 提供最小化的 vscode API 实现
- 通过 IPC 与主进程通信
- 实现基本的窗口、命令、工作区功能

### 5. 示例扩展
- hello-world: 演示基本的命令注册和事件处理
- logger: 演示扩展的并行执行

## 实现步骤

1. 创建主进程文件 (host/host.js)
2. 创建协议定义文件 (host/api-protocol.js)
3. 创建子进程入口文件 (worker/extension-worker.js)
4. 创建最小 vscode API 实现 (worker/vscode-shim.js)
5. 创建示例扩展 hello-world
6. 创建示例扩展 logger
7. 验证项目结构

## 设计要点

- **并行**：每个扩展用 `child_process`（或 `worker_threads`）单独运行
- **隔离**：进程级隔离，限制工作目录和模块访问
- **API shim**：在子进程里注入一个最小版 `vscode` 实现
- **协议**：主进程 ⇄ 扩展子进程的消息协议
- **生命周期**：加载 package.json → 判断 activationEvents → activate(context) → 管理 subscriptions → deactivate()
- **多扩展**：主进程维护扩展注册表；广播事件时循环投递；命令调用时定向到注册者

## 可扩展功能

1. **ActivationEvents 完整支持**：`onLanguage:*`、`workspaceContains`、`onFileSystem:*` 等
2. **命令路由表**：支持一个命令由多个扩展声明时的优先级/冲突策略
3. **超时与资源限额**：对子进程设定启动/命令执行超时；RSS/CPU 使用监控，超限重启
4. **ESM Loader 白名单**：如扩展是 ESM，使用自定义 loader 拦截 `import`
5. **调试/热重载**：侦听扩展文件变化，热重启对应子进程
6. **API 覆盖面**：逐步补全 `vscode` API