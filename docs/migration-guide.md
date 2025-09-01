# VSCode Shim 模块化迁移指南

本文档提供了从原始 `vscode-shim.js` 迁移到新的模块化实现的详细指南。

## 迁移概述

新的模块化实现将原本的单一文件拆分为多个功能明确的模块，但保持了与原始API的完全兼容性。这意味着您可以无缝替换原始文件，而不需要修改现有代码。

## 快速迁移

### 替换原始文件

最简单的迁移方法是直接替换原始文件：

```javascript
// 原来的代码
const vscode = require('./vscode-shim');

// 新的代码
const createVscodeApi = require('./vscode-api');
const vscode = createVscodeApi({ log, registerCommand });
```

### 运行测试

运行提供的测试文件，确保所有功能正常工作：

```bash
node worker/test-api.js
```

## 详细迁移步骤

### 1. 备份原始文件

在进行任何更改之前，请备份原始的 `vscode-shim.js` 文件：

```bash
cp worker/vscode-shim.js worker/vscode-shim.js.backup
```

### 2. 替换引用

在所有引用 `vscode-shim.js` 的文件中，将引用更改为新的 `vscode-api.js`：

```javascript
// 查找所有这样的代码
const vscode = require('./vscode-shim');

// 替换为
const createVscodeApi = require('./vscode-api');
const vscode = createVscodeApi({
  log: console.log, // 可选：提供日志函数
  registerCommand: (id, handler) => {} // 可选：提供命令注册函数
});
```

### 3. 验证功能

运行您的应用程序或测试套件，确保所有功能正常工作。如果发现任何问题，请参考下面的故障排除部分。

### 4. 可选：使用特定模块

如果您只需要特定模块的功能，可以直接导入这些模块：

```javascript
// 只需要 window 模块
const { window } = require('./modules/window');

// 只需要 workspace 模块
const { workspace } = require('./modules/workspace');

// 只需要 commands 模块
const { commands } = require('./modules/commands');
```

## 故障排除

### 问题：模块未找到

如果遇到 "Cannot find module" 错误，请确保：

1. 所有模块文件都位于正确的目录中
2. 文件名拼写正确
3. 路径引用正确

### 问题：功能不工作

如果某些功能不工作，请检查：

1. 您是否正确传递了 `log` 和 `registerCommand` 参数
2. 您的代码是否使用了新的API格式
3. 运行测试文件以验证模块是否正常工作

### 问题：性能问题

如果遇到性能问题，请考虑：

1. 只导入您需要的模块
2. 避免在循环中重复导入模块
3. 使用缓存机制

## 高级用法

### 自定义日志

您可以通过提供自定义日志函数来控制日志输出：

```javascript
const vscode = createVscodeApi({
  log: (level, ...args) => {
    // 自定义日志处理
    if (level === 'ERROR') {
      console.error(...args);
    } else {
      console.log(...args);
    }
  }
});
```

### 自定义命令注册

您可以通过提供自定义命令注册函数来拦截命令注册：

```javascript
const vscode = createVscodeApi({
  registerCommand: (id, handler) => {
    // 自定义命令注册处理
    console.log(`Command registered: ${id}`);
    // 执行其他操作...
  }
});
```

### 模块单独使用

如果您只需要特定功能，可以单独使用模块：

```javascript
// 只需要Uri和Position
const { Uri, Position } = require('./modules/base-types');

// 只需要窗口功能
const { window } = require('./modules/window');

// 只需要工作空间功能
const { workspace } = require('./modules/workspace');
```

## 迁移后的优势

迁移到新的模块化实现后，您将获得以下优势：

1. **更好的代码组织**：代码按功能拆分为多个模块，更易于理解和维护。
2. **更小的包大小**：只导入您需要的模块，减少包大小。
3. **更好的性能**：模块化结构允许更好的代码分割和懒加载。
4. **更好的可扩展性**：可以轻松添加新功能或修改现有功能。
5. **更好的可测试性**：可以单独测试每个模块，提高代码质量。

## 常见问题

### Q: 新的实现与原始实现完全兼容吗？

A: 是的，新的实现与原始API完全兼容。所有原有的功能都保持不变。

### Q: 我需要修改我的代码吗？

A: 不需要，您只需要更改引用方式。所有API调用都保持不变。

### Q: 新的实现有什么性能影响？

A: 新的实现具有更好的性能，因为它允许模块化和按需加载。

### Q: 我可以同时使用新旧实现吗？

A: 可以，但建议完全迁移到新的实现，以获得更好的维护性和性能。

### Q: 如果我遇到问题，应该去哪里寻求帮助？

A: 您可以查看提供的文档、运行测试文件，或者联系开发团队获取帮助。

## 总结

迁移到新的模块化VSCode Shim实现是一个简单的过程，只需要更改引用方式。新的实现提供了更好的代码组织、更小的包大小、更好的性能和更好的可扩展性，同时保持与原始API的完全兼容性。

如果您在迁移过程中遇到任何问题，请参考本文档的故障排除部分，或者联系开发团队获取帮助。