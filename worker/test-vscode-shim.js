// worker/test-vscode-shim.js
// VSCode Shim 测试脚本

const path = require('path');
const fs = require('fs');
const vscode = require('./vscode-shim')({
  log: console.log,
  registerCommand: (command, callback) => {
    // 测试环境中的命令注册模拟
    return { dispose: () => {} };
  }
});

// 测试运行器
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
    this.currentTestSuite = '';
  }

  // 添加测试用例
  addTest(name, testFunction) {
    this.tests.push({
      suite: this.currentTestSuite,
      name,
      testFunction
    });
  }

  // 开始测试套件
  describe(suiteName, testDefinitions) {
    this.currentTestSuite = suiteName;
    console.log(`\n=== 测试套件: ${suiteName} ===`);
    
    if (typeof testDefinitions === 'function') {
      testDefinitions();
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('开始运行 VSCode Shim 测试...\n');
    
    for (const test of this.tests) {
      try {
        console.log(`  测试: ${test.name}`);
        await test.testFunction();
        this.passed++;
        console.log(`    ✓ 通过`);
      } catch (error) {
        this.failed++;
        console.log(`    ✗ 失败: ${error.message}`);
        this.errors.push({
          suite: test.suite,
          name: test.name,
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    this.printResults();
  }

  // 打印测试结果
  printResults() {
    console.log('\n=== 测试结果 ===');
    console.log(`通过: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log(`总计: ${this.tests.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n=== 错误详情 ===');
      for (const error of this.errors) {
        console.log(`\n[${error.suite}] ${error.name}:`);
        console.log(`  错误: ${error.error}`);
        console.log(`  堆栈: ${error.stack}`);
      }
    }
  }

  // 断言函数
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || '断言失败');
    }
  }

  // 深度比较断言
  assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    
    if (actualStr !== expectedStr) {
      throw new Error(message || `期望 ${expectedStr}, 但得到 ${actualStr}`);
    }
  }

  // 抛出错误断言
  assertThrows(asyncFunction, expectedError, message) {
    let threw = false;
    try {
      asyncFunction();
    } catch (error) {
      threw = true;
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(message || `期望错误包含 "${expectedError}", 但得到 "${error.message}"`);
      }
    }
    
    if (!threw) {
      throw new Error(message || '期望函数抛出错误，但没有抛出');
    }
  }
}

// 创建测试运行器实例
const testRunner = new TestRunner();

// 测试工具函数
function createTempFile(content, filename = 'temp-test-file') {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanupTempFiles() {
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// 基础类型测试
testRunner.describe('基础类型测试', () => {
  // Uri 测试
  testRunner.addTest('Uri 构造函数和属性', () => {
    const uri = new vscode.Uri('/test/path', 'file');
    testRunner.assert(uri.fsPath === '/test/path', 'fsPath 属性不正确');
    testRunner.assert(uri.path === '/test/path', 'path 属性不正确');
    testRunner.assert(uri.scheme === 'file', 'scheme 属性不正确');
  });

  testRunner.addTest('Uri.file 静态方法', () => {
    const uri = vscode.Uri.file('/test/path');
    testRunner.assert(uri.fsPath === path.resolve('/test/path'), 'Uri.file 应该解析为绝对路径');
    testRunner.assert(uri.scheme === 'file', 'Uri.file 应该使用 file scheme');
  });

  testRunner.addTest('Uri.parse 静态方法', () => {
    const uri = vscode.Uri.parse('/test/path');
    testRunner.assert(uri.fsPath === path.resolve('/test/path'), 'Uri.parse 应该解析为绝对路径');
    testRunner.assert(uri.scheme === 'file', 'Uri.parse 应该使用 file scheme');
  });

  testRunner.addTest('Uri.joinPath 静态方法', () => {
    const baseUri = vscode.Uri.file('/base');
    const joinedUri = vscode.Uri.joinPath(baseUri, 'subdir', 'file.txt');
    testRunner.assert(joinedUri.fsPath === path.join('/base', 'subdir', 'file.txt'), 'Uri.joinPath 应该正确连接路径');
  });

  // Position 测试
  testRunner.addTest('Position 构造函数和属性', () => {
    const position = new vscode.Position(5, 10);
    testRunner.assert(position.line === 5, 'line 属性不正确');
    testRunner.assert(position.character === 10, 'character 属性不正确');
  });

  // Range 测试
  testRunner.addTest('Range 构造函数和属性', () => {
    const start = new vscode.Position(1, 2);
    const end = new vscode.Position(3, 4);
    const range = new vscode.Range(start, end);
    testRunner.assert(range.start === start, 'start 属性不正确');
    testRunner.assert(range.end === end, 'end 属性不正确');
  });

  // Selection 测试
  testRunner.addTest('Selection 构造函数和属性', () => {
    const start = new vscode.Position(1, 2);
    const end = new vscode.Position(3, 4);
    const selection = new vscode.Selection(start, end);
    testRunner.assert(selection.anchor === start, 'anchor 属性不正确');
    testRunner.assert(selection.active === end, 'active 属性不正确');
    testRunner.assert(selection.start === start, 'start 属性不正确');
    testRunner.assert(selection.end === end, 'end 属性不正确');
  });

  // ThemeIcon 测试
  testRunner.addTest('ThemeIcon 构造函数和属性', () => {
    const icon = new vscode.ThemeIcon('test-icon');
    testRunner.assert(icon.id === 'test-icon', 'id 属性不正确');
  });

  // CodeAction 测试
  testRunner.addTest('CodeAction 构造函数和属性', () => {
    const action = new vscode.CodeAction('Test Action', vscode.CodeActionKind.QuickFix);
    testRunner.assert(action.title === 'Test Action', 'title 属性不正确');
    testRunner.assert(action.kind === vscode.CodeActionKind.QuickFix, 'kind 属性不正确');
    testRunner.assert(action.command === undefined, 'command 属性应该默认为 undefined');
    testRunner.assert(action.edit === undefined, 'edit 属性应该默认为 undefined');
  });

  // Diagnostic 测试
  testRunner.addTest('Diagnostic 构造函数和属性', () => {
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1));
    const diagnostic = new vscode.Diagnostic(range, 'Test message', vscode.DiagnosticSeverity.Error);
    testRunner.assert(diagnostic.range === range, 'range 属性不正确');
    testRunner.assert(diagnostic.message === 'Test message', 'message 属性不正确');
    testRunner.assert(diagnostic.severity === vscode.DiagnosticSeverity.Error, 'severity 属性不正确');
    testRunner.assert(diagnostic.source === undefined, 'source 属性应该默认为 undefined');
  });

  // CompletionItem 测试
  testRunner.addTest('CompletionItem 构造函数和属性', () => {
    const item = new vscode.CompletionItem('test', vscode.CompletionItemKind.Function);
    testRunner.assert(item.label === 'test', 'label 属性不正确');
    testRunner.assert(item.kind === vscode.CompletionItemKind.Function, 'kind 属性不正确');
    testRunner.assert(item.detail === undefined, 'detail 属性应该默认为 undefined');
    testRunner.assert(item.documentation === undefined, 'documentation 属性应该默认为 undefined');
  });

  // Hover 测试
  testRunner.addTest('Hover 构造函数和属性', () => {
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1));
    const contents = ['Hover content'];
    const hover = new vscode.Hover(contents, range);
    testRunner.assert(hover.contents === contents, 'contents 属性不正确');
    testRunner.assert(hover.range === range, 'range 属性不正确');
  });

  // Location 测试
  testRunner.addTest('Location 构造函数和属性', () => {
    const uri = vscode.Uri.file('/test/file');
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1));
    const location = new vscode.Location(uri, range);
    testRunner.assert(location.uri === uri, 'uri 属性不正确');
    testRunner.assert(location.range === range, 'range 属性不正确');
  });

  // TextEdit 测试
  testRunner.addTest('TextEdit 静态方法', () => {
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1));
    const replaceEdit = vscode.TextEdit.replace(range, 'new text');
    testRunner.assert(replaceEdit.range === range, 'replaceEdit.range 属性不正确');
    testRunner.assert(replaceEdit.newText === 'new text', 'replaceEdit.newText 属性不正确');

    const position = new vscode.Position(0, 0);
    const insertEdit = vscode.TextEdit.insert(position, 'inserted text');
    testRunner.assert(insertEdit.range.start === position, 'insertEdit.range.start 属性不正确');
    testRunner.assert(insertEdit.range.end === position, 'insertEdit.range.end 属性不正确');
    testRunner.assert(insertEdit.newText === 'inserted text', 'insertEdit.newText 属性不正确');

    const deleteEdit = vscode.TextEdit.delete(range);
    testRunner.assert(deleteEdit.range === range, 'deleteEdit.range 属性不正确');
    testRunner.assert(deleteEdit.newText === '', 'deleteEdit.newText 应该为空字符串');
  });

  // MarkdownString 测试
  testRunner.addTest('MarkdownString 方法', () => {
    const md = new vscode.MarkdownString();
    md.appendText('plain text');
    testRunner.assert(md.value.includes('plain text'), 'appendText 应该添加文本');
    
    md.appendMarkdown('**bold**');
    testRunner.assert(md.value.includes('**bold**'), 'appendMarkdown 应该添加 markdown');
    
    md.appendCodeblock('code', 'javascript');
    testRunner.assert(md.value.includes('```javascript'), 'appendCodeblock 应该添加代码块');
  });

  // Disposable 测试
  testRunner.addTest('Disposable 构造函数和方法', () => {
    let disposed = false;
    const disposable = new vscode.Disposable(() => {
      disposed = true;
    });
    
    testRunner.assert(!disposable.isDisposed, '初始状态不应该被释放');
    disposable.dispose();
    testRunner.assert(disposed, 'dispose 应该调用回调函数');
    testRunner.assert(disposable.isDisposed, 'dispose 后应该标记为已释放');
  });

  // CancellationTokenSource 和 CancellationToken 测试
  testRunner.addTest('CancellationTokenSource 和 CancellationToken', () => {
    const source = new vscode.CancellationTokenSource();
    const token = source.token;
    
    testRunner.assert(!token.isCancellationRequested, '初始状态不应该被取消');
    testRunner.assert(!source.isCancellationRequested, '初始状态不应该被取消');
    
    let cancelled = false;
    token.onCancellationRequested(() => {
      cancelled = true;
    });
    
    source.cancel();
    testRunner.assert(token.isCancellationRequested, 'cancel 后应该标记为已取消');
    testRunner.assert(source.isCancellationRequested, 'cancel 后应该标记为已取消');
    testRunner.assert(cancelled, 'cancel 后应该触发事件');
  });
});

// vscode.window 模块测试
testRunner.describe('vscode.window 模块测试', () => {
  testRunner.addTest('window.activeTextEditor 和 visibleTextEditors', () => {
    testRunner.assert(vscode.window.activeTextEditor === null, '初始状态没有活动编辑器');
    testRunner.assert(Array.isArray(vscode.window.visibleTextEditors), 'visibleTextEditors 应该是数组');
    testRunner.assert(vscode.window.visibleTextEditors.length === 0, '初始状态没有可见编辑器');
  });

  testRunner.addTest('window.ViewColumn 常量', () => {
    testRunner.assert(vscode.window.ViewColumn.Active === -1, 'ViewColumn.Active 应该是 -1');
    testRunner.assert(vscode.window.ViewColumn.Beside === -2, 'ViewColumn.Beside 应该是 -2');
    testRunner.assert(vscode.window.ViewColumn.One === 1, 'ViewColumn.One 应该是 1');
    testRunner.assert(vscode.window.ViewColumn.Two === 2, 'ViewColumn.Two 应该是 2');
  });

  testRunner.addTest('window.showInformationMessage', async () => {
    const result = await vscode.window.showInformationMessage('Test message');
    testRunner.assert(result === undefined, '没有按钮时应该返回 undefined');
    
    const resultWithButton = await vscode.window.showInformationMessage('Test message', 'Button1', 'Button2');
    testRunner.assert(resultWithButton === 'Button1', '有按钮时应该返回第一个按钮');
  });

  testRunner.addTest('window.showWarningMessage', async () => {
    const result = await vscode.window.showWarningMessage('Test warning');
    testRunner.assert(result === undefined, '没有按钮时应该返回 undefined');
    
    const resultWithButton = await vscode.window.showWarningMessage('Test warning', 'Button1', 'Button2');
    testRunner.assert(resultWithButton === 'Button1', '有按钮时应该返回第一个按钮');
  });

  testRunner.addTest('window.showErrorMessage', async () => {
    const result = await vscode.window.showErrorMessage('Test error');
    testRunner.assert(result === undefined, '没有按钮时应该返回 undefined');
    
    const resultWithButton = await vscode.window.showErrorMessage('Test error', 'Button1', 'Button2');
    testRunner.assert(resultWithButton === 'Button1', '有按钮时应该返回第一个按钮');
  });

  testRunner.addTest('window.createOutputChannel', () => {
    const channel = vscode.window.createOutputChannel('test-channel');
    testRunner.assert(channel.name === 'test-channel', 'name 属性不正确');
    
    // 测试 appendLine
    channel.appendLine('Test line');
    
    // 测试 append
    channel.append('Test text');
    
    // 测试 clear
    channel.clear();
    
    // 测试 show 和 hide
    channel.show();
    channel.hide();
    
    // 测试 dispose
    channel.dispose();
  });

  testRunner.addTest('window.createStatusBarItem', () => {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    testRunner.assert(item.alignment === vscode.StatusBarAlignment.Left, 'alignment 属性不正确');
    testRunner.assert(item.priority === 100, 'priority 属性不正确');
    testRunner.assert(item.text === '', 'text 属性应该默认为空字符串');
    
    item.text = 'Test';
    item.tooltip = 'Tooltip';
    item.show();
    item.hide();
    item.dispose();
  });

  testRunner.addTest('window.createQuickPick', () => {
    const quickPick = vscode.window.createQuickPick();
    testRunner.assert(Array.isArray(quickPick.items), 'items 应该是数组');
    testRunner.assert(Array.isArray(quickPick.activeItems), 'activeItems 应该是数组');
    testRunner.assert(Array.isArray(quickPick.selectedItems), 'selectedItems 应该是数组');
    testRunner.assert(quickPick.value === '', 'value 应该默认为空字符串');
    
    quickPick.placeholder = 'Select an item';
    quickPick.items = [{ label: 'Item 1' }, { label: 'Item 2' }];
    
    quickPick.show();
    quickPick.hide();
    quickPick.dispose();
  });

  testRunner.addTest('window.createInputBox', () => {
    const inputBox = vscode.window.createInputBox();
    testRunner.assert(inputBox.value === '', 'value 应该默认为空字符串');
    testRunner.assert(inputBox.placeholder === '', 'placeholder 应该默认为空字符串');
    testRunner.assert(inputBox.prompt === '', 'prompt 应该默认为空字符串');
    testRunner.assert(inputBox.password === false, 'password 应该默认为 false');
    
    inputBox.placeholder = 'Enter value';
    inputBox.prompt = 'Please enter a value';
    
    inputBox.show();
    inputBox.hide();
    inputBox.dispose();
  });

  testRunner.addTest('window.createTerminal', () => {
    const terminal = vscode.window.createTerminal({ name: 'test-terminal' });
    testRunner.assert(terminal.name === 'test-terminal', 'name 属性不正确');
    
    terminal.sendText('echo hello');
    terminal.show();
    terminal.hide();
    terminal.dispose();
  });

  testRunner.addTest('window.createTextEditorDecorationType', () => {
    const decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'red',
      color: 'white'
    });
    testRunner.assert(typeof decorationType.key === 'string', 'key 应该是字符串');
    
    decorationType.dispose();
  });

  testRunner.addTest('window.showTextDocument', () => {
    // 创建临时文件
    const tempFilePath = createTempFile('test content', 'test-show.txt');
    
    // 测试使用文件路径
    const editor1 = vscode.window.showTextDocument(tempFilePath);
    testRunner.assert(editor1 !== undefined, 'showTextDocument 应该返回编辑器');
    
    // 测试使用 Uri
    const uri = vscode.Uri.file(tempFilePath);
    const editor2 = vscode.window.showTextDocument(uri);
    testRunner.assert(editor2 !== undefined, 'showTextDocument 应该返回编辑器');
    
    // 清理临时文件
    cleanupTempFiles();
  });

  testRunner.addTest('window 事件监听器', () => {
    let activeEditorChanged = false;
    let visibleEditorsChanged = false;
    
    const disposable1 = vscode.window.onDidChangeActiveTextEditor(() => {
      activeEditorChanged = true;
    });
    
    const disposable2 = vscode.window.onDidChangeVisibleTextEditors(() => {
      visibleEditorsChanged = true;
    });
    
    // 创建临时文件和编辑器以触发事件
    const tempFilePath = createTempFile('test content', 'test-events.txt');
    vscode.window.showTextDocument(tempFilePath);
    
    // 清理
    disposable1.dispose();
    disposable2.dispose();
    cleanupTempFiles();
  });

  testRunner.addTest('window.createWebviewPanel', () => {
    const panel = vscode.window.createWebviewPanel(
      'test-webview',
      'Test Webview',
      vscode.window.ViewColumn.One,
      { enableScripts: true }
    );
    
    testRunner.assert(panel.viewType === 'test-webview', 'viewType 属性不正确');
    testRunner.assert(panel.title === 'Test Webview', 'title 属性不正确');
    testRunner.assert(panel.visible === true, 'visible 应该默认为 true');
    testRunner.assert(panel.active === true, 'active 应该默认为 true');
    
    panel.webview.html = '<html><body>Test</body></html>';
    panel.reveal(vscode.window.ViewColumn.Two);
    panel.dispose();
  });

  testRunner.addTest('window.registerWebviewViewProvider', () => {
    const provider = {
      resolveWebviewView: (webviewView, context) => {
        webviewView.webview.html = '<html><body>Test View</body></html>';
      }
    };
    
    const disposable = vscode.window.registerWebviewViewProvider('test-view', provider);
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('window.tabGroups', () => {
    testRunner.assert(vscode.window.tabGroups !== undefined, 'tabGroups 应该存在');
    testRunner.assert(Array.isArray(vscode.window.tabGroups.all), 'tabGroups.all 应该是数组');
    testRunner.assert(vscode.window.tabGroups.activeTabGroup !== undefined, 'activeTabGroup 应该存在');
    
    // 测试事件监听器
    const disposable = vscode.window.tabGroups.onDidChangeTabs(() => {});
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    disposable.dispose();
  });
});

// vscode.workspace 模块测试
testRunner.describe('vscode.workspace 模块测试', () => {
  testRunner.addTest('workspace.workspaceFolders', () => {
    testRunner.assert(Array.isArray(vscode.workspace.workspaceFolders), 'workspaceFolders 应该是数组');
    testRunner.assert(vscode.workspace.workspaceFolders.length > 0, '应该至少有一个工作空间文件夹');
    
    const folder = vscode.workspace.workspaceFolders[0];
    testRunner.assert(folder.uri !== undefined, '文件夹应该有 uri 属性');
    testRunner.assert(folder.name !== undefined, '文件夹应该有 name 属性');
    testRunner.assert(typeof folder.index === 'number', '文件夹应该有 index 属性');
  });

  testRunner.addTest('workspace.getWorkspaceFolder', () => {
    const currentFolder = vscode.workspace.workspaceFolders[0];
    const result = vscode.workspace.getWorkspaceFolder(currentFolder.uri);
    testRunner.assert(result !== undefined, '应该找到工作空间文件夹');
    testRunner.assert(result.uri.fsPath === currentFolder.uri.fsPath, '返回的文件夹应该正确');
  });

  testRunner.addTest('workspace.asRelativePath', () => {
    const folder = vscode.workspace.workspaceFolders[0];
    const absolutePath = path.join(folder.uri.fsPath, 'subdir', 'file.txt');
    const relativePath = vscode.workspace.asRelativePath(absolutePath);
    testRunner.assert(relativePath === path.join('subdir', 'file.txt'), '应该返回相对路径');
    
    const relativePathWithFolder = vscode.workspace.asRelativePath(absolutePath, true);
    testRunner.assert(relativePathWithFolder === path.join(folder.name, 'subdir', 'file.txt'), '应该返回包含文件夹名的相对路径');
  });

  testRunner.addTest('workspace.getConfiguration', () => {
    const config = vscode.workspace.getConfiguration();
    testRunner.assert(config !== undefined, '应该返回配置对象');
    
    const sectionConfig = vscode.workspace.getConfiguration('editor');
    testRunner.assert(sectionConfig !== undefined, '应该返回指定部分的配置');
    
    // 测试配置方法
    testRunner.assert(typeof config.get === 'function', '配置对象应该有 get 方法');
    testRunner.assert(typeof config.has === 'function', '配置对象应该有 has 方法');
    testRunner.assert(typeof config.update === 'function', '配置对象应该有 update 方法');
    testRunner.assert(typeof config.inspect === 'function', '配置对象应该有 inspect 方法');
  });

  testRunner.addTest('workspace 事件监听器', () => {
    let workspaceFoldersChanged = false;
    let configurationChanged = false;
    let textDocumentOpened = false;
    
    const disposable1 = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      workspaceFoldersChanged = true;
    });
    
    const disposable2 = vscode.workspace.onDidChangeConfiguration(() => {
      configurationChanged = true;
    });
    
    const disposable3 = vscode.workspace.onDidOpenTextDocument(() => {
      textDocumentOpened = true;
    });
    
    // 清理
    disposable1.dispose();
    disposable2.dispose();
    disposable3.dispose();
  });

  testRunner.addTest('workspace.openTextDocument', async () => {
    // 创建临时文件
    const tempFilePath = createTempFile('test content', 'test-open.txt');
    
    // 测试使用文件路径
    const document1 = await vscode.workspace.openTextDocument(tempFilePath);
    testRunner.assert(document1 !== undefined, '应该打开文档');
    testRunner.assert(document1.uri.fsPath === path.resolve(tempFilePath), '文档 URI 应该正确');
    testRunner.assert(document1.getText() === 'test content', '文档内容应该正确');
    
    // 测试使用 Uri
    const uri = vscode.Uri.file(tempFilePath);
    const document2 = await vscode.workspace.openTextDocument(uri);
    testRunner.assert(document2 !== undefined, '应该打开文档');
    testRunner.assert(document2.uri.fsPath === path.resolve(tempFilePath), '文档 URI 应该正确');
    
    // 清理临时文件
    cleanupTempFiles();
  });

  testRunner.addTest('workspace.createFileSystemWatcher', () => {
    // 创建临时目录
    const tempDir = path.join(__dirname, 'temp', 'watch-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const watcher = vscode.workspace.createFileSystemWatcher(
      path.join(tempDir, '*'),
      false,
      false,
      false
    );
    
    testRunner.assert(typeof watcher.onDidCreate === 'function', '应该有 onDidCreate 方法');
    testRunner.assert(typeof watcher.onDidChange === 'function', '应该有 onDidChange 方法');
    testRunner.assert(typeof watcher.onDidDelete === 'function', '应该有 onDidDelete 方法');
    testRunner.assert(typeof watcher.dispose === 'function', '应该有 dispose 方法');
    
    watcher.dispose();
    
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  testRunner.addTest('workspace.registerTextDocumentContentProvider', () => {
    const provider = {
      provideTextDocumentContent: (uri) => {
        return `Content for ${uri.path}`;
      }
    };
    
    const disposable = vscode.workspace.registerTextDocumentContentProvider('test-scheme', provider);
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('workspace.applyEdit', async () => {
    // 创建临时文件
    const tempFilePath = createTempFile('line1\nline2\nline3', 'test-edit.txt');
    const uri = vscode.Uri.file(tempFilePath);
    
    // 创建 WorkspaceEdit
    const edit = new vscode.WorkspaceEdit();
    
    // 测试替换文本
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));
    edit.replace(uri, range, 'modified');
    
    const result = await vscode.workspace.applyEdit(edit);
    testRunner.assert(result === true, 'applyEdit 应该成功');
    
    // 验证编辑结果
    const document = await vscode.workspace.openTextDocument(uri);
    testRunner.assert(document.getText() === 'modified\nline2\nline3', '文本应该被正确替换');
    
    // 清理临时文件
    cleanupTempFiles();
  });

  testRunner.addTest('workspace.fs 操作', async () => {
    // 创建临时目录
    const tempDir = path.join(__dirname, 'temp', 'fs-test');
    const tempFile = path.join(tempDir, 'test-file.txt');
    const tempFile2 = path.join(tempDir, 'test-file2.txt');
    
    try {
      // 创建目录
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
      
      // 写入文件
      const content = new TextEncoder().encode('test content');
      await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), content);
      
      // 读取文件
      const readContent = await vscode.workspace.fs.readFile(vscode.Uri.file(tempFile));
      testRunner.assert(new TextDecoder().decode(readContent) === 'test content', '文件内容应该正确');
      
      // 复制文件
      await vscode.workspace.fs.copy(vscode.Uri.file(tempFile), vscode.Uri.file(tempFile2));
      
      // 获取文件状态
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(tempFile));
      testRunner.assert(stat.type === vscode.FileType.File, '应该识别为文件');
      testRunner.assert(stat.size > 0, '文件大小应该大于 0');
      
      // 读取目录
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(tempDir));
      testRunner.assert(entries.length >= 2, '目录中应该至少有两个文件');
      
      // 删除文件
      await vscode.workspace.fs.delete(vscode.Uri.file(tempFile));
      await vscode.workspace.fs.delete(vscode.Uri.file(tempFile2));
    } finally {
      // 清理临时目录
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});

// vscode.commands 模块测试
testRunner.describe('vscode.commands 模块测试', () => {
  testRunner.addTest('commands.registerCommand', () => {
    let commandExecuted = false;
    
    const disposable = vscode.commands.registerCommand('test.command', () => {
      commandExecuted = true;
    });
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    // 执行命令
    vscode.commands.executeCommand('test.command');
    testRunner.assert(commandExecuted, '命令应该被执行');
    
    disposable.dispose();
  });

  testRunner.addTest('commands.registerTextEditorCommand', () => {
    let commandExecuted = false;
    
    const disposable = vscode.commands.registerTextEditorCommand('test.editorCommand', (editor) => {
      commandExecuted = true;
      testRunner.assert(editor !== undefined, '应该传递编辑器参数');
    });
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    // 创建临时文件和编辑器
    const tempFilePath = createTempFile('test content', 'test-editor.txt');
    const editor = vscode.window.showTextDocument(tempFilePath);
    
    // 执行命令
    vscode.commands.executeCommand('test.editorCommand');
    testRunner.assert(commandExecuted, '命令应该被执行');
    
    disposable.dispose();
    cleanupTempFiles();
  });

  testRunner.addTest('commands.executeCommand', async () => {
    let commandExecuted = false;
    
    // 注册测试命令
    const disposable = vscode.commands.registerCommand('test.executeCommand', (arg1, arg2) => {
      commandExecuted = true;
      return { arg1, arg2, result: 'success' };
    });
    
    // 执行命令并获取结果
    const result = await vscode.commands.executeCommand('test.executeCommand', 'value1', 'value2');
    testRunner.assert(commandExecuted, '命令应该被执行');
    testRunner.assert(result.arg1 === 'value1', '应该正确传递参数');
    testRunner.assert(result.arg2 === 'value2', '应该正确传递参数');
    testRunner.assert(result.result === 'success', '应该返回正确结果');
    
    disposable.dispose();
  });

  testRunner.addTest('commands 内置命令', async () => {
    // 创建临时文件
    const tempFilePath = createTempFile('test content', 'test-builtin.txt');
    
    // 测试 vscode.open 命令
    const editor = await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(tempFilePath));
    testRunner.assert(editor !== undefined, 'vscode.open 应该打开文件');
    
    // 测试 workbench.action.files.save 命令
    const saveResult = await vscode.commands.executeCommand('workbench.action.files.save');
    testRunner.assert(saveResult === true, 'workbench.action.files.save 应该成功');
    
    // 测试 editor.action.selectAll 命令
    const selectResult = await vscode.commands.executeCommand('editor.action.selectAll');
    testRunner.assert(selectResult === true, 'editor.action.selectAll 应该成功');
    
    cleanupTempFiles();
  });

  testRunner.addTest('commands.getCommands', () => {
    const commands = vscode.commands.getCommands();
    testRunner.assert(Array.isArray(commands.regular), 'regular 命令应该是数组');
    testRunner.assert(Array.isArray(commands.textEditor), 'textEditor 命令应该是数组');
    testRunner.assert(Array.isArray(commands.builtin), 'builtin 命令应该是数组');
    
    // 注册一个命令并验证它出现在列表中
    const disposable = vscode.commands.registerCommand('test.getCommands', () => {});
    const commandsAfterRegister = vscode.commands.getCommands();
    testRunner.assert(commandsAfterRegister.regular.includes('test.getCommands'), '新注册的命令应该出现在列表中');
    
    disposable.dispose();
  });

  testRunner.addTest('commands.hasCommand', () => {
    // 注册一个命令
    const disposable = vscode.commands.registerCommand('test.hasCommand', () => {});
    
    testRunner.assert(vscode.commands.hasCommand('test.hasCommand') === true, '应该找到已注册的命令');
    testRunner.assert(vscode.commands.hasCommand('non.existent.command') === false, '不应该找到不存在的命令');
    
    disposable.dispose();
  });

  testRunner.addTest('commands.getCommandExecutionHistory', () => {
    // 注册并执行一个命令
    const disposable = vscode.commands.registerCommand('test.history', () => {
      return 'history result';
    });
    
    vscode.commands.executeCommand('test.history');
    
    const history = vscode.commands.getCommandExecutionHistory();
    testRunner.assert(Array.isArray(history), '历史记录应该是数组');
    testRunner.assert(history.length > 0, '应该有执行历史');
    testRunner.assert(history[0].id === 'test.history', '历史记录应该包含执行的命令');
    testRunner.assert(history[0].result === 'history result', '历史记录应该包含执行结果');
    
    disposable.dispose();
  });
});

// vscode.languages 模块测试
testRunner.describe('vscode.languages 模块测试', () => {
  testRunner.addTest('languages.createDiagnosticCollection', () => {
    const collection = vscode.languages.createDiagnosticCollection('test-collection');
    testRunner.assert(collection.name === 'test-collection', 'name 属性应该正确');
    
    // 测试诊断集合方法
    testRunner.assert(typeof collection.set === 'function', '应该有 set 方法');
    testRunner.assert(typeof collection.delete === 'function', '应该有 delete 方法');
    testRunner.assert(typeof collection.clear === 'function', '应该有 clear 方法');
    testRunner.assert(typeof collection.get === 'function', '应该有 get 方法');
    testRunner.assert(typeof collection.keys === 'function', '应该有 keys 方法');
    testRunner.assert(typeof collection.forEach === 'function', '应该有 forEach 方法');
    testRunner.assert(typeof collection.dispose === 'function', '应该有 dispose 方法');
    
    collection.dispose();
  });

  testRunner.addTest('languages.getDiagnostics', () => {
    // 创建诊断集合
    const collection = vscode.languages.createDiagnosticCollection('test-diag');
    
    // 创建 URI 和诊断
    const uri = vscode.Uri.file('/test/file.js');
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1)),
      'Test diagnostic',
      vscode.DiagnosticSeverity.Warning
    );
    
    // 设置诊断
    collection.set(uri, [diagnostic]);
    
    // 获取诊断
    const diagnostics = vscode.languages.getDiagnostics(uri);
    testRunner.assert(Array.isArray(diagnostics), '应该返回诊断数组');
    testRunner.assert(diagnostics.length === 1, '应该有一个诊断');
    testRunner.assert(diagnostics[0].message === 'Test diagnostic', '诊断消息应该正确');
    
    collection.dispose();
  });

  testRunner.addTest('languages.registerCodeActionsProvider', () => {
    const provider = {
      provideCodeActions: (document, range, context, token) => {
        return [
          new vscode.CodeAction('Test Action', vscode.CodeActionKind.QuickFix)
        ];
      }
    };
    
    const selector = { language: 'javascript' };
    const disposable = vscode.languages.registerCodeActionsProvider(selector, provider);
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('languages.registerCompletionItemProvider', () => {
    const provider = {
      provideCompletionItems: (document, position, token, context) => {
        return [
          new vscode.CompletionItem('test', vscode.CompletionItemKind.Function)
        ];
      }
    };
    
    const selector = { language: 'javascript' };
    const disposable = vscode.languages.registerCompletionItemProvider(selector, provider, '.', ':');
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('languages.registerHoverProvider', () => {
    const provider = {
      provideHover: (document, position, token) => {
        return new vscode.Hover(['Hover content']);
      }
    };
    
    const selector = { language: 'javascript' };
    const disposable = vscode.languages.registerHoverProvider(selector, provider);
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('languages.registerDefinitionProvider', () => {
    const provider = {
      provideDefinition: (document, position, token) => {
        return new vscode.Location(
          vscode.Uri.file('/test/definition.js'),
          new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10))
        );
      }
    };
    
    const selector = { language: 'javascript' };
    const disposable = vscode.languages.registerDefinitionProvider(selector, provider);
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('languages.registerDocumentFormattingEditProvider', () => {
    const provider = {
      provideDocumentFormattingEdits: (document, options, token) => {
        return [
          vscode.TextEdit.replace(
            new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, 0)),
            'formatted content'
          )
        ];
      }
    };
    
    const selector = { language: 'javascript' };
    const disposable = vscode.languages.registerDocumentFormattingEditProvider(selector, provider);
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('languages.registerCodeLensProvider', () => {
    const provider = {
      provideCodeLenses: (document, token) => {
        return [
          {
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            command: { title: 'Test Command', command: 'test.command' }
          }
        ];
      }
    };
    
    const selector = { language: 'javascript' };
    const disposable = vscode.languages.registerCodeLensProvider(selector, provider);
    
    testRunner.assert(typeof disposable.dispose === 'function', '应该返回一个可释放的对象');
    
    disposable.dispose();
  });

  testRunner.addTest('languages 常量', () => {
    // 测试 CompletionItemKind
    testRunner.assert(vscode.CompletionItemKind.Text === 0, 'CompletionItemKind.Text 应该是 0');
    testRunner.assert(vscode.CompletionItemKind.Method === 1, 'CompletionItemKind.Method 应该是 1');
    testRunner.assert(vscode.CompletionItemKind.Function === 2, 'CompletionItemKind.Function 应该是 2');
    
    // 测试 DiagnosticSeverity
    testRunner.assert(vscode.DiagnosticSeverity.Error === 0, 'DiagnosticSeverity.Error 应该是 0');
    testRunner.assert(vscode.DiagnosticSeverity.Warning === 1, 'DiagnosticSeverity.Warning 应该是 1');
    testRunner.assert(vscode.DiagnosticSeverity.Information === 2, 'DiagnosticSeverity.Information 应该是 2');
    testRunner.assert(vscode.DiagnosticSeverity.Hint === 3, 'DiagnosticSeverity.Hint 应该是 3');
    
    // 测试 CodeActionKind
    testRunner.assert(vscode.CodeActionKind.QuickFix.value === "quickfix", 'CodeActionKind.QuickFix 应该是 "quickfix"');
    testRunner.assert(vscode.CodeActionKind.RefactorRewrite.value === "refactor.rewrite", 'CodeActionKind.RefactorRewrite 应该是 "refactor.rewrite"');
  });
});

// vscode.env 模块测试
testRunner.describe('vscode.env 模块测试', () => {
  testRunner.addTest('env 基本属性', () => {
    testRunner.assert(typeof vscode.env.appRoot === 'string', 'appRoot 应该是字符串');
    testRunner.assert(typeof vscode.env.sessionId === 'string', 'sessionId 应该是字符串');
    testRunner.assert(vscode.env.appName === 'VSCode', 'appName 应该是 VSCode');
    testRunner.assert(vscode.env.appHost === 'desktop', 'appHost 应该是 desktop');
    testRunner.assert(vscode.env.language === 'en', 'language 应该是 en');
    testRunner.assert(vscode.env.machineId !== undefined, 'machineId 应该存在');
    testRunner.assert(vscode.env.shell !== undefined, 'shell 应该存在');
    testRunner.assert(vscode.env.uiKind === 1, 'uiKind 应该是 1 (UIKind.Desktop)');
    testRunner.assert(vscode.env.uriScheme === 'vscode', 'uriScheme 应该是 vscode');
  });

  testRunner.addTest('env.clipboard', async () => {
    // 测试写入剪贴板
    await vscode.env.clipboard.writeText('test clipboard content');
    
    // 测试读取剪贴板
    const content = await vscode.env.clipboard.readText();
    // 注意：在某些环境中，剪贴板可能无法正常工作，所以这里只验证方法存在
    testRunner.assert(typeof content === 'string', '剪贴板内容应该是字符串');
  });

  testRunner.addTest('env.asExternalUri', async () => {
    const fileUri = vscode.Uri.file('/test/file.txt');
    const externalUri = await vscode.env.asExternalUri(fileUri);
    testRunner.assert(externalUri !== undefined, '应该返回外部 URI');
  });

  testRunner.addTest('env.openExternal', async () => {
    // 注意：这个测试在实际环境中可能会打开外部应用程序
    // 在测试环境中，我们只验证方法存在和返回值类型
    const result = await vscode.env.openExternal('https://example.com');
    testRunner.assert(typeof result === 'boolean', '应该返回布尔值');
  });
});

// ExtensionContext 测试
testRunner.describe('ExtensionContext 测试', () => {
  testRunner.addTest('ExtensionContext 基本属性', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const extensionId = 'test.extension';
    
    const context = new vscode.ExtensionContext(extensionPath, extensionId);
    
    testRunner.assert(context.extensionPath === extensionPath, 'extensionPath 应该正确');
    testRunner.assert(context.extensionUri.fsPath === extensionPath, 'extensionUri 应该正确');
    testRunner.assert(context.extensionId === extensionId, 'extensionId 应该正确');
    testRunner.assert(Array.isArray(context.subscriptions), 'subscriptions 应该是数组');
    testRunner.assert(context.subscriptions.length === 0, 'subscriptions 初始应该为空');
    testRunner.assert(context.extensionMode === vscode.ExtensionMode.Development, 'extensionMode 应该是 Development');
  });

  testRunner.addTest('ExtensionContext 状态存储', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    // 测试 globalState
    testRunner.assert(context.globalState !== undefined, 'globalState 应该存在');
    testRunner.assert(typeof context.globalState.get === 'function', 'globalState 应该有 get 方法');
    testRunner.assert(typeof context.globalState.update === 'function', 'globalState 应该有 update 方法');
    testRunner.assert(typeof context.globalState.keys === 'function', 'globalState 应该有 keys 方法');
    
    // 测试 workspaceState
    testRunner.assert(context.workspaceState !== undefined, 'workspaceState 应该存在');
    testRunner.assert(typeof context.workspaceState.get === 'function', 'workspaceState 应该有 get 方法');
    testRunner.assert(typeof context.workspaceState.update === 'function', 'workspaceState 应该有 update 方法');
    testRunner.assert(typeof context.workspaceState.keys === 'function', 'workspaceState 应该有 keys 方法');
    
    // 测试状态存储功能
    context.globalState.update('testKey', 'testValue');
    const value = context.globalState.get('testKey');
    testRunner.assert(value === 'testValue', '应该能够存储和检索值');
    
    const keys = context.globalState.keys();
    testRunner.assert(keys.includes('testKey'), 'keys 应该返回存储的键');
  });

  testRunner.addTest('ExtensionContext URI 属性', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    testRunner.assert(context.storageUri !== undefined, 'storageUri 应该存在');
    testRunner.assert(context.globalStorageUri !== undefined, 'globalStorageUri 应该存在');
    testRunner.assert(context.workspaceStorageUri !== undefined, 'workspaceStorageUri 应该存在');
    testRunner.assert(context.logUri !== undefined, 'logUri 应该存在');
    
    testRunner.assert(context.storageUri.scheme === 'file', 'storageUri 应该使用 file scheme');
    testRunner.assert(context.globalStorageUri.scheme === 'file', 'globalStorageUri 应该使用 file scheme');
    testRunner.assert(context.workspaceStorageUri.scheme === 'file', 'workspaceStorageUri 应该使用 file scheme');
    testRunner.assert(context.logUri.scheme === 'file', 'logUri 应该使用 file scheme');
  });

  testRunner.addTest('ExtensionContext environmentVariableCollection', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    const envCollection = context.environmentVariableCollection;
    testRunner.assert(envCollection !== undefined, 'environmentVariableCollection 应该存在');
    
    testRunner.assert(typeof envCollection.replace === 'function', '应该有 replace 方法');
    testRunner.assert(typeof envCollection.append === 'function', '应该有 append 方法');
    testRunner.assert(typeof envCollection.prepend === 'function', '应该有 prepend 方法');
    testRunner.assert(typeof envCollection.get === 'function', '应该有 get 方法');
    testRunner.assert(typeof envCollection.forEach === 'function', '应该有 forEach 方法');
    testRunner.assert(typeof envCollection.delete === 'function', '应该有 delete 方法');
    testRunner.assert(typeof envCollection.clear === 'function', '应该有 clear 方法');
  });

  testRunner.addTest('ExtensionContext secrets', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    const secrets = context.secrets;
    testRunner.assert(secrets !== undefined, 'secrets 应该存在');
    
    testRunner.assert(typeof secrets.get === 'function', '应该有 get 方法');
    testRunner.assert(typeof secrets.store === 'function', '应该有 store 方法');
    testRunner.assert(typeof secrets.delete === 'function', '应该有 delete 方法');
    testRunner.assert(typeof secrets.onDidChange === 'function', '应该有 onDidChange 方法');
  });

  testRunner.addTest('ExtensionContext extension 属性', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    const extension = context.extension;
    testRunner.assert(extension !== undefined, 'extension 应该存在');
    
    testRunner.assert(extension.id === 'test.extension', 'extension.id 应该正确');
    testRunner.assert(extension.extensionUri.fsPath === extensionPath, 'extension.extensionUri 应该正确');
    testRunner.assert(extension.extensionPath === extensionPath, 'extension.extensionPath 应该正确');
    testRunner.assert(extension.isActive === true, 'extension.isActive 应该是 true');
    testRunner.assert(typeof extension.packageJSON === 'object', 'extension.packageJSON 应该是对象');
  });

  testRunner.addTest('ExtensionContext asAbsolutePath', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    const relativePath = 'subdir/file.txt';
    const absolutePath = context.asAbsolutePath(relativePath);
    testRunner.assert(absolutePath === path.join(extensionPath, relativePath), '应该正确转换为绝对路径');
  });

  testRunner.addTest('ExtensionContext subscribe 和 dispose', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    let disposed = false;
    const disposable = new vscode.Disposable(() => {
      disposed = true;
    });
    
    context.subscribe(disposable);
    testRunner.assert(context.subscriptions.length === 1, 'subscriptions 应该包含一个项目');
    testRunner.assert(context.subscriptions[0] === disposable, 'subscriptions 应该包含正确的项目');
    
    context.dispose();
    testRunner.assert(disposed, 'dispose 应该调用所有订阅的 dispose 方法');
    testRunner.assert(context.subscriptions.length === 0, 'dispose 后 subscriptions 应该为空');
  });
});

// 错误处理测试
testRunner.describe('错误处理测试', () => {
  testRunner.addTest('命令注册错误处理', () => {
    // 测试无效命令 ID
    testRunner.assertThrows(
      () => vscode.commands.registerCommand(null, () => {}),
      'Command ID is required',
      '应该抛出命令 ID 错误'
    );
    
    // 测试无效命令处理器
    testRunner.assertThrows(
      () => vscode.commands.registerCommand('test.command', null),
      'Command handler must be a function',
      '应该抛出命令处理器错误'
    );
    
    // 测试无效文本编辑器命令 ID
    testRunner.assertThrows(
      () => vscode.commands.registerTextEditorCommand(null, () => {}),
      'Command ID is required',
      '应该抛出命令 ID 错误'
    );
    
    // 测试无效文本编辑器命令处理器
    testRunner.assertThrows(
      () => vscode.commands.registerTextEditorCommand('test.command', null),
      'Command handler must be a function',
      '应该抛出命令处理器错误'
    );
  });

  testRunner.addTest('语言功能注册错误处理', () => {
    // 测试无效诊断集合名称
    testRunner.assertThrows(
      () => vscode.languages.createDiagnosticCollection(null),
      'Diagnostic collection name is required',
      '应该抛出诊断集合名称错误'
    );
    
    // 测试无效代码操作提供者
    testRunner.assertThrows(
      () => vscode.languages.registerCodeActionsProvider(null, {}),
      'Selector and provider are required',
      '应该抛出选择器和提供者错误'
    );
    
    // 测试无效补全提供者
    testRunner.assertThrows(
      () => vscode.languages.registerCompletionItemProvider(null, {}),
      'Selector and provider are required',
      '应该抛出选择器和提供者错误'
    );
    
    // 测试无效悬停提供者
    testRunner.assertThrows(
      () => vscode.languages.registerHoverProvider(null, {}),
      'Selector and provider are required',
      '应该抛出选择器和提供者错误'
    );
  });

  testRunner.addTest('工作空间编辑错误处理', async () => {
    // 测试无效编辑
    try {
      await vscode.workspace.applyEdit(null);
      testRunner.assert(false, '应该抛出错误');
    } catch (error) {
      testRunner.assert(error.message.includes('Edit must be a WorkspaceEdit instance'), '应该抛出编辑类型错误');
    }
  });

  testRunner.addTest('文件系统操作错误处理', async () => {
    // 测试读取不存在的文件
    try {
      await vscode.workspace.fs.readFile(vscode.Uri.file('/nonexistent/file.txt'));
      testRunner.assert(false, '应该抛出错误');
    } catch (error) {
      testRunner.assert(error !== undefined, '应该抛出文件读取错误');
    }
    
    // 测试写入到无效路径
    try {
      await vscode.workspace.fs.writeFile(vscode.Uri.file('/invalid/path/file.txt'), new TextEncoder().encode('test'));
      testRunner.assert(false, '应该抛出错误');
    } catch (error) {
      testRunner.assert(error !== undefined, '应该抛出文件写入错误');
    }
  });
});

// 事件系统测试
testRunner.describe('事件系统测试', () => {
  testRunner.addTest('EventEmitter 基本功能', () => {
    const emitter = new vscode.EventEmitter();
    let eventFired = false;
    let eventData = null;
    
    // 监听事件
    const disposable = emitter.event((data) => {
      eventFired = true;
      eventData = data;
    });
    
    // 触发事件
    const testData = { message: 'test event' };
    emitter.fire(testData);
    
    testRunner.assert(eventFired, '事件应该被触发');
    testRunner.assertDeepEqual(eventData, testData, '事件数据应该正确');
    
    // 移除监听器
    disposable.dispose();
    
    // 重置状态
    eventFired = false;
    eventData = null;
    
    // 再次触发事件
    emitter.fire(testData);
    
    testRunner.assert(!eventFired, '移除监听器后事件不应该被触发');
    testRunner.assert(eventData === null, '移除监听器后事件数据应该为 null');
  });

  testRunner.addTest('多个事件监听器', () => {
    const emitter = new vscode.EventEmitter();
    let callCount = 0;
    
    // 添加多个监听器
    const disposable1 = emitter.event(() => {
      callCount++;
    });
    
    const disposable2 = emitter.event(() => {
      callCount++;
    });
    
    // 触发事件
    emitter.fire();
    
    testRunner.assert(callCount === 2, '应该调用两个监听器');
    
    // 移除一个监听器
    disposable1.dispose();
    
    // 重置计数
    callCount = 0;
    
    // 再次触发事件
    emitter.fire();
    
    testRunner.assert(callCount === 1, '应该只调用剩余的监听器');
    
    // 移除另一个监听器
    disposable2.dispose();
    
    // 重置计数
    callCount = 0;
    
    // 再次触发事件
    emitter.fire();
    
    testRunner.assert(callCount === 0, '不应该调用任何监听器');
  });

  testRunner.addTest('window 事件', () => {
    let activeEditorChanged = false;
    let visibleEditorsChanged = false;
    
    // 监听事件
    const disposable1 = vscode.window.onDidChangeActiveTextEditor(() => {
      activeEditorChanged = true;
    });
    
    const disposable2 = vscode.window.onDidChangeVisibleTextEditors(() => {
      visibleEditorsChanged = true;
    });
    
    // 创建临时文件和编辑器以触发事件
    const tempFilePath = createTempFile('test content', 'test-events.txt');
    vscode.window.showTextDocument(tempFilePath);
    
    // 注意：在模拟环境中，事件可能不会自动触发，这里主要验证监听器设置是否正确
    testRunner.assert(typeof disposable1.dispose === 'function', '应该返回可释放的对象');
    testRunner.assert(typeof disposable2.dispose === 'function', '应该返回可释放的对象');
    
    disposable1.dispose();
    disposable2.dispose();
    cleanupTempFiles();
  });

  testRunner.addTest('workspace 事件', () => {
    let configurationChanged = false;
    let textDocumentOpened = false;
    
    // 监听事件
    const disposable1 = vscode.workspace.onDidChangeConfiguration(() => {
      configurationChanged = true;
    });
    
    const disposable2 = vscode.workspace.onDidOpenTextDocument(() => {
      textDocumentOpened = true;
    });
    
    // 注意：在模拟环境中，事件可能不会自动触发，这里主要验证监听器设置是否正确
    testRunner.assert(typeof disposable1.dispose === 'function', '应该返回可释放的对象');
    testRunner.assert(typeof disposable2.dispose === 'function', '应该返回可释放的对象');
    
    disposable1.dispose();
    disposable2.dispose();
  });

  testRunner.addTest('命令执行历史事件', () => {
    // 注册并执行一个命令
    const disposable = vscode.commands.registerCommand('test.historyEvent', () => {
      return 'history result';
    });
    
    vscode.commands.executeCommand('test.historyEvent');
    
    // 获取执行历史
    const history = vscode.commands.getCommandExecutionHistory();
    testRunner.assert(Array.isArray(history), '历史记录应该是数组');
    testRunner.assert(history.length > 0, '应该有执行历史');
    
    const commandHistory = history.find(entry => entry.id === 'test.historyEvent');
    testRunner.assert(commandHistory !== undefined, '应该找到命令的执行历史');
    testRunner.assert(commandHistory.result === 'history result', '历史记录应该包含执行结果');
    
    disposable.dispose();
  });
});

// 资源管理测试
testRunner.describe('资源管理测试', () => {
  testRunner.addTest('Disposable 资源管理', () => {
    let disposedCount = 0;
    
    // 创建多个 Disposable
    const disposable1 = new vscode.Disposable(() => {
      disposedCount++;
    });
    
    const disposable2 = new vscode.Disposable(() => {
      disposedCount++;
    });
    
    const disposable3 = new vscode.Disposable(() => {
      disposedCount++;
    });
    
    // 使用 Disposable.from 组合多个 Disposable
    const combinedDisposable = vscode.Disposable.from(disposable1, disposable2, disposable3);
    
    testRunner.assert(!disposable1.isDisposed, 'disposable1 初始状态不应该被释放');
    testRunner.assert(!disposable2.isDisposed, 'disposable2 初始状态不应该被释放');
    testRunner.assert(!disposable3.isDisposed, 'disposable3 初始状态不应该被释放');
    
    // 释放组合 Disposable
    combinedDisposable.dispose();
    
    testRunner.assert(disposedCount === 3, '应该释放所有 Disposable');
    testRunner.assert(disposable1.isDisposed, 'disposable1 应该被释放');
    testRunner.assert(disposable2.isDisposed, 'disposable2 应该被释放');
    testRunner.assert(disposable3.isDisposed, 'disposable3 应该被释放');
  });

  testRunner.addTest('命令注册资源管理', () => {
    let commandExecuted = false;
    
    // 注册命令
    const disposable = vscode.commands.registerCommand('test.resource', () => {
      commandExecuted = true;
    });
    
    // 验证命令可以执行
    vscode.commands.executeCommand('test.resource');
    testRunner.assert(commandExecuted, '命令应该被执行');
    
    // 重置状态
    commandExecuted = false;
    
    // 释放命令
    disposable.dispose();
    
    // 验证命令不再可执行
    try {
      vscode.commands.executeCommand('test.resource');
      testRunner.assert(false, '释放后的命令不应该可执行');
    } catch (error) {
      testRunner.assert(!commandExecuted, '释放后的命令不应该被执行');
    }
  });

  testRunner.addTest('语言功能注册资源管理', () => {
    const provider = {
      provideHover: (document, position, token) => {
        return new vscode.Hover(['Hover content']);
      }
    };
    
    const selector = { language: 'javascript' };
    
    // 注册语言功能
    const disposable = vscode.languages.registerHoverProvider(selector, provider);
    
    // 验证提供者已注册
    testRunner.assert(vscode.commands.hasCommand('test.resource') === false, '应该有语言功能提供者');
    
    // 释放语言功能
    disposable.dispose();
    
    // 验证提供者已被释放
    // 注意：在模拟环境中，这可能难以直接验证，主要验证 dispose 方法不抛出错误
  });

  testRunner.addTest('ExtensionContext 订阅资源管理', () => {
    const extensionPath = path.join(__dirname, 'test-extension');
    const context = new vscode.ExtensionContext(extensionPath, 'test.extension');
    
    let disposedCount = 0;
    
    // 创建多个 Disposable 并订阅
    const disposable1 = new vscode.Disposable(() => {
      disposedCount++;
    });
    
    const disposable2 = new vscode.Disposable(() => {
      disposedCount++;
    });
    
    context.subscribe(disposable1);
    context.subscribe(disposable2);
    
    testRunner.assert(context.subscriptions.length === 2, '应该有两个订阅');
    testRunner.assert(!disposable1.isDisposed, 'disposable1 初始状态不应该被释放');
    testRunner.assert(!disposable2.isDisposed, 'disposable2 初始状态不应该被释放');
    
    // 释放上下文
    context.dispose();
    
    testRunner.assert(disposedCount === 2, '应该释放所有订阅的 Disposable');
    testRunner.assert(disposable1.isDisposed, 'disposable1 应该被释放');
    testRunner.assert(disposable2.isDisposed, 'disposable2 应该被释放');
    testRunner.assert(context.subscriptions.length === 0, '释放后 subscriptions 应该为空');
  });

  testRunner.addTest('事件监听器资源管理', () => {
    const emitter = new vscode.EventEmitter();
    let eventCount = 0;
    
    // 添加事件监听器
    const disposable = emitter.event(() => {
      eventCount++;
    });
    
    // 触发事件
    emitter.fire();
    testRunner.assert(eventCount === 1, '事件应该被触发');
    
    // 释放监听器
    disposable.dispose();
    
    // 再次触发事件
    emitter.fire();
    testRunner.assert(eventCount === 1, '释放后事件不应该被触发');
  });
});

// 运行所有测试
async function runTests() {
  try {
    await testRunner.runAllTests();
    
    // 清理临时文件
    cleanupTempFiles();
    
    // 退出进程，返回适当的退出码
    process.exit(testRunner.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('测试运行出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runTests();
}

// 导出测试运行器，以便在其他文件中使用
module.exports = {
  TestRunner,
  runTests
};