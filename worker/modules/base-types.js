const path = require("path");
const { EventEmitter } = require("events");
const { configManager } = require('./config');

/**
 * 扩展EventEmitter以支持VSCode风格的事件监听
 */
class VSCodeEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
  
  /**
   * 获取事件监听器
   * @returns {Function} 事件监听器函数
   */
  get event() {
    return (callback) => {
      this.on('fire', callback);
      return { dispose: () => this.removeListener('fire', callback) };
    };
  }
  
  /**
   * 触发事件
   * @param {...any} args 事件参数
   */
  fire(...args) {
    this.emit('fire', ...args);
  }
}

/**
 * URI类 - 表示统一资源标识符
 */
class Uri {
  /**
   * 创建URI实例
   * @param {string} fsPath 文件系统路径
   * @param {string} scheme URI方案，默认为"file"
   */
  constructor(fsPath, scheme = "file") {
    this.fsPath = fsPath;
    this.path = fsPath;
    this.scheme = scheme;
    // 存储原始路径，用于 joinPath 操作
    this._originalPath = fsPath;
  }

  /**
   * 从文件路径创建URI
   * @param {string} p 文件路径
   * @returns {Uri} URI实例
   */
  static file(p) {
    // 使用配置管理器解析路径
    const resolvedPath = configManager.resolvePath(p);
    const uri = new Uri(resolvedPath);
    // 存储原始路径，用于 joinPath 操作
    uri._originalPath = p;
    return uri;
  }

  /**
   * 解析URI字符串
   * @param {string} p URI字符串
   * @returns {Uri} URI实例
   */
  static parse(p) {
    // 如果是URI字符串，提取路径部分
    if (typeof p === 'string' && p.includes('://')) {
      const match = p.match(/^file:\/\/(.+)$/);
      if (match) {
        // 使用配置管理器解析路径
        const resolvedPath = configManager.resolvePath(match[1]);
        return new Uri(resolvedPath, 'file');
      }
      // 对于其他URI方案，直接创建
      const schemeEnd = p.indexOf('://');
      const scheme = p.substring(0, schemeEnd);
      const fsPath = p.substring(schemeEnd + 3);
      return new Uri(fsPath, scheme);
    }
    
    // 如果不是URI字符串，使用配置管理器解析路径
    const resolvedPath = configManager.resolvePath(p);
    return new Uri(resolvedPath);
  }

  /**
   * 连接路径
   * @param {Uri} base 基础URI
   * @param {...string} segments 路径段
   * @returns {Uri} 新的URI实例
   */
  static joinPath(base, ...segments) {
    // 如果有原始路径并且是绝对路径（以/开头），我们需要保持其相对性
    if (base._originalPath && base._originalPath.startsWith('/')) {
      // 使用 path.posix.join 来确保 Unix 风格的路径连接
      const newPath = path.posix.join(base._originalPath, ...segments);
      
      // 根据系统转换为正确的路径格式
      let finalPath;
      if (process.platform === 'win32') {
        // 在 Windows 上，将 Unix 风格路径转换为 Windows 风格
        finalPath = newPath.replace(/\//g, '\\');
      } else {
        // 在 Unix 系统上，保持 Unix 风格
        finalPath = newPath;
      }
      
      // 创建一个新的 URI 对象，但不通过构造函数，以避免任何路径解析
      const uri = Object.create(Uri.prototype);
      uri.fsPath = finalPath;
      uri.path = finalPath;
      uri.scheme = base.scheme;
      uri._originalPath = newPath;
      return uri;
    }
    // 对于其他路径，使用默认的 path.join
    const newPath = path.join(base.fsPath, ...segments);
    return new Uri(newPath, base.scheme);
  }
}

/**
 * Position类 - 表示文档中的位置
 */
class Position {
  /**
   * 创建位置实例
   * @param {number} line 行号（从0开始）
   * @param {number} character 字符位置（从0开始）
   */
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

/**
 * Range类 - 表示文档中的范围
 */
class Range {
  /**
   * 创建范围实例
   * @param {Position} start 起始位置
   * @param {Position} end 结束位置
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

/**
 * Selection类 - 表示文档中的选择范围
 */
class Selection extends Range {
  /**
   * 创建选择范围实例
   * @param {Position} start 起始位置
   * @param {Position} end 结束位置
   */
  constructor(start, end) {
    super(start, end);
    this.anchor = start;
    this.active = end;
  }
}

/**
 * ThemeIcon类 - 表示主题图标
 */
class ThemeIcon {
  /**
   * 创建主题图标实例
   * @param {string} id 图标ID
   */
  constructor(id) {
    this.id = id;
  }
}

/**
 * CodeAction类 - 表示代码操作
 */
class CodeAction {
  /**
   * 创建代码操作实例
   * @param {string} title 操作标题
   * @param {any} kind 操作类型
   */
  constructor(title, kind) {
    this.title = title;
    this.kind = kind;
    this.command = undefined;
    this.edit = undefined;
    this.diagnostics = undefined;
    this.isPreferred = undefined;
    this.disabled = undefined;
  }
}

/**
 * Diagnostic类 - 表示诊断信息
 */
class Diagnostic {
  /**
   * 创建诊断信息实例
   * @param {Range} range 诊断范围
   * @param {string} message 诊断消息
   * @param {DiagnosticSeverity} severity 诊断严重程度
   */
  constructor(range, message, severity) {
    this.range = range;
    this.message = message;
    this.severity = severity || DiagnosticSeverity.Error;
    this.source = undefined;
    this.code = undefined;
    this.relatedInformation = undefined;
    this.tags = undefined;
  }
}

/**
 * DiagnosticRelatedInformation类 - 表示诊断相关信息
 */
class DiagnosticRelatedInformation {
  /**
   * 创建诊断相关信息实例
   * @param {Location} location 位置信息
   * @param {string} message 相关消息
   */
  constructor(location, message) {
    this.location = location;
    this.message = message;
  }
}

/**
 * CompletionItem类 - 表示补全项
 */
class CompletionItem {
  /**
   * 创建补全项实例
   * @param {string} label 补全项标签
   * @param {CompletionItemKind} kind 补全项类型
   */
  constructor(label, kind) {
    this.label = label;
    this.kind = kind;
    this.detail = undefined;
    this.documentation = undefined;
    this.sortText = undefined;
    this.filterText = undefined;
    this.insertText = undefined;
    this.textEdit = undefined;
    this.additionalTextEdits = undefined;
    this.commitCharacters = undefined;
    this.command = undefined;
    this.preselect = undefined;
  }
}

/**
 * CompletionItemKind枚举 - 补全项类型
 */
const CompletionItemKind = {
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
};

/**
 * Hover类 - 表示悬停信息
 */
class Hover {
  /**
   * 创建悬停信息实例
   * @param {any} contents 悬停内容
   * @param {Range} range 悬停范围
   */
  constructor(contents, range) {
    this.contents = contents;
    this.range = range;
  }
}

/**
 * Location类 - 表示位置信息
 */
class Location {
  /**
   * 创建位置信息实例
   * @param {Uri} uri URI
   * @param {Range|Position} rangeOrPosition 范围或位置
   */
  constructor(uri, rangeOrPosition) {
    this.uri = uri;
    if (rangeOrPosition instanceof Range) {
      this.range = rangeOrPosition;
    } else {
      this.range = new Range(rangeOrPosition, rangeOrPosition);
    }
  }
}

/**
 * CodeActionProvider接口 - 代码操作提供者
 */
class CodeActionProvider {
  constructor() {
    this.provideCodeActions = undefined;
  }
}

/**
 * CompletionItemProvider接口 - 补全项提供者
 */
class CompletionItemProvider {
  constructor() {
    this.provideCompletionItems = undefined;
    this.resolveCompletionItem = undefined;
  }
}

/**
 * HoverProvider接口 - 悬停信息提供者
 */
class HoverProvider {
  constructor() {
    this.provideHover = undefined;
  }
}

/**
 * DefinitionProvider接口 - 定义提供者
 */
class DefinitionProvider {
  constructor() {
    this.provideDefinition = undefined;
  }
}

/**
 * DocumentFormattingEditProvider接口 - 文档格式化提供者
 */
class DocumentFormattingEditProvider {
  constructor() {
    this.provideDocumentFormattingEdits = undefined;
  }
}

/**
 * CodeLensProvider接口 - 代码镜头提供者
 */
class CodeLensProvider {
  constructor() {
    this.provideCodeLenses = undefined;
    this.resolveCodeLens = undefined;
  }
}

/**
 * FileType枚举 - 文件类型
 */
const FileType = {
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
};

/**
 * DiagnosticSeverity枚举 - 诊断严重程度
 */
const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

/**
 * OverviewRulerLane枚举 - 概览标尺车道
 */
const OverviewRulerLane = {
  Left: 1,
  Center: 2,
  Right: 4,
  Full: 7,
};

/**
 * CodeActionKind枚举 - 代码操作类型
 */
const CodeActionKind = {
  QuickFix: { value: "quickfix" },
  RefactorRewrite: { value: "refactor.rewrite" },
};

/**
 * Disposable类 - 可释放资源
 */
class Disposable {
  /**
   * 创建可释放资源实例
   * @param {Function} callOnDispose 释放时调用的函数
   */
  constructor(callOnDispose) {
    this._callOnDispose = callOnDispose;
    this._isDisposed = false;
  }

  /**
   * 释放资源
   */
  dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      if (this._callOnDispose) {
        this._callOnDispose();
      }
    }
  }

  /**
   * 获取资源是否已释放
   * @returns {boolean} 是否已释放
   */
  get isDisposed() {
    return this._isDisposed;
  }

  /**
   * 从多个可释放资源创建一个可释放资源
   * @param {...Disposable} disposables 可释放资源列表
   * @returns {Disposable} 新的可释放资源
   */
  static from(...disposables) {
    return new Disposable(() => {
      disposables.forEach(d => d.dispose());
    });
  }
}

/**
 * CancellationToken类 - 取消令牌
 */
class CancellationToken {
  /**
   * 创建取消令牌实例
   * @param {CancellationTokenSource} source 取消令牌源
   */
  constructor(source) {
    this._source = source;
    this._isCancellationRequested = false;
  }

  /**
   * 获取是否已请求取消
   * @returns {boolean} 是否已请求取消
   */
  get isCancellationRequested() {
    return this._isCancellationRequested;
  }

  /**
   * 监听取消请求
   * @param {Function} callback 取消时调用的回调函数
   * @returns {Disposable} 可释放资源
   */
  onCancellationRequested(callback) {
    return this._source.onCancellationRequested(callback);
  }

  /**
   * 取消操作
   */
  cancel() {
    this._isCancellationRequested = true;
    if (this._source) {
      this._source.cancel();
    }
  }
}

/**
 * CancellationTokenSource类 - 取消令牌源
 */
class CancellationTokenSource {
  constructor() {
    this._token = new CancellationToken(this);
    this._isCancelled = false;
    this._emitter = new VSCodeEventEmitter();
  }

  /**
   * 获取取消令牌
   * @returns {CancellationToken} 取消令牌
   */
  get token() {
    return this._token;
  }

  /**
   * 获取是否已请求取消
   * @returns {boolean} 是否已请求取消
   */
  get isCancellationRequested() {
    return this._isCancelled;
  }

  /**
   * 监听取消请求
   * @param {Function} callback 取消时调用的回调函数
   * @returns {Disposable} 可释放资源
   */
  onCancellationRequested(callback) {
    return this._emitter.event(callback);
  }

  /**
   * 取消操作
   */
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      this._token.cancel();
      this._emitter.fire();
    }
  }

  /**
   * 释放资源
   */
  dispose() {
    this.cancel();
    this._emitter.removeAllListeners();
  }
}

/**
 * MarkdownString类 - Markdown字符串
 */
class MarkdownString {
  /**
   * 创建Markdown字符串实例
   * @param {string} value 初始值
   */
  constructor(value = '') {
    this.value = value;
    this.isTrusted = false;
    this.supportHtml = false;
    this.baseUri = undefined;
  }

  /**
   * 追加文本
   * @param {string} value 要追加的文本
   * @returns {MarkdownString} 当前实例
   */
  appendText(value) {
    // 转义Markdown特殊字符
    this.value += value.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
    return this;
  }

  /**
   * 追加Markdown
   * @param {string} value 要追加的Markdown
   * @returns {MarkdownString} 当前实例
   */
  appendMarkdown(value) {
    this.value += value;
    return this;
  }

  /**
   * 追加代码块
   * @param {string} code 代码
   * @param {string} language 语言
   * @returns {MarkdownString} 当前实例
   */
  appendCodeblock(code, language = '') {
    this.value += '\n```' + language + '\n' + code + '\n```\n';
    return this;
  }
}

/**
 * TextEdit类 - 文本编辑
 */
class TextEdit {
  /**
   * 创建替换文本编辑
   * @param {Range} range 范围
   * @param {string} newText 新文本
   * @returns {TextEdit} 文本编辑实例
   */
  static replace(range, newText) {
    return new TextEdit(range, newText);
  }

  /**
   * 创建插入文本编辑
   * @param {Position} position 位置
   * @param {string} newText 新文本
   * @returns {TextEdit} 文本编辑实例
   */
  static insert(position, newText) {
    return new TextEdit(new Range(position, position), newText);
  }

  /**
   * 创建删除文本编辑
   * @param {Range} range 范围
   * @returns {TextEdit} 文本编辑实例
   */
  static delete(range) {
    return new TextEdit(range, '');
  }

  /**
   * 创建文本编辑实例
   * @param {Range} range 范围
   * @param {string} newText 新文本
   */
  constructor(range, newText) {
    this.range = range;
    this.newText = newText;
  }
}

/**
 * ExtensionMode枚举 - 扩展模式
 */
const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3
};

/**
 * UIKind枚举 - UI类型
 */
const UIKind = {
  Desktop: 1,
  Web: 2
};

/**
 * TextDocumentSaveReason枚举 - 文档保存原因
 */
const TextDocumentSaveReason = {
  Manual: 1,
  AfterDelay: 2,
  FocusOut: 3
};

/**
 * ConfigurationTarget枚举 - 配置目标
 */
const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

/**
 * ProgressLocation枚举 - 进度位置
 */
const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15
};

/**
 * StatusBarAlignment枚举 - 状态栏对齐方式
 */
const StatusBarAlignment = {
  Left: 1,
  Right: 2
};

module.exports = {
  // 类
  VSCodeEventEmitter,
  Uri,
  Position,
  Range,
  Selection,
  ThemeIcon,
  CodeAction,
  Diagnostic,
  DiagnosticRelatedInformation,
  CompletionItem,
  Hover,
  Location,
  CodeActionProvider,
  CompletionItemProvider,
  HoverProvider,
  DefinitionProvider,
  DocumentFormattingEditProvider,
  CodeLensProvider,
  Disposable,
  CancellationToken,
  CancellationTokenSource,
  MarkdownString,
  TextEdit,
  
  // 常量
  FileType,
  DiagnosticSeverity,
  OverviewRulerLane,
  CodeActionKind,
  CompletionItemKind,
  ExtensionMode,
  UIKind,
  TextDocumentSaveReason,
  ConfigurationTarget,
  ProgressLocation,
  StatusBarAlignment
};