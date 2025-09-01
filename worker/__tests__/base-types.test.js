const path = require('path');
const {
  VSCodeEventEmitter,
  Uri,
  Position,
  Range,
  Selection,
  ThemeIcon,
  CodeAction,
  Diagnostic,
  CompletionItem,
  Hover,
  Location,
  TextEdit,
  MarkdownString,
  Disposable,
  CancellationToken,
  CancellationTokenSource,
  CompletionItemKind,
  DiagnosticSeverity,
  CodeActionKind,
  FileType
} = require('../modules/base-types');

// 模拟configManager
jest.mock('../modules/config', () => {
  const mockPath = require('path');
  return {
    configManager: {
      resolvePath: jest.fn(p => mockPath.resolve(p))
    }
  };
});

describe('基础类型测试', () => {
  describe('VSCodeEventEmitter', () => {
    let emitter;

    beforeEach(() => {
      emitter = new VSCodeEventEmitter();
    });

    test('应该能够创建事件发射器实例', () => {
      expect(emitter).toBeInstanceOf(VSCodeEventEmitter);
    });

    test('应该能够注册和触发事件', () => {
      const mockCallback = jest.fn();
      const disposable = emitter.event(mockCallback);
      
      emitter.fire('test data');
      
      expect(mockCallback).toHaveBeenCalledWith('test data');
      disposable.dispose();
    });

    test('应该能够取消事件监听', () => {
      const mockCallback = jest.fn();
      const disposable = emitter.event(mockCallback);
      
      disposable.dispose();
      emitter.fire('test data');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Uri', () => {
    test('应该能够从文件路径创建URI', () => {
      const uri = Uri.file('/test/path');
      expect(uri).toBeInstanceOf(Uri);
      expect(uri.fsPath).toBe(path.resolve('/test/path'));
      expect(uri.scheme).toBe('file');
    });

    test('应该能够解析URI字符串', () => {
      const uri = Uri.parse('file:///test/path');
      expect(uri).toBeInstanceOf(Uri);
      expect(uri.fsPath).toBe(path.resolve('/test/path'));
      expect(uri.scheme).toBe('file');
    });

    test('应该能够连接路径', () => {
      const baseUri = Uri.file('/base');
      const joinedUri = Uri.joinPath(baseUri, 'subdir', 'file.txt');
      expect(joinedUri.fsPath).toBe(path.join('/base', 'subdir', 'file.txt'));
    });

    test('应该能够处理非文件URI方案', () => {
      const uri = Uri.parse('http://example.com/path');
      expect(uri.scheme).toBe('http');
      expect(uri.fsPath).toBe('example.com/path');
    });
  });

  describe('Position', () => {
    test('应该能够创建位置实例', () => {
      const position = new Position(5, 10);
      expect(position.line).toBe(5);
      expect(position.character).toBe(10);
    });
  });

  describe('Range', () => {
    test('应该能够创建范围实例', () => {
      const start = new Position(1, 2);
      const end = new Position(3, 4);
      const range = new Range(start, end);
      
      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
    });
  });

  describe('Selection', () => {
    test('应该能够创建选择范围实例', () => {
      const start = new Position(1, 2);
      const end = new Position(3, 4);
      const selection = new Selection(start, end);
      
      expect(selection.anchor).toBe(start);
      expect(selection.active).toBe(end);
      expect(selection.start).toBe(start);
      expect(selection.end).toBe(end);
    });
  });

  describe('ThemeIcon', () => {
    test('应该能够创建主题图标实例', () => {
      const icon = new ThemeIcon('test-icon');
      expect(icon.id).toBe('test-icon');
    });
  });

  describe('CodeAction', () => {
    test('应该能够创建代码操作实例', () => {
      const action = new CodeAction('Test Action', CodeActionKind.QuickFix);
      expect(action.title).toBe('Test Action');
      expect(action.kind).toBe(CodeActionKind.QuickFix);
      expect(action.command).toBeUndefined();
      expect(action.edit).toBeUndefined();
    });
  });

  describe('Diagnostic', () => {
    test('应该能够创建诊断信息实例', () => {
      const range = new Range(new Position(0, 0), new Position(1, 1));
      const diagnostic = new Diagnostic(range, 'Test message', DiagnosticSeverity.Error);
      
      expect(diagnostic.range).toBe(range);
      expect(diagnostic.message).toBe('Test message');
      expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
      expect(diagnostic.source).toBeUndefined();
    });

    test('应该使用默认严重程度', () => {
      const range = new Range(new Position(0, 0), new Position(1, 1));
      const diagnostic = new Diagnostic(range, 'Test message');
      
      expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
    });
  });

  describe('CompletionItem', () => {
    test('应该能够创建补全项实例', () => {
      const item = new CompletionItem('test', CompletionItemKind.Function);
      expect(item.label).toBe('test');
      expect(item.kind).toBe(CompletionItemKind.Function);
      expect(item.detail).toBeUndefined();
      expect(item.documentation).toBeUndefined();
    });
  });

  describe('Hover', () => {
    test('应该能够创建悬停信息实例', () => {
      const range = new Range(new Position(0, 0), new Position(1, 1));
      const contents = ['Hover content'];
      const hover = new Hover(contents, range);
      
      expect(hover.contents).toBe(contents);
      expect(hover.range).toBe(range);
    });
  });

  describe('Location', () => {
    test('应该能够使用范围创建位置信息实例', () => {
      const uri = Uri.file('/test/file');
      const range = new Range(new Position(0, 0), new Position(1, 1));
      const location = new Location(uri, range);
      
      expect(location.uri).toBe(uri);
      expect(location.range).toBe(range);
    });

    test('应该能够使用位置创建位置信息实例', () => {
      const uri = Uri.file('/test/file');
      const position = new Position(0, 0);
      const location = new Location(uri, position);
      
      expect(location.uri).toBe(uri);
      expect(location.range.start).toBe(position);
      expect(location.range.end).toBe(position);
    });
  });

  describe('TextEdit', () => {
    test('应该能够创建替换文本编辑', () => {
      const range = new Range(new Position(0, 0), new Position(1, 1));
      const edit = TextEdit.replace(range, 'new text');
      
      expect(edit.range).toBe(range);
      expect(edit.newText).toBe('new text');
    });

    test('应该能够创建插入文本编辑', () => {
      const position = new Position(0, 0);
      const edit = TextEdit.insert(position, 'inserted text');
      
      expect(edit.range.start).toBe(position);
      expect(edit.range.end).toBe(position);
      expect(edit.newText).toBe('inserted text');
    });

    test('应该能够创建删除文本编辑', () => {
      const range = new Range(new Position(0, 0), new Position(1, 1));
      const edit = TextEdit.delete(range);
      
      expect(edit.range).toBe(range);
      expect(edit.newText).toBe('');
    });
  });

  describe('MarkdownString', () => {
    test('应该能够创建Markdown字符串实例', () => {
      const md = new MarkdownString();
      expect(md.value).toBe('');
      expect(md.isTrusted).toBe(false);
    });

    test('应该能够追加文本', () => {
      const md = new MarkdownString();
      md.appendText('plain text');
      expect(md.value).toContain('plain text');
    });

    test('应该能够追加Markdown', () => {
      const md = new MarkdownString();
      md.appendMarkdown('**bold**');
      expect(md.value).toContain('**bold**');
    });

    test('应该能够追加代码块', () => {
      const md = new MarkdownString();
      md.appendCodeblock('code', 'javascript');
      expect(md.value).toContain('```javascript');
      expect(md.value).toContain('code');
    });
  });

  describe('Disposable', () => {
    test('应该能够创建可释放资源实例', () => {
      let disposed = false;
      const disposable = new Disposable(() => {
        disposed = true;
      });
      
      expect(disposable.isDisposed).toBe(false);
      disposable.dispose();
      expect(disposed).toBe(true);
      expect(disposable.isDisposed).toBe(true);
    });

    test('应该能够从多个可释放资源创建一个可释放资源', () => {
      const disposable1 = { dispose: jest.fn() };
      const disposable2 = { dispose: jest.fn() };
      const composite = Disposable.from(disposable1, disposable2);
      
      composite.dispose();
      expect(disposable1.dispose).toHaveBeenCalled();
      expect(disposable2.dispose).toHaveBeenCalled();
    });
  });

  describe('CancellationToken和CancellationTokenSource', () => {
    test('应该能够创建取消令牌源', () => {
      const source = new CancellationTokenSource();
      expect(source.token).toBeInstanceOf(CancellationToken);
      expect(source.isCancellationRequested).toBe(false);
    });

    test('应该能够取消操作', () => {
      const source = new CancellationTokenSource();
      const token = source.token;
      let cancelled = false;
      
      token.onCancellationRequested(() => {
        cancelled = true;
      });
      
      source.cancel();
      expect(token.isCancellationRequested).toBe(true);
      expect(source.isCancellationRequested).toBe(true);
      expect(cancelled).toBe(true);
    });

    test('应该能够释放资源', () => {
      const source = new CancellationTokenSource();
      source.dispose();
      expect(source.isCancellationRequested).toBe(true);
    });
  });

  describe('枚举类型', () => {
    test('应该定义正确的补全项类型', () => {
      expect(CompletionItemKind.Text).toBe(0);
      expect(CompletionItemKind.Function).toBe(2);
      expect(CompletionItemKind.Class).toBe(6);
    });

    test('应该定义正确的诊断严重程度', () => {
      expect(DiagnosticSeverity.Error).toBe(0);
      expect(DiagnosticSeverity.Warning).toBe(1);
      expect(DiagnosticSeverity.Information).toBe(2);
      expect(DiagnosticSeverity.Hint).toBe(3);
    });

    test('应该定义正确的代码操作类型', () => {
      expect(CodeActionKind.QuickFix.value).toBe('quickfix');
      expect(CodeActionKind.RefactorRewrite.value).toBe('refactor.rewrite');
    });

    test('应该定义正确的文件类型', () => {
      expect(FileType.File).toBe(1);
      expect(FileType.Directory).toBe(2);
      expect(FileType.SymbolicLink).toBe(64);
    });
  });
});