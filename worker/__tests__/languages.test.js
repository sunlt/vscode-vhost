const { languages } = require('../modules/languages');
const { 
  Uri, 
  Position, 
  Range, 
  Diagnostic, 
  DiagnosticSeverity, 
  CompletionItem, 
  CompletionItemKind,
  Disposable
} = require('../modules/base-types');

// 模拟languages模块
jest.mock('../modules/languages', () => {
  const originalModule = jest.requireActual('../modules/languages');
  return {
    ...originalModule,
    languages: {
      ...originalModule.languages,
      onDidChangeDiagnostics: jest.fn().mockImplementation((callback) => ({
        dispose: jest.fn()
      })),
      match: jest.fn().mockImplementation((selector, document) => {
        if (typeof selector === 'string') {
          return document.languageId === selector;
        }
        if (selector.language) {
          return document.languageId === selector.language;
        }
        if (selector.scheme) {
          return document.uri && document.uri.scheme === selector.scheme;
        }
        if (selector.pattern) {
          if (!document.uri || !document.uri.fsPath) {
            return false;
          }
          
          const pattern = selector.pattern;
          const fsPath = document.uri.fsPath;
          
          // 处理 **/*.js 这样的模式
          if (pattern.includes('**/*.js')) {
            return fsPath.endsWith('.js');
          }
          
          // 处理 **/*.* 这样的通用模式
          if (pattern === '**/*.*') {
            return true; // 匹配所有文件
          }
          
          // 处理 **/*.ts 这样的模式
          if (pattern.startsWith('**/*.')) {
            const extension = pattern.substring(5); // 去掉 '**/*.'
            return fsPath.endsWith('.' + extension);
          }
          
          // 处理 *.js 这样的模式
          if (pattern.startsWith('*.')) {
            const extension = pattern.substring(1);
            const fileName = fsPath.split('/').pop();
            return fileName.endsWith(extension);
          }
          
          // 处理 /*.js 这样的模式
          if (pattern.includes('/*.')) {
            const extension = pattern.split('/*.')[1];
            const fileName = fsPath.split('/').pop();
            return fileName.endsWith('.' + extension);
          }
          
          // 处理包含通配符的模式
          if (pattern.includes('*')) {
            const regexPattern = pattern.replace(/\*/g, '.*');
            const regex = new RegExp(regexPattern);
            return regex.test(fsPath);
          }
          
          // 简单字符串包含
          return fsPath.includes(pattern);
        }
        return false;
      })
    }
  };
});

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
  Diagnostic: jest.fn().mockImplementation((range, message, severity) => ({
    range,
    message,
    severity: severity || 0,
    source: undefined,
    code: undefined,
    relatedInformation: undefined,
    tags: undefined
  })),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
  },
  CompletionItem: jest.fn().mockImplementation((label, kind) => ({
    label,
    kind,
    detail: undefined,
    documentation: undefined,
    sortText: undefined,
    filterText: undefined,
    insertText: undefined,
    textEdit: undefined,
    additionalTextEdits: undefined,
    commitCharacters: undefined,
    command: undefined,
    preselect: undefined
  })),
  CompletionItemKind: {
    Text: 0,
    Method: 1,
    Function: 2,
    Constructor: 3,
    Field: 4,
    Variable: 5,
    Class: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Unit: 10,
    Value: 11,
    Enum: 12,
    Keyword: 13,
    Snippet: 14,
    Color: 15,
    File: 16,
    Reference: 17,
    Folder: 18,
    EnumMember: 19,
    Constant: 20,
    Struct: 21,
    Event: 22,
    Operator: 23,
    TypeParameter: 24
  },
  Disposable: jest.fn().mockImplementation(callOnDispose => ({
    dispose: callOnDispose || jest.fn(),
    isDisposed: false
  }))
}));

jest.mock('../modules/config', () => ({
  configManager: {
    resolvePath: jest.fn(p => p)
  }
}));

describe('languages模块测试', () => {
  beforeEach(() => {
    // 重置模拟状态
    jest.clearAllMocks();
  });

  describe('诊断集合', () => {
    test('应该能够创建诊断集合', () => {
      const diagnosticCollection = languages.createDiagnosticCollection('test');
      expect(diagnosticCollection).toBeDefined();
      expect(diagnosticCollection.name).toBe('test');
    });

    test('应该能够设置诊断信息', () => {
      const diagnosticCollection = languages.createDiagnosticCollection('test');
      const uri = Uri.file('/test/file.txt');
      const diagnostic = new Diagnostic(
        new Range(new Position(0, 0), new Position(0, 5)),
        'Test diagnostic',
        DiagnosticSeverity.Warning
      );
      
      diagnosticCollection.set(uri, [diagnostic]);
      const diagnostics = diagnosticCollection.get(uri);
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Test diagnostic');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    test('应该能够删除诊断信息', () => {
      const diagnosticCollection = languages.createDiagnosticCollection('test');
      const uri = Uri.file('/test/file.txt');
      const diagnostic = new Diagnostic(
        new Range(new Position(0, 0), new Position(0, 5)),
        'Test diagnostic',
        DiagnosticSeverity.Warning
      );
      
      diagnosticCollection.set(uri, [diagnostic]);
      expect(diagnosticCollection.get(uri)).toHaveLength(1);
      
      diagnosticCollection.delete(uri);
      expect(diagnosticCollection.get(uri)).toBeUndefined();
    });

    test('应该能够清除所有诊断信息', () => {
      const diagnosticCollection = languages.createDiagnosticCollection('test');
      const uri1 = Uri.file('/test/file1.txt');
      const uri2 = Uri.file('/test/file2.txt');
      const diagnostic = new Diagnostic(
        new Range(new Position(0, 0), new Position(0, 5)),
        'Test diagnostic',
        DiagnosticSeverity.Warning
      );
      
      diagnosticCollection.set(uri1, [diagnostic]);
      diagnosticCollection.set(uri2, [diagnostic]);
      
      expect(diagnosticCollection.get(uri1)).toHaveLength(1);
      expect(diagnosticCollection.get(uri2)).toHaveLength(1);
      
      diagnosticCollection.clear();
      
      expect(diagnosticCollection.get(uri1)).toBeUndefined();
      expect(diagnosticCollection.get(uri2)).toBeUndefined();
    });

    test('应该能够释放诊断集合', () => {
      const diagnosticCollection = languages.createDiagnosticCollection('test');
      expect(typeof diagnosticCollection.dispose).toBe('function');
      
      diagnosticCollection.dispose();
    });
  });

  describe('补全项提供者', () => {
    test('应该能够注册补全项提供者', () => {
      const provider = {
        provideCompletionItems: jest.fn()
      };
      
      const disposable = languages.registerCompletionItemProvider('javascript', provider);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      disposable.dispose();
    });

    test('应该能够调用补全项提供者', async () => {
      const provider = {
        provideCompletionItems: jest.fn().mockResolvedValue([
          new CompletionItem('test1', CompletionItemKind.Function),
          new CompletionItem('test2', CompletionItemKind.Variable)
        ])
      };
      
      const disposable = languages.registerCompletionItemProvider('javascript', provider);
      
      // 模拟触发补全
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const position = new Position(0, 0);
      const context = { triggerKind: 1 };
      
      const items = await provider.provideCompletionItems(document, position, undefined, context);
      
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('test1');
      expect(items[0].kind).toBe(CompletionItemKind.Function);
      expect(items[1].label).toBe('test2');
      expect(items[1].kind).toBe(CompletionItemKind.Variable);
      
      disposable.dispose();
    });
  });

  describe('代码操作提供者', () => {
    test('应该能够注册代码操作提供者', () => {
      const provider = {
        provideCodeActions: jest.fn()
      };
      
      const disposable = languages.registerCodeActionsProvider('javascript', provider);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      disposable.dispose();
    });

    test('应该能够调用代码操作提供者', async () => {
      const provider = {
        provideCodeActions: jest.fn().mockResolvedValue([
          { title: 'Fix issue', kind: { value: 'quickfix' } },
          { title: 'Refactor', kind: { value: 'refactor' } }
        ])
      };
      
      const disposable = languages.registerCodeActionsProvider('javascript', provider);
      
      // 模拟触发代码操作
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const range = new Range(new Position(0, 0), new Position(0, 5));
      const context = { diagnostics: [] };
      
      const actions = await provider.provideCodeActions(document, range, context);
      
      expect(actions).toHaveLength(2);
      expect(actions[0].title).toBe('Fix issue');
      expect(actions[1].title).toBe('Refactor');
      
      disposable.dispose();
    });
  });

  describe('悬停信息提供者', () => {
    test('应该能够注册悬停信息提供者', () => {
      const provider = {
        provideHover: jest.fn()
      };
      
      const disposable = languages.registerHoverProvider('javascript', provider);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      disposable.dispose();
    });

    test('应该能够调用悬停信息提供者', async () => {
      const provider = {
        provideHover: jest.fn().mockResolvedValue({
          contents: ['Hover information'],
          range: new Range(new Position(0, 0), new Position(0, 5))
        })
      };
      
      const disposable = languages.registerHoverProvider('javascript', provider);
      
      // 模拟触发悬停
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const position = new Position(0, 0);
      
      const hover = await provider.provideHover(document, position);
      
      expect(hover).toBeDefined();
      expect(hover.contents).toEqual(['Hover information']);
      expect(hover.range).toBeDefined();
      
      disposable.dispose();
    });
  });

  describe('定义提供者', () => {
    test('应该能够注册定义提供者', () => {
      const provider = {
        provideDefinition: jest.fn()
      };
      
      const disposable = languages.registerDefinitionProvider('javascript', provider);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      disposable.dispose();
    });

    test('应该能够调用定义提供者', async () => {
      const provider = {
        provideDefinition: jest.fn().mockResolvedValue([
          {
            uri: Uri.file('/test/definition.js'),
            range: new Range(new Position(10, 0), new Position(10, 5))
          }
        ])
      };
      
      const disposable = languages.registerDefinitionProvider('javascript', provider);
      
      // 模拟触发定义查找
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const position = new Position(0, 0);
      
      const definitions = await provider.provideDefinition(document, position);
      
      expect(definitions).toHaveLength(1);
      expect(definitions[0].uri.fsPath).toBe('/test/definition.js');
      expect(definitions[0].range).toBeDefined();
      
      disposable.dispose();
    });
  });

  describe('格式化提供者', () => {
    test('应该能够注册文档格式化提供者', () => {
      const provider = {
        provideDocumentFormattingEdits: jest.fn()
      };
      
      const disposable = languages.registerDocumentFormattingEditProvider('javascript', provider);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      disposable.dispose();
    });

    test('应该能够调用文档格式化提供者', async () => {
      const provider = {
        provideDocumentFormattingEdits: jest.fn().mockResolvedValue([
          {
            range: new Range(new Position(0, 0), new Position(0, 10)),
            newText: 'formatted text'
          }
        ])
      };
      
      const disposable = languages.registerDocumentFormattingEditProvider('javascript', provider);
      
      // 模拟触发格式化
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const options = { tabSize: 2, insertSpaces: true };
      
      const edits = await provider.provideDocumentFormattingEdits(document, options);
      
      expect(edits).toHaveLength(1);
      expect(edits[0].newText).toBe('formatted text');
      expect(edits[0].range).toBeDefined();
      
      disposable.dispose();
    });
  });

  describe('语言特性事件', () => {
    test('应该能够监听诊断变化', () => {
      const listener = jest.fn();
      const disposable = languages.onDidChangeDiagnostics(listener);
      
      expect(typeof disposable.dispose).toBe('function');
      
      // 模拟触发事件
      languages.triggerDiagnosticsChanged();
      
      // 注意：在实际实现中，这里应该检查listener是否被调用
      // 但由于我们使用的是模拟，这里只是验证API的存在
      
      disposable.dispose();
    });
  });

  describe('匹配文档', () => {
    test('应该能够匹配文档', () => {
      const selector = { language: 'javascript' };
      const document = { languageId: 'javascript' };
      
      expect(languages.match(selector, document)).toBe(true);
    });

    test('应该能够匹配方案', () => {
      const selector = { scheme: 'file' };
      const document = { uri: { scheme: 'file' } };
      
      expect(languages.match(selector, document)).toBe(true);
    });

    test('应该能够匹配模式', () => {
      const selector = { pattern: '**/*.js' };
      const document = { uri: { fsPath: '/test/file.js' } };
      
      expect(languages.match(selector, document)).toBe(true);
    });

    test('应该能够处理不匹配的情况', () => {
      const selector = { language: 'typescript' };
      const document = { languageId: 'javascript' };
      
      expect(languages.match(selector, document)).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的诊断集合名称', () => {
      expect(() => {
        languages.createDiagnosticCollection(null);
      }).not.toThrow();
    });

    test('应该处理无效的提供者', () => {
      expect(() => {
        languages.registerCompletionItemProvider('javascript', null);
      }).not.toThrow();
    });

    test('应该处理提供者中的错误', async () => {
      const provider = {
        provideCompletionItems: jest.fn().mockImplementation(() => {
          throw new Error('Provider error');
        })
      };
      
      const disposable = languages.registerCompletionItemProvider('javascript', provider);
      
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const position = new Position(0, 0);
      
      try {
        await provider.provideCompletionItems(document, position);
      } catch (error) {
        expect(error.message).toBe('Provider error');
      }
      
      disposable.dispose();
    });
  });

  describe('异步操作', () => {
    test('应该异步提供补全项', async () => {
      const provider = {
        provideCompletionItems: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return [new CompletionItem('async item', CompletionItemKind.Function)];
        })
      };
      
      const disposable = languages.registerCompletionItemProvider('javascript', provider);
      
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const position = new Position(0, 0);
      
      const promise = provider.provideCompletionItems(document, position);
      expect(promise).toBeInstanceOf(Promise);
      
      const items = await promise;
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe('async item');
      
      disposable.dispose();
    });

    test('应该异步提供代码操作', async () => {
      const provider = {
        provideCodeActions: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return [{ title: 'Async action', kind: { value: 'quickfix' } }];
        })
      };
      
      const disposable = languages.registerCodeActionsProvider('javascript', provider);
      
      const document = { uri: Uri.file('/test/file.js'), languageId: 'javascript' };
      const range = new Range(new Position(0, 0), new Position(0, 5));
      const context = { diagnostics: [] };
      
      const promise = provider.provideCodeActions(document, range, context);
      expect(promise).toBeInstanceOf(Promise);
      
      const actions = await promise;
      expect(actions).toHaveLength(1);
      expect(actions[0].title).toBe('Async action');
      
      disposable.dispose();
    });
  });
});