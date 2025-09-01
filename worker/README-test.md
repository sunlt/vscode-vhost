# VSCode Shim 测试说明

本文档说明如何运行和验证 `worker/vscode-shim.js` 的测试用例。

## 测试概述

测试文件 `worker/test-vscode-shim.js` 包含对 VSCode Shim 实现的全面测试，覆盖以下方面：

### 测试模块

1. **基础类型测试**
   - Uri、Position、Range、Selection 等基础类型的构造函数和属性
   - ThemeIcon、CodeAction、Diagnostic、CompletionItem 等类型的功能
   - TextEdit、MarkdownString、Disposable 等工具类的功能

2. **vscode.window 模块测试**
   - 文本编辑器相关功能
   - 消息显示功能
   - 输出通道、状态栏、快速选择等 UI 元素
   - Webview 面板和视图
   - 事件监听器

3. **vscode.workspace 模块测试**
   - 工作空间文件夹管理
   - 配置管理
   - 文本文档操作
   - 文件系统监视器
   - 工作空间编辑
   - 文件系统操作

4. **vscode.commands 模块测试**
   - 命令注册和执行
   - 文本编辑器命令
   - 内置命令
   - 命令历史记录

5. **vscode.languages 模块测试**
   - 诊断集合
   - 代码操作提供者
   - 补全项提供者
   - 悬停信息提供者
   - 定义提供者
   - 文档格式化提供者
   - 代码镜头提供者

6. **vscode.env 模块测试**
   - 环境属性
   - 剪贴板操作
   - 外部 URI 处理
   - 外部应用程序打开

7. **ExtensionContext 功能测试**
   - 扩展上下文属性
   - 状态存储
   - URI 属性
   - 环境变量集合
   - 秘密存储
   - 订阅和资源管理

8. **错误处理测试**
   - 命令注册错误处理
   - 语言功能注册错误处理
   - 工作空间编辑错误处理
   - 文件系统操作错误处理

9. **事件系统测试**
   - EventEmitter 基本功能
   - 多个事件监听器
   - window 事件
   - workspace 事件
   - 命令执行历史事件

10. **资源管理测试**
    - Disposable 资源管理
    - 命令注册资源管理
    - 语言功能注册资源管理
    - ExtensionContext 订阅资源管理
    - 事件监听器资源管理

## 运行测试

### 前提条件

确保已安装 Node.js（推荐版本 12 或更高）。

### 运行方式

#### 方式一：直接运行测试文件

```bash
cd worker
node test-vscode-shim.js
```

#### 方式二：使用 npm 脚本

如果项目有 package.json，可以添加测试脚本：

```json
{
  "scripts": {
    "test:shim": "cd worker && node test-vscode-shim.js"
  }
}
```

然后运行：

```bash
npm run test:shim
```

#### 方式三：集成到现有测试框架

测试文件也导出了 TestRunner 类和 runTests 函数，可以集成到现有的测试框架中：

```javascript
const { TestRunner, runTests } = require('./worker/test-vscode-shim.js');

// 创建自定义测试运行器
const testRunner = new TestRunner();

// 添加自定义测试
testRunner.describe('自定义测试', () => {
  testRunner.addTest('自定义测试用例', () => {
    // 测试代码
  });
});

// 运行测试
runTests();
```

## 测试结果

测试运行器会输出详细的测试结果，包括：

- 测试套件名称
- 每个测试用例的执行状态（通过/失败）
- 通过和失败的测试数量
- 失败测试的详细错误信息和堆栈跟踪

示例输出：

```
开始运行 VSCode Shim 测试...

=== 测试套件: 基础类型测试 ===
  测试: Uri 构造函数和属性
    ✓ 通过
  测试: Uri.file 静态方法
    ✓ 通过
  ...

=== 测试套件: vscode.window 模块测试 ===
  测试: window.activeTextEditor 和 visibleTextEditors
    ✓ 通过
  ...

=== 测试结果 ===
通过: 85
失败: 0
总计: 85
```

如果测试失败，会显示详细的错误信息：

```
=== 测试结果 ===
通过: 84
失败: 1
总计: 85

=== 错误详情 ===

[vscode.window 模块测试] window.showInformationMessage:
  错误: 期望返回第一个按钮
  堆栈: Error: 期望返回第一个按钮
      at TestRunner.assert (worker/test-vscode-shim.js:85:15)
      at ...
```

## 测试覆盖率

测试用例覆盖了 `vscode-shim.js` 中的所有主要功能和 API，包括：

- 所有公共方法和属性
- 参数类型检查
- 返回值验证
- 错误处理
- 资源管理
- 事件系统

## 故障排除

### 常见问题

1. **模块未找到错误**
   ```
   Error: Cannot find module './vscode-shim.js'
   ```
   确保在 `worker` 目录中运行测试，或使用正确的相对路径。

2. **权限错误**
   ```
   Error: EACCES: permission denied
   ```
   确保对测试目录有读写权限。

3. **临时文件清理失败**
   测试运行后会自动清理临时文件。如果清理失败，可以手动删除 `worker/temp` 目录。

### 调试测试

如果需要调试测试，可以：

1. 在测试代码中添加 `console.log` 语句
2. 使用 Node.js 调试器：
   ```bash
   node inspect test-vscode-shim.js
   ```
3. 使用 VS Code 的调试功能，配置 launch.json：
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug VSCode Shim Tests",
     "program": "${workspaceFolder}/worker/test-vscode-shim.js",
     "cwd": "${workspaceFolder}/worker"
   }
   ```

## 贡献指南

### 添加新测试

1. 在相应的测试套件中添加测试用例：
   ```javascript
   testRunner.describe('测试套件名称', () => {
     testRunner.addTest('测试用例名称', () => {
       // 测试代码
       testRunner.assert(condition, '失败消息');
     });
   });
   ```

2. 使用断言方法验证结果：
   - `testRunner.assert(condition, message)` - 基本断言
   - `testRunner.assertDeepEqual(actual, expected, message)` - 深度比较断言
   - `testRunner.assertThrows(asyncFunction, expectedError, message)` - 异常断言

3. 运行测试确保新测试通过

### 修复失败的测试

1. 查看测试输出中的错误详情
2. 确定是测试代码问题还是 `vscode-shim.js` 实现问题
3. 修复相应代码
4. 重新运行测试验证修复

## 扩展测试

测试框架设计为可扩展的，可以轻松添加新的测试套件和测试用例。如果需要测试额外的功能或场景，可以参考现有测试的结构进行扩展。

## 许可证

测试文件与主项目使用相同的许可证。