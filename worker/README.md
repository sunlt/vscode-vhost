# VSCode Shim 模块化实现

这个目录包含了对原始 `vscode-shim.js` 文件的模块化重构。原始的单一文件被拆分为多个功能明确的模块，以提高代码的可维护性和可扩展性。

## 目录结构

```
worker/
├── modules/                    # 模块目录
│   ├── base-types.js          # 基础类型和常量
│   ├── window.js              # vscode.window 模块
│   ├── workspace.js          # vscode.workspace 模块
│   ├── commands.js           # vscode.commands 模块
│   ├── languages.js          # vscode.languages 模块
│   ├── env.js                # vscode.env 模块
│   ├── extensions.js         # vscode.extensions 模块
│   ├── authentication.js     # vscode.authentication 模块
│   ├── webview.js            # vscode.webview 模块
│   ├── extension-context.js  # ExtensionContext 相关
│   ├── config.js             # 配置管理器
│   └── roocode-config.js     # RooCode配置模块
├── vscode-api.js             # 新的主入口文件
├── vscode-shim.js            # 原始文件（保留作为备份）
├── __tests__/                # Jest测试目录
│   ├── base-types.test.js    # 基础类型测试
│   ├── window.test.js        # window模块测试
│   ├── workspace.test.js    # workspace模块测试
│   ├── commands.test.js     # commands模块测试
│   ├── languages.test.js    # languages模块测试
│   ├── config.test.js       # config模块测试
│   ├── roocode-config.test.js # roocode-config模块测试
│   ├── vscode-api.test.js   # vscode-api集成测试
│   └── test-utils.js        # 测试工具和辅助函数
├── test-api.js              # 原始API测试文件
└── test-vscode-shim.js      # 原始shim测试文件
```

## 模块说明

### base-types.js
包含所有基础类型和常量，如：
- VSCodeEventEmitter
- Uri, Position, Range, Selection
- ThemeIcon, CodeAction
- FileType, DiagnosticSeverity, OverviewRulerLane
- Disposable, CancellationToken, CancellationTokenSource
- 各种枚举类型

### window.js
包含 vscode.window 模块的所有功能，如：
- TextEditor, TextDocument 类
- Tab, TabGroup, TabGroups 类
- window 对象及其所有方法
- ViewColumn 常量

### workspace.js
包含 vscode.workspace 模块的所有功能，如：
- WorkspaceEdit 类
- TextDocumentContentProvider 类
- ConfigurationChangeEvent, WorkspaceFoldersChangeEvent 类
- WorkspaceConfiguration 类
- workspace 对象及其所有方法

### commands.js
包含 vscode.commands 模块的所有功能，如：
- CommandManager 类
- commands 对象及其所有方法
- 内置命令实现

### languages.js
包含 vscode.languages 模块的所有功能，如：
- 语言功能相关类型：Diagnostic, CompletionItem 等
- 语言功能提供者接口：CodeActionProvider, CompletionItemProvider 等
- LanguageFeatureManager 类
- languages 对象及其所有方法

### env.js
包含 vscode.env 模块的所有功能，如：
- env 对象及其所有方法

### extensions.js
包含 vscode.extensions 模块的所有功能，如：
- Extension 类
- extensions 对象及其所有方法

### authentication.js
包含 vscode.authentication 模块的所有功能，如：
- AuthenticationSession, AuthenticationProvider 类
- authentication 对象及其所有方法

### webview.js
包含 vscode.webview 模块的所有功能，如：
- WebviewPanel, WebviewOptions, WebviewPanelOptions 类
- Webview, WebviewPanelImpl, WebviewView 类
- webview 对象及其所有方法

### extension-context.js
包含 ExtensionContext 相关的功能，如：
- Memento 类
- ExtensionContext 类
- ExtensionActivator 类

### config.js
包含全局配置管理模块，用于管理工作目录、日志函数、命令注册函数等配置项，以及RooCode配置的管理。

### roocode-config.js
包含 RooCode 配置模块，实现了 RooCodeSettings 类型定义和配置参数管理，支持配置的验证、合并和默认值处理。

### vscode-api.js
新的主入口文件，导入所有模块并组装成完整的VSCode API。

## 使用方法

### 替换原始文件

要使用新的模块化实现，只需将原来引用 `vscode-shim.js` 的代码改为引用 `vscode-api.js`：

```javascript
// 原来的代码
const vscode = require('./vscode-shim');

// 新的代码
const createVscodeApi = require('./vscode-api');
const vscode = createVscodeApi({ log, registerCommand });
```

### 指定工作目录

新的实现支持在启动时指定工作目录，这对于需要在特定目录下运行扩展的场景非常有用：

```javascript
const createVscodeApi = require('./vscode-api');

// 指定工作目录
const vscode = createVscodeApi({
  log: (level, ...args) => {
    console.log(`[${level}]`, ...args);
  },
  registerCommand: (id, handler) => {
    console.log(`[Command Registered] ${id}`);
  },
  workspaceRoot: '/path/to/workspace' // 指定工作目录
});

// 现在所有文件操作都将基于指定的工作目录
const workspaceFolder = vscode.workspace.workspaceFolders[0];
console.log(workspaceFolder.uri.fsPath); // 输出: /path/to/workspace

// 相对路径将基于工作目录解析
const fileUri = vscode.Uri.file('src/index.js');
console.log(fileUri.fsPath); // 输出: /path/to/workspace/src/index.js
```

如果未指定工作目录，将使用 `process.cwd()` 作为默认值，确保向后兼容性。

### 直接使用模块

如果只需要特定模块的功能，可以直接导入相应的模块：

```javascript
// 只需要 window 模块
const { window } = require('./modules/window');

// 只需要 workspace 模块
const { workspace } = require('./modules/workspace');

// 只需要 commands 模块
const { commands } = require('./modules/commands');
```

## 向后兼容性

新的模块化实现完全向后兼容原始的 `vscode-shim.js` 文件。所有原有的API接口都保持不变，因此可以无缝替换。

## 优势

1. **模块化**：代码按功能拆分为多个模块，每个模块职责明确。
2. **可维护性**：模块化结构使代码更易于理解和维护。
3. **可扩展性**：可以轻松添加新功能或修改现有功能，而不影响其他模块。
4. **可重用性**：可以单独使用特定模块，而不需要导入整个API。
5. **清晰的依赖关系**：模块间的依赖关系明确，避免循环依赖。

## 注意事项

1. 所有模块都包含详细的JSDoc注释，可以通过IDE查看API文档。
2. 模块间的依赖关系已经正确处理，不会出现循环依赖。
3. 新的实现与原始实现功能完全一致，可以放心替换。

## 测试

项目使用Jest作为测试框架，为每个模块提供了全面的测试覆盖。

### 运行测试

在项目根目录下，可以使用以下命令运行测试：

```bash
# 运行所有测试
npm test

# 或使用
npm run test

# 以监视模式运行测试（文件变化时自动重新运行）
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 以详细模式运行测试
npm run test:verbose
```

### 测试结构

测试文件位于 `worker/__tests__/` 目录下，每个模块都有对应的测试文件：

- `base-types.test.js` - 基础类型和常量测试
- `window.test.js` - window模块测试
- `workspace.test.js` - workspace模块测试
- `commands.test.js` - commands模块测试
- `languages.test.js` - languages模块测试
- `config.test.js` - config模块测试
- `roocode-config.test.js` - roocode-config模块测试
- `vscode-api.test.js` - vscode-api集成测试
- `test-utils.js` - 测试工具和辅助函数

### 测试覆盖率

测试覆盖率报告可以通过以下命令生成：

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录下，包含以下格式：
- HTML报告：`coverage/lcov-report/index.html`
- LCOV报告：`coverage/lcov.info`
- 文本报告：直接在控制台输出

### 测试工具

`test-utils.js` 提供了以下测试工具和辅助函数：

- `createTempFile(content, filename)` - 创建临时文件
- `cleanupTempFiles()` - 清理临时文件
- `createMockVscodeConfig(customConfig)` - 创建模拟的VSCode API配置
- `mockAsyncOperation(value, delay)` - 模拟异步操作
- `hasProperties(obj, props)` - 验证对象是否包含特定属性
- `wasCalledTimes(fn, times)` - 验证函数是否被调用指定次数
- `wasCalledWith(fn, args)` - 验证函数是否被调用并带有特定参数

### 编写测试

测试使用Jest的标准语法，支持以下特性：

- 描述性测试套件：`describe('测试套件名称', () => { ... })`
- 单个测试用例：`test('测试描述', () => { ... })` 或 `it('测试描述', () => { ... })`
- 设置和清理：`beforeEach()`, `afterEach()`, `beforeAll()`, `afterAll()`
- 断言：`expect(value).toBe(expected)`, `expect(value).toEqual(expected)` 等
- 模拟：`jest.fn()`, `jest.mock()`, `jest.spyOn()` 等

示例测试：

```javascript
const { Uri } = require('../modules/base-types');

describe('Uri类测试', () => {
  test('应该能够从文件路径创建URI', () => {
    const uri = Uri.file('/test/path');
    expect(uri.fsPath).toBe('/test/path');
    expect(uri.scheme).toBe('file');
  });

  test('应该能够解析URI字符串', () => {
    const uri = Uri.parse('file:///test/path');
    expect(uri.fsPath).toBe('/test/path');
    expect(uri.scheme).toBe('file');
  });
});
```

### 测试最佳实践

1. **测试命名**：使用描述性的测试名称，清楚地说明测试的目的。
2. **测试组织**：使用 `describe` 块将相关的测试分组。
3. **测试隔离**：每个测试应该独立运行，不依赖于其他测试的状态。
4. **模拟依赖**：使用 `jest.mock()` 模拟外部依赖，确保测试的独立性。
5. **断言明确**：使用明确的断言检查预期结果。
6. **错误处理**：测试应该包括错误情况的处理。
7. **异步测试**：对于异步操作，使用 `async/await` 或返回Promise。

### 调试测试

如果测试失败，可以使用以下方法进行调试：

1. 使用 `--verbose` 标志运行测试，获取更详细的输出：
   ```bash
   npm run test:verbose
   ```

2. 使用 `--testNamePattern` 只运行特定的测试：
   ```bash
   npm test -- --testNamePattern="Uri类测试"
   ```

3. 在测试中添加 `console.log()` 语句输出调试信息。

4. 使用Node.js调试器设置断点进行调试。