# VS Code 扩展宿主模拟器

## 项目简介

这是一个基于 Node.js 的 VS Code 扩展宿主模拟器，支持多个扩展并行、隔离运行，并提供最小化的 VS Code API。该模拟器允许开发者在独立环境中测试和运行 VS Code 扩展。

## 核心特性

- **并行执行**：每个扩展在独立的 Node.js 子进程中运行
- **进程隔离**：扩展间完全隔离，一个扩展的崩溃不会影响其他扩展
- **最小化 API**：提供核心的 VS Code API 功能
- **生命周期管理**：完整的扩展生命周期管理（激活、停用）
- **安全设计**：模块访问控制和工作目录限制

## 项目结构

```
ext-host/
├── host/
│   ├── host.js                # 主进程：加载&管理扩展
│   └── api-protocol.js        # IPC 消息协议定义
├── worker/
│   ├── extension-worker.js    # 子进程：加载扩展并运行
│   └── vscode-shim.js         # 最小 vscode API 实现
├── extensions/
│   ├── hello-world/           # Hello World 扩展示例
│   │   ├── package.json
│   │   └── extension.js
│   └── logger/                # Logger 扩展示例
│       ├── package.json
│       └── extension.js
├── test-project.js            # 项目验证脚本
└── README.md                  # 项目说明文档
```

## 快速开始

1. 确保已安装 Node.js (建议使用 Node.js 12+)
2. 克隆或下载本项目
3. 进入 host 目录：`cd host`
4. 运行主进程：`node host.js`

## 设计要点

### 并行执行
每个扩展用 `child_process` 单独运行，实现天然并行。

### 进程隔离
- 进程级隔离（推荐）：`fork` 子进程 + 最小环境变量 + 限制工作目录
- 模块白名单：限制扩展可访问的 Node.js 内置模块

### API shim
在子进程里注入一个最小版 `vscode` 实现，通过 IPC 向主进程请求能力。

### 通信协议
主进程与扩展子进程间通过预定义的 IPC 协议通信。

### 生命周期管理
加载 `package.json` → 判断 `activationEvents` → 触发激活事件 → `activate(context)` → 管理 `subscriptions` → `deactivate()`。

## 示例扩展

### Hello World 扩展
演示基本的命令注册和事件处理。

### Logger 扩展
演示扩展的并行执行能力。

## API 实现

目前实现的最小化 VS Code API 包括：

### window
- `showInformationMessage`: 显示信息消息

### commands
- `registerCommand`: 注册命令
- `executeCommand`: 执行命令

### workspace
- `getConfiguration`: 获取配置

### events
- EventEmitter: 事件系统

## 安全设计

- 模块访问控制：实现模块白名单机制
- 工作目录限制：将子进程工作目录限制在扩展目录内
- 进程隔离：每个扩展在独立进程中运行

## 扩展开发

要创建自己的扩展：

1. 在 `extensions/` 目录下创建新的扩展文件夹
2. 创建 `package.json` 文件定义扩展元数据
3. 创建扩展主文件（默认为 `extension.js`）
4. 实现 `activate` 和可选的 `deactivate` 函数
5. 使用 `vscode` API（当前实现的最小化版本）

示例 `package.json`：
```json
{
  "name": "my-extension",
  "main": "extension.js",
  "activationEvents": ["*"]
}
```

示例 `extension.js`：
```javascript
const vscode = require('vscode');

function activate(context) {
  // 扩展激活逻辑
  vscode.window.showInformationMessage('My extension is activated!');
}

function deactivate() {
  // 扩展停用逻辑
}

module.exports = { activate, deactivate };
```

## 可扩展功能

1. **ActivationEvents 完整支持**：`onLanguage:*`、`workspaceContains`、`onFileSystem:*` 等
2. **命令路由表**：支持一个命令由多个扩展声明时的优先级/冲突策略
3. **超时与资源限额**：对子进程设定启动/命令执行超时
4. **ESM Loader 白名单**：支持 ESM 扩展
5. **调试/热重载**：侦听扩展文件变化，热重启对应子进程
6. **API 覆盖面**：逐步补全 `vscode` API

## 项目文档

- [项目规划](project-plan.md)：项目结构和实现步骤
- [技术设计](technical-design.md)：详细技术设计说明
- [实现计划](implementation-plan.md)：具体实现计划
- [架构图](architecture-diagram.md)：系统架构图示
- [总结报告](summary-report.md)：项目总结报告

## 许可证

本项目基于 MIT 许可证发布。