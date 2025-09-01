const fs = require('fs');
const path = require('path');
const { window } = require('../modules/window');
const { Uri, Position, Range, Selection } = require('../modules/base-types');

// 模拟依赖模块
jest.mock('../modules/base-types', () => ({
  VSCodeEventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(callback => ({
      dispose: jest.fn()
    })),
    fire: jest.fn()
  })),
  Uri: Object.assign(
    jest.fn().mockImplementation((fsPath, scheme = 'file') => ({
      fsPath,
      path: fsPath,
      scheme,
      toString: () => `${scheme}://${fsPath}`
    })),
    {
      file: jest.fn().mockImplementation((fsPath) => ({
        fsPath,
        path: fsPath,
        scheme: 'file',
        toString: () => `file://${fsPath}`
      }))
    }
  ),
  Position: jest.fn().mockImplementation((line, character) => ({ line, character })),
  Range: jest.fn().mockImplementation((start, end) => ({ start, end })),
  Selection: jest.fn().mockImplementation((start, end) => ({
    anchor: start,
    active: end,
    start,
    end
  })),
  Disposable: jest.fn().mockImplementation(callOnDispose => ({
    dispose: callOnDispose || jest.fn(),
    isDisposed: false
  }))
}));

jest.mock('../modules/config', () => {
  const mockPath = require('path');
  return {
    configManager: {
      resolvePath: jest.fn(p => mockPath.resolve(p)),
      getRooCodeConfiguration: jest.fn(() => ({
        apiProvider: 'openai',
        modelTemperature: 0.7,
        allowedCommands: ['git', 'npm'],
        deniedCommands: ['rm', 'sudo'],
        alwaysAllowExecute: false,
        language: 'en'
      })),
      isCommandAllowedByRooCode: jest.fn(() => true),
      reset: jest.fn(),
      setConfig: jest.fn(),
      getConfig: jest.fn(() => ({})),
      setPersistCallback: jest.fn()
    }
  };
});

describe('window模块测试', () => {
  beforeEach(() => {
    // 重置模拟状态
    jest.clearAllMocks();
    
    // 创建临时文件目录
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理临时文件
    const tempDir = path.join(__dirname, '..', 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('window.activeTextEditor和visibleTextEditors', () => {
    test('初始状态应该没有活动编辑器', () => {
      expect(window.activeTextEditor).toBeNull();
    });

    test('visibleTextEditors应该是数组', () => {
      expect(Array.isArray(window.visibleTextEditors)).toBe(true);
      expect(window.visibleTextEditors.length).toBe(0);
    });
  });

  describe('window.ViewColumn常量', () => {
    test('应该定义正确的ViewColumn常量', () => {
      expect(window.ViewColumn.Active).toBe(-1);
      expect(window.ViewColumn.Beside).toBe(-2);
      expect(window.ViewColumn.One).toBe(1);
      expect(window.ViewColumn.Two).toBe(2);
    });
  });

  describe('window.showInformationMessage', () => {
    test('应该能够显示信息消息', async () => {
      const result = await window.showInformationMessage('Test message');
      expect(result).toBeUndefined();
    });

    test('应该能够显示带按钮的信息消息', async () => {
      const result = await window.showInformationMessage('Test message', 'Button1', 'Button2');
      expect(result).toBe('Button1');
    });
  });

  describe('window.showWarningMessage', () => {
    test('应该能够显示警告消息', async () => {
      const result = await window.showWarningMessage('Test warning');
      expect(result).toBeUndefined();
    });

    test('应该能够显示带按钮的警告消息', async () => {
      const result = await window.showWarningMessage('Test warning', 'Button1', 'Button2');
      expect(result).toBe('Button1');
    });
  });

  describe('window.showErrorMessage', () => {
    test('应该能够显示错误消息', async () => {
      const result = await window.showErrorMessage('Test error');
      expect(result).toBeUndefined();
    });

    test('应该能够显示带按钮的错误消息', async () => {
      const result = await window.showErrorMessage('Test error', 'Button1', 'Button2');
      expect(result).toBe('Button1');
    });
  });

  describe('window.createOutputChannel', () => {
    test('应该能够创建输出通道', () => {
      const channel = window.createOutputChannel('test-channel');
      expect(channel.name).toBe('test-channel');
      
      // 测试appendLine
      channel.appendLine('Test line');
      
      // 测试append
      channel.append('Test text');
      
      // 测试clear
      channel.clear();
      
      // 测试show和hide
      channel.show();
      channel.hide();
      
      // 测试dispose
      channel.dispose();
    });
  });

  describe('window.createStatusBarItem', () => {
    test('应该能够创建状态栏项', () => {
      const item = window.createStatusBarItem(window.ViewColumn.Left, 100);
      expect(item.alignment).toBe(window.ViewColumn.Left);
      expect(item.priority).toBe(100);
      expect(item.text).toBe('');
      
      item.text = 'Test';
      item.tooltip = 'Tooltip';
      item.show();
      item.hide();
      item.dispose();
    });
  });

  describe('window.createQuickPick', () => {
    test('应该能够创建快速选择', () => {
      const quickPick = window.createQuickPick();
      expect(Array.isArray(quickPick.items)).toBe(true);
      expect(Array.isArray(quickPick.activeItems)).toBe(true);
      expect(Array.isArray(quickPick.selectedItems)).toBe(true);
      expect(quickPick.value).toBe('');
      
      quickPick.placeholder = 'Select an item';
      quickPick.items = [{ label: 'Item 1' }, { label: 'Item 2' }];
      
      quickPick.show();
      quickPick.hide();
      quickPick.dispose();
    });
  });

  describe('window.createInputBox', () => {
    test('应该能够创建输入框', () => {
      const inputBox = window.createInputBox();
      expect(inputBox.value).toBe('');
      expect(inputBox.placeholder).toBe('');
      expect(inputBox.prompt).toBe('');
      expect(inputBox.password).toBe(false);
      
      inputBox.placeholder = 'Enter value';
      inputBox.prompt = 'Please enter a value';
      
      inputBox.show();
      inputBox.hide();
      inputBox.dispose();
    });
  });

  describe('window.createTerminal', () => {
    test('应该能够创建终端', () => {
      const terminal = window.createTerminal({ name: 'test-terminal' });
      expect(terminal.name).toBe('test-terminal');
      
      terminal.sendText('echo hello');
      terminal.show();
      terminal.hide();
      terminal.dispose();
    });
  });

  describe('window.createTextEditorDecorationType', () => {
    test('应该能够创建文本编辑器装饰类型', () => {
      const decorationType = window.createTextEditorDecorationType({
        backgroundColor: 'red',
        color: 'white'
      });
      expect(typeof decorationType.key).toBe('string');
      
      decorationType.dispose();
    });
  });

  describe('window.showTextDocument', () => {
    test('应该能够显示文本文档', () => {
      // 创建临时文件
      const tempDir = path.join(__dirname, '..', 'temp');
      const tempFilePath = path.join(tempDir, 'test-show.txt');
      fs.writeFileSync(tempFilePath, 'test content');
      
      // 测试使用文件路径
      const editor1 = window.showTextDocument(tempFilePath);
      expect(editor1).toBeDefined();
      
      // 测试使用Uri
      const uri = Uri.file(tempFilePath);
      const editor2 = window.showTextDocument(uri);
      expect(editor2).toBeDefined();
    });
  });

  describe('window事件监听器', () => {
    test('应该能够监听活动编辑器变化', () => {
      let activeEditorChanged = false;
      const disposable = window.onDidChangeActiveTextEditor(() => {
        activeEditorChanged = true;
      });
      
      // 创建临时文件和编辑器以触发事件
      const tempDir = path.join(__dirname, '..', 'temp');
      const tempFilePath = path.join(tempDir, 'test-events.txt');
      fs.writeFileSync(tempFilePath, 'test content');
      window.showTextDocument(tempFilePath);
      
      expect(typeof disposable.dispose).toBe('function');
      disposable.dispose();
    });

    test('应该能够监听可见编辑器变化', () => {
      let visibleEditorsChanged = false;
      const disposable = window.onDidChangeVisibleTextEditors(() => {
        visibleEditorsChanged = true;
      });
      
      expect(typeof disposable.dispose).toBe('function');
      disposable.dispose();
    });
  });

  describe('window.createWebviewPanel', () => {
    test('应该能够创建Webview面板', () => {
      const panel = window.createWebviewPanel(
        'test-webview',
        'Test Webview',
        window.ViewColumn.One,
        { enableScripts: true }
      );
      
      expect(panel.viewType).toBe('test-webview');
      expect(panel.title).toBe('Test Webview');
      expect(panel.visible).toBe(true);
      expect(panel.active).toBe(true);
      
      panel.webview.html = '<html><body>Test</body></html>';
      panel.reveal(window.ViewColumn.Two);
      panel.dispose();
    });
  });

  describe('window.registerWebviewViewProvider', () => {
    test('应该能够注册Webview视图提供者', () => {
      const provider = {
        resolveWebviewView: jest.fn()
      };
      
      const disposable = window.registerWebviewViewProvider('test-view', provider);
      expect(typeof disposable.dispose).toBe('function');
      
      disposable.dispose();
    });
  });

  describe('window.tabGroups', () => {
    test('应该能够访问标签组', () => {
      expect(window.tabGroups).toBeDefined();
      expect(Array.isArray(window.tabGroups.all)).toBe(true);
      expect(window.tabGroups.activeTabGroup).toBeDefined();
      
      // 测试事件监听器
      const disposable = window.tabGroups.onDidChangeTabs(() => {});
      expect(typeof disposable.dispose).toBe('function');
      disposable.dispose();
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的文件路径', () => {
      expect(() => {
        window.showTextDocument('');
      }).not.toThrow();
    });

    test('应该处理无效的装饰类型选项', () => {
      expect(() => {
        window.createTextEditorDecorationType(null);
      }).not.toThrow();
    });

    test('应该处理无效的Webview选项', () => {
      expect(() => {
        window.createWebviewPanel('test', 'Test', window.ViewColumn.One, null);
      }).not.toThrow();
    });
  });

  describe('异步操作', () => {
    test('应该异步处理消息显示', async () => {
      const promise = window.showInformationMessage('Async test');
      expect(promise).toBeInstanceOf(Promise);
      
      const result = await promise;
      expect(result).toBeUndefined();
    });

    test('应该异步处理警告消息', async () => {
      const promise = window.showWarningMessage('Async warning');
      expect(promise).toBeInstanceOf(Promise);
      
      const result = await promise;
      expect(result).toBeUndefined();
    });

    test('应该异步处理错误消息', async () => {
      const promise = window.showErrorMessage('Async error');
      expect(promise).toBeInstanceOf(Promise);
      
      const result = await promise;
      expect(result).toBeUndefined();
    });
  });
});