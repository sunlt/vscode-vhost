// worker/vscode-shim.js
const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");

// 扩展EventEmitter以支持VSCode风格的事件监听
class VSCodeEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
  
  get event() {
    return (callback) => {
      this.on('fire', callback);
      return { dispose: () => this.removeListener('fire', callback) };
    };
  }
  
  fire(...args) {
    this.emit('fire', ...args);
  }
}
const child_process = require("child_process");
const { createExtensionContext } = require("./vscode-extension-context");

// --- 基础类型 ---
class Uri {
  constructor(fsPath, scheme = "file") {
    this.fsPath = fsPath;
    this.path = fsPath;
    this.scheme = scheme;
  }
  static file(p) {
    return new Uri(path.resolve(p));
  }
  static parse(p) {
    return new Uri(path.resolve(p));
  }
  static joinPath(base, ...segments) {
    const newPath = path.join(base.fsPath, ...segments);
    return new Uri(newPath, base.scheme);
  }
}

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Selection extends Range {
  constructor(start, end) {
    super(start, end);
    this.anchor = start;
    this.active = end;
  }
}

class ThemeIcon {
  constructor(id) {
    this.id = id;
  }
}

class CodeAction {
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

// --- 语言功能相关类型定义 ---

// Diagnostic 类 - 诊断信息
class Diagnostic {
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

// DiagnosticRelatedInformation 类 - 诊断相关信息
class DiagnosticRelatedInformation {
  constructor(location, message) {
    this.location = location;
    this.message = message;
  }
}

// CompletionItem 类 - 补全项
class CompletionItem {
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

// CompletionItemKind 枚举
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

// Hover 类 - 悬停信息
class Hover {
  constructor(contents, range) {
    this.contents = contents;
    this.range = range;
  }
}

// Location 类 - 位置信息
class Location {
  constructor(uri, rangeOrPosition) {
    this.uri = uri;
    if (rangeOrPosition instanceof Range) {
      this.range = rangeOrPosition;
    } else {
      this.range = new Range(rangeOrPosition, rangeOrPosition);
    }
  }
}

// CodeActionProvider 接口 - 代码操作提供者
class CodeActionProvider {
  constructor() {
    this.provideCodeActions = undefined;
  }
}

// CompletionItemProvider 接口 - 补全项提供者
class CompletionItemProvider {
  constructor() {
    this.provideCompletionItems = undefined;
    this.resolveCompletionItem = undefined;
  }
}

// HoverProvider 接口 - 悬停信息提供者
class HoverProvider {
  constructor() {
    this.provideHover = undefined;
  }
}

// DefinitionProvider 接口 - 定义提供者
class DefinitionProvider {
  constructor() {
    this.provideDefinition = undefined;
  }
}

// DocumentFormattingEditProvider 接口 - 文档格式化提供者
class DocumentFormattingEditProvider {
  constructor() {
    this.provideDocumentFormattingEdits = undefined;
  }
}

// CodeLensProvider 接口 - 代码镜头提供者
class CodeLensProvider {
  constructor() {
    this.provideCodeLenses = undefined;
    this.resolveCodeLens = undefined;
  }
}

// 语言功能管理器
class LanguageFeatureManager {
  constructor() {
    this._providers = new Map();
    this._diagnosticCollections = new Map();
    this._disposables = [];
  }

  // 注册语言功能提供者
  registerProvider(featureType, selector, provider) {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    const key = `${featureType}:${JSON.stringify(selector)}`;
    if (!this._providers.has(key)) {
      this._providers.set(key, []);
    }

    const providers = this._providers.get(key);
    providers.push(provider);

    return {
      dispose: () => {
        const index = providers.indexOf(provider);
        if (index !== -1) {
          providers.splice(index, 1);
        }
        if (providers.length === 0) {
          this._providers.delete(key);
        }
      }
    };
  }

  // 获取语言功能提供者
  getProviders(featureType, document) {
    const matchingProviders = [];
    
    for (const [key, providers] of this._providers) {
      const [type, selectorStr] = key.split(':');
      if (type !== featureType) continue;

      try {
        const selector = JSON.parse(selectorStr);
        if (this._matchesSelector(document, selector)) {
          matchingProviders.push(...providers);
        }
      } catch (error) {
        console.warn(`Failed to parse selector: ${selectorStr}`, error);
      }
    }

    return matchingProviders;
  }

  // 检查文档是否匹配选择器
  _matchesSelector(document, selector) {
    if (!document) return false;

    // 语言匹配
    if (selector.language && document.languageId !== selector.language) {
      return false;
    }

    // 模式匹配
    if (selector.pattern) {
      const pattern = selector.pattern;
      const glob = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = new RegExp(`^${glob}$`);
      if (!regex.test(document.uri.fsPath)) {
        return false;
      }
    }

    // 方案匹配
    if (selector.scheme && document.uri.scheme !== selector.scheme) {
      return false;
    }

    return true;
  }

  // 创建诊断集合
  createDiagnosticCollection(name) {
    const collection = new Map();
    this._diagnosticCollections.set(name, collection);

    const disposable = {
      dispose: () => {
        this._diagnosticCollections.delete(name);
      }
    };

    this._disposables.push(disposable);

    return {
      name,
      
      // 设置诊断信息
      set: (uri, diagnostics) => {
        if (uri === undefined) {
          // 清空所有诊断信息
          collection.clear();
        } else if (Array.isArray(diagnostics)) {
          // 设置特定URI的诊断信息
          collection.set(uri.toString(), diagnostics);
          console.log(`[Diagnostics:${name}] Set ${diagnostics.length} diagnostics for ${uri.toString()}`);
        } else {
          // 设置多个URI的诊断信息
          for (const [u, diags] of Object.entries(diagnostics)) {
            collection.set(u, diags);
          }
        }
      },

      // 删除特定URI的诊断信息
      delete: (uri) => {
        collection.delete(uri.toString());
      },

      // 清空所有诊断信息
      clear: () => {
        collection.clear();
      },

      // 获取特定URI的诊断信息
      get: (uri) => {
        return collection.get(uri.toString()) || [];
      },

      // 获取所有URI
      keys: () => {
        return Array.from(collection.keys()).map(key => Uri.parse(key));
      },

      // 获取所有诊断信息
      forEach: (callback, thisArg) => {
        collection.forEach((diagnostics, uriString) => {
          callback.call(thisArg, Uri.parse(uriString), diagnostics, this);
        });
      },

      // 销毁诊断集合
      dispose: () => {
        disposable.dispose();
      }
    };
  }

  // 获取所有诊断信息
  getDiagnostics(uri) {
    const allDiagnostics = [];

    for (const [name, collection] of this._diagnosticCollections) {
      if (uri) {
        // 获取特定URI的诊断信息
        const diagnostics = collection.get(uri.toString()) || [];
        allDiagnostics.push(...diagnostics);
      } else {
        // 获取所有诊断信息
        for (const [uriString, diagnostics] of collection) {
          allDiagnostics.push(...diagnostics);
        }
      }
    }

    return allDiagnostics;
  }

  // 调用语言功能提供者
  async invokeProvider(featureType, document, ...args) {
    const providers = this.getProviders(featureType, document);
    const results = [];

    for (const provider of providers) {
      try {
        const methodName = this._getProviderMethodName(featureType);
        if (provider[methodName]) {
          const result = await provider[methodName](document, ...args);
          if (result) {
            results.push(result);
          }
        }
      } catch (error) {
        console.error(`Error invoking ${featureType} provider:`, error);
      }
    }

    return results;
  }

  // 获取提供者方法名
  _getProviderMethodName(featureType) {
    const methodMap = {
      'completion': 'provideCompletionItems',
      'hover': 'provideHover',
      'definition': 'provideDefinition',
      'formatting': 'provideDocumentFormattingEdits',
      'codeAction': 'provideCodeActions',
      'codeLens': 'provideCodeLenses'
    };
    return methodMap[featureType] || 'provide';
  }

  // 销毁所有资源
  dispose() {
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables = [];
    this._providers.clear();
    this._diagnosticCollections.clear();
  }
}

// --- 辅助类和类型定义 ---

// WorkspaceEdit 类 - 工作空间编辑操作
class WorkspaceEdit {
  constructor() {
    this._edits = new Map();
  }

  // 替换文本
  replace(uri, range, newText) {
    if (!this._edits.has(uri.toString())) {
      this._edits.set(uri.toString(), []);
    }
    this._edits.get(uri.toString()).push({
      type: 'replace',
      range,
      newText
    });
  }

  // 插入文本
  insert(uri, position, newText) {
    if (!this._edits.has(uri.toString())) {
      this._edits.set(uri.toString(), []);
    }
    this._edits.get(uri.toString()).push({
      type: 'insert',
      position,
      newText
    });
  }

  // 删除文本
  delete(uri, range) {
    if (!this._edits.has(uri.toString())) {
      this._edits.set(uri.toString(), []);
    }
    this._edits.get(uri.toString()).push({
      type: 'delete',
      range
    });
  }

  // 获取所有编辑操作
  get(uri) {
    return this._edits.get(uri.toString()) || [];
  }

  // 获取所有被编辑的URI
  size() {
    return this._edits.size;
  }

  // 检查是否有编辑操作
  has(uri) {
    return this._edits.has(uri.toString());
  }
}

// TextDocumentContentProvider 接口
class TextDocumentContentProvider {
  constructor() {
    this.onDidChangeEmitter = new EventEmitter();
  }

  // 提供文本内容
  async provideTextDocumentContent(uri) {
    throw new Error('provideTextDocumentContent must be implemented');
  }

  // 当内容变化时触发事件
  get onDidChange() {
    return this.onDidChangeEmitter.event;
  }
}

// ConfigurationChangeEvent 类
class ConfigurationChangeEvent {
  constructor(changedConfiguration) {
    this.affectsConfiguration = (section, scope) => {
      if (!changedConfiguration) return false;
      
      // 简单实现：检查配置是否在变更列表中
      if (typeof section === 'string') {
        return changedConfiguration.includes(section);
      }
      
      // 如果提供了scope，检查是否匹配
      if (scope) {
        return changedConfiguration.some(config =>
          config.startsWith(section) &&
          (config.includes(scope.uri.fsPath) || !scope.uri)
        );
      }
      
      return false;
    };
  }
}

// WorkspaceFoldersChangeEvent 类
class WorkspaceFoldersChangeEvent {
  constructor(added, removed) {
    this.added = added || [];
    this.removed = removed || [];
  }
}

// WorkspaceConfiguration 类
class WorkspaceConfiguration {
  constructor(configData = {}) {
    this._configData = configData;
  }

  // 获取配置值
  get(section, defaultValue) {
    if (!section) {
      return this._configData;
    }
    
    const parts = section.split('.');
    let value = this._configData;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }
    
    return value !== undefined ? value : defaultValue;
  }

  // 检查配置是否存在
  has(section) {
    if (!section) return true;
    
    const parts = section.split('.');
    let value = this._configData;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return false;
      }
    }
    
    return true;
  }

  // 更新配置值
  async update(section, value, configurationTarget) {
    if (!section) {
      throw new Error('Section is required');
    }
    
    const parts = section.split('.');
    let target = this._configData;
    
    // 导航到父对象
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in target) || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part];
    }
    
    // 设置值
    const lastPart = parts[parts.length - 1];
    target[lastPart] = value;
    
    // 触发配置变更事件
    if (workspace._onDidChangeConfigurationEmitter) {
      workspace._onDidChangeConfigurationEmitter.fire(new ConfigurationChangeEvent([section]));
    }
    
    return Promise.resolve();
  }

  // 检查配置
  inspect(section) {
    const defaultValue = undefined; // 默认值通常来自package.json
    const globalValue = this.get(section);
    const workspaceValue = this.get(section);
    const workspaceFolderValue = this.get(section);
    
    return {
      key: section,
      defaultValue,
      globalValue,
      workspaceValue,
      workspaceFolderValue
    };
  }
}

// TextEditor 相关类
class TextEditor {
  constructor(document, viewColumn) {
    this.document = document;
    this.viewColumn = viewColumn;
    this.selection = new Selection(new Position(0, 0), new Position(0, 0));
    this.options = {
      tabSize: 4,
      insertSpaces: true,
      cursorStyle: 'line',
      lineNumbers: 'on'
    };
  }

  edit(editBuilder) {
    // 简单实现，实际应该更复杂
    return true;
  }

  show(column) {
    this.viewColumn = column || this.viewColumn;
    return this;
  }

  hide() {
    return this;
  }
}

class TextDocument {
  constructor(uri, languageId, content) {
    this.uri = uri;
    this.languageId = languageId;
    this.version = 1;
    this._content = content || '';
    this._lines = this._content.split('\n');
  }

  get lineCount() {
    return this._lines.length;
  }

  lineAt(line) {
    const text = this._lines[line] || '';
    const range = new Range(
      new Position(line, 0),
      new Position(line, text.length)
    );
    return {
      lineNumber: line,
      text,
      range,
      rangeIncludingLineBreak: range,
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: !text.trim()
    };
  }

  getText(range) {
    if (!range) return this._content;
    
    const lines = [];
    for (let i = range.start.line; i <= range.end.line; i++) {
      const line = this._lines[i] || '';
      if (i === range.start.line && i === range.end.line) {
        lines.push(line.substring(range.start.character, range.end.character));
      } else if (i === range.start.line) {
        lines.push(line.substring(range.start.character));
      } else if (i === range.end.line) {
        lines.push(line.substring(0, range.end.character));
      } else {
        lines.push(line);
      }
    }
    return lines.join('\n');
  }

  getWordRangeAtPosition(position, regex) {
    const line = this._lines[position.line] || '';
    const wordRegex = regex || /[^\s\(\)\[\]\{\}\<\>\,\.\;\:\'\"\`\/\\]+/;
    const match = line.match(wordRegex);
    if (match && match.index <= position.character) {
      const start = match.index;
      const end = start + match[0].length;
      if (position.character >= start && position.character <= end) {
        return new Range(
          new Position(position.line, start),
          new Position(position.line, end)
        );
      }
    }
    return undefined;
  }
}

// Webview 相关类
class WebviewPanel {
  constructor(viewType, title, showOptions, options) {
    this.viewType = viewType;
    this.title = title;
    this.options = options || {};
    this._visible = true;
    this._disposed = false;
    this._onDidDisposeEmitter = new VSCodeEventEmitter();
    this._onDidChangeViewStateEmitter = new VSCodeEventEmitter();
    
    this.webview = {
      html: '',
      options: this.options,
      cspSource: '',
      asWebviewUri: (uri) => uri,
      postMessage: async (message) => {
        console.log('[WebviewPanel.postMessage]', message);
        return true;
      },
      onDidReceiveMessage: (callback) => {
        const emitter = new EventEmitter();
        emitter.on('message', callback);
        return { dispose: () => emitter.removeAllListeners('message') };
      }
    };
  }

  get visible() {
    return this._visible;
  }

  get active() {
    return this._visible;
  }

  reveal(viewColumn) {
    this._visible = true;
    this._onDidChangeViewStateEmitter.fire({ webviewPanel: this });
  }

  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      this._visible = false;
      this._onDidDisposeEmitter.fire();
      this._onDidDisposeEmitter.removeAllListeners();
      this._onDidChangeViewStateEmitter.removeAllListeners();
    }
  }

  onDidDispose(callback) {
    this._onDidDisposeEmitter.event(callback);
    return { dispose: () => this._onDidDisposeEmitter.removeListener('event', callback) };
  }

  onDidChangeViewState(callback) {
    this._onDidChangeViewStateEmitter.event(callback);
    return { dispose: () => this._onDidChangeViewStateEmitter.removeListener('event', callback) };
  }
}

// Tab 相关类
class Tab {
  constructor(input, viewColumn) {
    this.input = input;
    this.viewColumn = viewColumn;
    this.isActive = false;
    this.isDirty = false;
    this.isPinned = false;
    this.label = input.title || 'Untitled';
  }
}

class TabGroup {
  constructor(viewColumn) {
    this.viewColumn = viewColumn;
    this.isActive = viewColumn === 1; // 假设第一列是活动的
    this.tabs = [];
  }

  get activeTab() {
    return this.tabs.find(tab => tab.isActive);
  }
}

class TabGroups {
  constructor() {
    this._groups = [new TabGroup(1)]; // 默认有一个标签组
    this._onDidChangeTabsEmitter = new VSCodeEventEmitter();
    this._onDidChangeTabGroupsEmitter = new VSCodeEventEmitter();
  }

  get all() {
    return this._groups;
  }

  get activeTabGroup() {
    return this._groups.find(group => group.isActive) || this._groups[0];
  }

  onDidChangeTabs(callback) {
    this._onDidChangeTabsEmitter.event(callback);
    return { dispose: () => this._onDidChangeTabsEmitter.removeListener('event', callback) };
  }

  onDidChangeTabGroups(callback) {
    this._onDidChangeTabGroupsEmitter.event(callback);
    return { dispose: () => this._onDidChangeTabGroupsEmitter.removeListener('event', callback) };
  }
}

// --- 常量 ---
const FileType = {
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
};

const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

const OverviewRulerLane = {
  Left: 1,
  Center: 2,
  Right: 4,
  Full: 7,
};

const CodeActionKind = {
  QuickFix: { value: "quickfix" },
  RefactorRewrite: { value: "refactor.rewrite" },
};

// --- 基础类型和常量 ---

// Disposable 类 - 可释放资源
class Disposable {
  constructor(callOnDispose) {
    this._callOnDispose = callOnDispose;
    this._isDisposed = false;
  }

  dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      if (this._callOnDispose) {
        this._callOnDispose();
      }
    }
  }

  get isDisposed() {
    return this._isDisposed;
  }

  static from(...disposables) {
    return new Disposable(() => {
      disposables.forEach(d => d.dispose());
    });
  }
}

// CancellationToken 类 - 取消令牌
class CancellationToken {
  constructor(source) {
    this._source = source;
    this._isCancellationRequested = false;
  }

  get isCancellationRequested() {
    return this._isCancellationRequested;
  }

  onCancellationRequested(callback) {
    return this._source.onCancellationRequested(callback);
  }

  cancel() {
    this._isCancellationRequested = true;
    if (this._source) {
      this._source.cancel();
    }
  }
}

// CancellationTokenSource 类 - 取消令牌源
class CancellationTokenSource {
  constructor() {
    this._token = new CancellationToken(this);
    this._isCancelled = false;
    this._emitter = new VSCodeEventEmitter();
  }

  get token() {
    return this._token;
  }

  get isCancellationRequested() {
    return this._isCancelled;
  }

  onCancellationRequested(callback) {
    return this._emitter.event(callback);
  }

  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      this._token.cancel();
      this._emitter.fire();
    }
  }

  dispose() {
    this.cancel();
    this._emitter.removeAllListeners();
  }
}

// MarkdownString 类 - Markdown字符串
class MarkdownString {
  constructor(value = '') {
    this.value = value;
    this.isTrusted = false;
    this.supportHtml = false;
    this.baseUri = undefined;
  }

  appendText(value) {
    // 转义Markdown特殊字符
    this.value += value.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
    return this;
  }

  appendMarkdown(value) {
    this.value += value;
    return this;
  }

  appendCodeblock(code, language = '') {
    this.value += '\n```' + language + '\n' + code + '\n```\n';
    return this;
  }
}

// TextEdit 类 - 文本编辑
class TextEdit {
  static replace(range, newText) {
    return new TextEdit(range, newText);
  }

  static insert(position, newText) {
    return new TextEdit(new Range(position, position), newText);
  }

  static delete(range) {
    return new TextEdit(range, '');
  }

  constructor(range, newText) {
    this.range = range;
    this.newText = newText;
  }
}

// --- 枚举类型定义 ---

// ExtensionMode 枚举
const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3
};

// UIKind 枚举
const UIKind = {
  Desktop: 1,
  Web: 2
};

// TextDocumentSaveReason 枚举
const TextDocumentSaveReason = {
  Manual: 1,
  AfterDelay: 2,
  FocusOut: 3
};

// ConfigurationTarget 枚举
const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

// ProgressLocation 枚举
const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15
};

// StatusBarAlignment 枚举
const StatusBarAlignment = {
  Left: 1,
  Right: 2
};

// --- ExtensionContext 相关类 ---

// Memento 类 - 用于存储扩展状态
class Memento {
  constructor(file) {
    this.file = file;
    this.data = {};
    if (fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        this.data = {};
      }
    }
  }

  get(key, defaultValue) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  async update(key, value) {
    this.data[key] = value;
    // 确保目录存在
    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }
  
  keys() {
    return Object.keys(this.data);
  }
}

// ExtensionContext 类 - 扩展上下文
class ExtensionContext {
  constructor(extensionPath, extensionId) {
    this.extensionPath = extensionPath;
    this.extensionUri = Uri.file(extensionPath);
    this.extensionId = extensionId || 'unknown.extension';
    
    // 订阅数组
    this.subscriptions = [];
    
    // 状态存储
    const storageFile = path.join(extensionPath, ".vscode-shim-globalState.json");
    const workspaceFile = path.join(process.cwd(), ".vscode-shim-workspaceState.json");
    this.globalState = new Memento(storageFile);
    this.workspaceState = new Memento(workspaceFile);
    
    // 存储URI
    this.storageUri = Uri.file(path.join(process.cwd(), ".vscode-shim-storage"));
    this.globalStorageUri = Uri.file(path.join(process.cwd(), ".vscode-shim-global"));
    this.workspaceStorageUri = Uri.file(path.join(process.cwd(), ".vscode-shim-workspace"));
    this.logUri = Uri.file(path.join(process.cwd(), ".vscode-shim-logs"));
    
    // 环境变量集合
    this.environmentVariableCollection = {
      replace: (variable, value) => {
        console.log(`[ExtensionContext] Environment variable replaced: ${variable}=${value}`);
      },
      append: (variable, value) => {
        console.log(`[ExtensionContext] Environment variable appended: ${variable}+=${value}`);
      },
      prepend: (variable, value) => {
        console.log(`[ExtensionContext] Environment variable prepended: ${variable}=${value}${variable}`);
      },
      get: (variable) => {
        console.log(`[ExtensionContext] Environment variable get: ${variable}`);
        return process.env[variable];
      },
      forEach: (callback) => {
        console.log(`[ExtensionContext] Environment variable forEach`);
        Object.entries(process.env).forEach(([key, value]) => callback(key, value));
      },
      delete: (variable) => {
        console.log(`[ExtensionContext] Environment variable deleted: ${variable}`);
        delete process.env[variable];
      },
      clear: () => {
        console.log(`[ExtensionContext] Environment variables cleared`);
        // 在实际环境中，这里会清除所有环境变量
        // 在我们的模拟环境中，我们只记录日志
      }
    };
    
    // 扩展模式
    this.extensionMode = ExtensionMode.Development;
    
    // 扩展信息
    this.extension = {
      id: this.extensionId,
      extensionUri: this.extensionUri,
      extensionPath: this.extensionPath,
      isActive: true,
      packageJSON: {},
      exports: undefined,
      activate: async () => {}
    };
    
    // 秘密存储
    this.secrets = {
      get: async (key) => {
        console.log(`[ExtensionContext] Secret get: ${key}`);
        return undefined;
      },
      store: async (key, value) => {
        console.log(`[ExtensionContext] Secret store: ${key}`);
        // 在实际环境中，这里会安全地存储秘密
      },
      delete: async (key) => {
        console.log(`[ExtensionContext] Secret delete: ${key}`);
        // 在实际环境中，这里会删除秘密
      },
      onDidChange: (callback) => {
        console.log(`[ExtensionContext] Secret onDidChange`);
        // 返回一个可释放的对象
        return { dispose: () => {} };
      }
    };
  }
  
  // 将相对路径转换为绝对路径
  asAbsolutePath(relativePath) {
    return path.join(this.extensionPath, relativePath);
  }
  
  // 订阅资源
  subscribe(disposable) {
    if (disposable && typeof disposable.dispose === 'function') {
      this.subscriptions.push(disposable);
    }
  }
  
  // 清理所有订阅
  dispose() {
    this.subscriptions.forEach(disposable => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    });
    this.subscriptions = [];
  }
}

// --- workspace ---
const workspace = {
  // 工作空间文件夹
  workspaceFolders: [
    { uri: Uri.file(process.cwd()), name: path.basename(process.cwd()), index: 0 },
  ],
  
  // 事件发射器
  _onDidChangeWorkspaceFoldersEmitter: new VSCodeEventEmitter(),
  _onDidChangeConfigurationEmitter: new VSCodeEventEmitter(),
  _onDidOpenTextDocumentEmitter: new VSCodeEventEmitter(),
  _textDocumentContentProviders: new Map(),
  _configData: {},
  
  // 获取工作空间文件夹
  getWorkspaceFolder: (uri) => {
    if (!uri) return undefined;
    const fsPath = uri.fsPath || uri;
    return workspace.workspaceFolders.find((f) =>
      fsPath.startsWith(f.uri.fsPath)
    );
  },
  
  // 获取包含URI的工作空间文件夹
  asRelativePath: (pathOrUri, includeWorkspaceFolder) => {
    let fsPath;
    if (typeof pathOrUri === 'string') {
      fsPath = path.resolve(pathOrUri);
    } else {
      fsPath = pathOrUri.fsPath;
    }
    
    const folder = workspace.getWorkspaceFolder(Uri.file(fsPath));
    if (!folder) return fsPath;
    
    const relative = path.relative(folder.uri.fsPath, fsPath);
    if (includeWorkspaceFolder) {
      return path.join(folder.name, relative);
    }
    return relative;
  },
  
  // 监听工作空间文件夹变化
  onDidChangeWorkspaceFolders: (cb) => {
    workspace._onDidChangeWorkspaceFoldersEmitter.event(cb);
    return { dispose: () => workspace._onDidChangeWorkspaceFoldersEmitter.removeListener('event', cb) };
  },
  
  // 获取配置
  getConfiguration: (section, scope) => {
    // 如果提供了scope，尝试从特定范围获取配置
    let configData = workspace._configData;
    
    // 简单实现：从JSON文件加载配置
    try {
      const configPath = path.join(process.cwd(), '.vscode', 'settings.json');
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        configData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.warn('Failed to load configuration:', error);
    }
    
    return new WorkspaceConfiguration(configData);
  },
  
  // 监听配置变化
  onDidChangeConfiguration: (cb) => {
    workspace._onDidChangeConfigurationEmitter.event(cb);
    return { dispose: () => workspace._onDidChangeConfigurationEmitter.removeListener('event', cb) };
  },
  
  // 监听文本文档打开事件
  onDidOpenTextDocument: (cb) => {
    workspace._onDidOpenTextDocumentEmitter.event(cb);
    return { dispose: () => workspace._onDidOpenTextDocumentEmitter.removeListener('event', cb) };
  },
  
  // 注册文本文档内容提供者
  registerTextDocumentContentProvider: (scheme, provider) => {
    if (!scheme || typeof scheme !== 'string') {
      throw new Error('Scheme is required and must be a string');
    }
    
    if (!provider || typeof provider.provideTextDocumentContent !== 'function') {
      throw new Error('Provider must implement provideTextDocumentContent');
    }
    
    workspace._textDocumentContentProviders.set(scheme, provider);
    
    // 监听提供者的变化事件
    if (provider.onDidChange) {
      provider.onDidChange((uri) => {
        // 触发文档内容变化事件
        console.log(`Text document content changed for ${uri.toString()}`);
      });
    }
    
    return {
      dispose: () => {
        workspace._textDocumentContentProviders.delete(scheme);
      }
    };
  },
  
  // 应用工作空间编辑
  applyEdit: async (edit) => {
    if (!edit || !(edit instanceof WorkspaceEdit)) {
      throw new Error('Edit must be a WorkspaceEdit instance');
    }
    
    // 简单实现：遍历所有编辑操作
    for (const [uriString, edits] of edit._edits) {
      const uri = Uri.parse(uriString);
      
      try {
        // 读取文件内容
        let content = '';
        try {
          content = await fs.promises.readFile(uri.fsPath, 'utf8');
        } catch (error) {
          // 文件不存在，创建新文件
          content = '';
        }
        
        // 应用编辑
        const lines = content.split('\n');
        
        // 按照从后往前的顺序应用编辑，以避免位置偏移
        edits.sort((a, b) => {
          const aPos = a.range ? a.range.start.line : a.position.line;
          const bPos = b.range ? b.range.start.line : b.position.line;
          return bPos - aPos;
        });
        
        for (const editOp of edits) {
          if (editOp.type === 'replace') {
            const { start, end } = editOp.range;
            // 简化实现：直接替换指定范围的文本
            if (start.line === end.line) {
              // 同一行内的替换
              const line = lines[start.line] || '';
              lines[start.line] = line.substring(0, start.character) +
                                 editOp.newText +
                                 line.substring(end.character);
            } else {
              // 跨行替换
              const startLine = lines[start.line] || '';
              const endLine = lines[end.line] || '';
              const newLine = startLine.substring(0, start.character) +
                             editOp.newText +
                             endLine.substring(end.character);
              
              // 删除中间的行，替换为新行
              lines.splice(start.line, end.line - start.line + 1, newLine);
            }
          } else if (editOp.type === 'insert') {
            const line = lines[editOp.position.line] || '';
            lines[editOp.position.line] = line.substring(0, editOp.position.character) +
                                        editOp.newText +
                                        line.substring(editOp.position.character);
          } else if (editOp.type === 'delete') {
            const { start, end } = editOp.range;
            if (start.line === end.line) {
              // 同一行内的删除
              const line = lines[start.line] || '';
              lines[start.line] = line.substring(0, start.character) +
                                 line.substring(end.character);
            } else {
              // 跨行删除
              const startLine = lines[start.line] || '';
              const endLine = lines[end.line] || '';
              const newLine = startLine.substring(0, start.character) +
                             endLine.substring(end.character);
              
              // 删除中间的行，替换为新行
              lines.splice(start.line, end.line - start.line + 1, newLine);
            }
          }
        }
        
        // 写入文件
        await fs.promises.writeFile(uri.fsPath, lines.join('\n'), 'utf8');
      } catch (error) {
        console.error(`Failed to apply edit to ${uri.fsPath}:`, error);
        return false;
      }
    }
    
    return true;
  },
  
  // 打开文本文档
  openTextDocument: async (uriOrFileName) => {
    let uri;
    
    if (typeof uriOrFileName === 'string') {
      // 如果是字符串，可能是文件名或URI字符串
      if (uriOrFileName.includes('://')) {
        uri = Uri.parse(uriOrFileName);
      } else {
        uri = Uri.file(path.resolve(uriOrFileName));
      }
    } else if (uriOrFileName instanceof Uri) {
      uri = uriOrFileName;
    } else {
      throw new Error('Invalid argument: must be a string or Uri');
    }
    
    try {
      // 检查是否有内容提供者
      const provider = workspace._textDocumentContentProviders.get(uri.scheme);
      let content;
      let languageId = 'plaintext';
      
      if (provider) {
        // 使用内容提供者获取内容
        content = await provider.provideTextDocumentContent(uri);
        languageId = uri.scheme;
      } else {
        // 从文件系统读取
        content = await fs.promises.readFile(uri.fsPath, 'utf8');
        
        // 根据文件扩展名确定语言ID
        const ext = path.extname(uri.fsPath).toLowerCase();
        const languageMap = {
          '.js': 'javascript',
          '.ts': 'typescript',
          '.json': 'json',
          '.html': 'html',
          '.css': 'css',
          '.md': 'markdown',
          '.py': 'python',
          '.java': 'java',
          '.cpp': 'cpp',
          '.c': 'c',
          '.h': 'c',
          '.go': 'go',
          '.rs': 'rust',
          '.php': 'php',
          '.rb': 'ruby',
          '.sh': 'shell',
          '.sql': 'sql',
          '.xml': 'xml',
          '.yaml': 'yaml',
          '.yml': 'yaml',
          '.toml': 'toml',
          '.ini': 'ini',
          '.dockerfile': 'dockerfile',
          '.vue': 'vue',
          '.jsx': 'javascriptreact',
          '.tsx': 'typescriptreact',
        };
        languageId = languageMap[ext] || 'plaintext';
      }
      
      // 创建文本文档
      const document = new TextDocument(uri, languageId, content);
      
      // 触发文档打开事件
      workspace._onDidOpenTextDocumentEmitter.fire(document);
      
      return document;
    } catch (error) {
      console.error(`Failed to open text document ${uri.fsPath}:`, error);
      throw error;
    }
  },
  
  // 创建文件系统监视器
  createFileSystemWatcher: (globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents) => {
    // 解析glob模式
    let basePath = process.cwd();
    let pattern = '**/*';
    
    if (typeof globPattern === 'string') {
      // 简单实现：如果包含路径分隔符，提取基础路径
      const parts = globPattern.split(path.sep);
      if (parts.length > 1) {
        // 如果是绝对路径，直接使用；否则相对于当前工作目录
        if (path.isAbsolute(globPattern)) {
          basePath = path.dirname(globPattern);
        } else {
          basePath = path.resolve(process.cwd(), ...parts.slice(0, -1));
        }
        pattern = parts[parts.length - 1];
      } else {
        pattern = globPattern;
      }
    } else if (globPattern instanceof Uri) {
      basePath = path.dirname(globPattern.fsPath);
      pattern = path.basename(globPattern.fsPath);
    }
    
    const emitter = new EventEmitter();
    let watcher;
    
    try {
      watcher = fs.watch(basePath, { recursive: true }, (event, filename) => {
        if (!filename) return;
        
        const fullPath = path.join(basePath, filename);
        
        // 简单的glob匹配
        const isMatch = pattern === '**/*' ||
                       pattern === '*' ||
                       filename.includes(pattern.replace('*', '')) ||
                       path.extname(filename) === pattern;
        
        if (!isMatch) return;
        
        const uri = Uri.file(fullPath);
        
        try {
          const stats = fs.statSync(fullPath);
          
          if (event === 'rename') {
            if (stats.isFile() || stats.isDirectory()) {
              if (!ignoreCreateEvents) {
                emitter.emit('create', uri);
              }
            } else {
              if (!ignoreDeleteEvents) {
                emitter.emit('delete', uri);
              }
            }
          } else if (event === 'change' && !ignoreChangeEvents) {
            emitter.emit('change', uri);
          }
        } catch (error) {
          // 文件可能已被删除
          if (!ignoreDeleteEvents) {
            emitter.emit('delete', uri);
          }
        }
      });
    } catch (error) {
      console.error('Failed to create file system watcher:', error);
      // 返回一个空的监视器
      return {
        onDidCreate: () => ({ dispose: () => {} }),
        onDidChange: () => ({ dispose: () => {} }),
        onDidDelete: () => ({ dispose: () => {} }),
        dispose: () => {}
      };
    }
    
    return {
      onDidCreate: (cb) => {
        if (!ignoreCreateEvents) {
          emitter.on('create', cb);
          return { dispose: () => emitter.removeAllListeners('create') };
        }
        return { dispose: () => {} };
      },
      onDidChange: (cb) => {
        if (!ignoreChangeEvents) {
          emitter.on('change', cb);
          return { dispose: () => emitter.removeAllListeners('change') };
        }
        return { dispose: () => {} };
      },
      onDidDelete: (cb) => {
        if (!ignoreDeleteEvents) {
          emitter.on('delete', cb);
          return { dispose: () => emitter.removeAllListeners('delete') };
        }
        return { dispose: () => {} };
      },
      dispose: () => {
        if (watcher) {
          watcher.close();
        }
        emitter.removeAllListeners();
      }
    };
  },
  
  // 文件系统操作
  fs: {
    // 读取文件
    readFile: async (uri) => {
      try {
        return await fs.promises.readFile(uri.fsPath);
      } catch (error) {
        console.error(`Failed to read file ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    // 写入文件
    writeFile: async (uri, content) => {
      try {
        await fs.promises.writeFile(uri.fsPath, content);
      } catch (error) {
        console.error(`Failed to write file ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    // 删除文件
    delete: async (uri, options) => {
      try {
        if (options && options.recursive && options.useTrash) {
          // 简单实现：不支持回收站
          console.warn('Trash option is not supported, deleting permanently');
        }
        
        if (options && options.recursive) {
          await fs.promises.rm(uri.fsPath, { recursive: true, force: true });
        } else {
          await fs.promises.unlink(uri.fsPath);
        }
      } catch (error) {
        console.error(`Failed to delete ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    // 重命名文件
    rename: async (source, target, options) => {
      try {
        await fs.promises.rename(source.fsPath, target.fsPath);
      } catch (error) {
        console.error(`Failed to rename ${source.fsPath} to ${target.fsPath}:`, error);
        throw error;
      }
    },
    
    // 复制文件
    copy: async (source, target, options) => {
      try {
        await fs.promises.copyFile(source.fsPath, target.fsPath);
      } catch (error) {
        console.error(`Failed to copy ${source.fsPath} to ${target.fsPath}:`, error);
        throw error;
      }
    },
    
    // 创建目录
    createDirectory: async (uri) => {
      try {
        await fs.promises.mkdir(uri.fsPath, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    // 读取目录
    readDirectory: async (uri) => {
      try {
        const entries = await fs.promises.readdir(uri.fsPath, { withFileTypes: true });
        return entries.map(entry => [
          entry.name,
          entry.isFile() ? FileType.File :
          entry.isDirectory() ? FileType.Directory :
          FileType.SymbolicLink
        ]);
      } catch (error) {
        console.error(`Failed to read directory ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    // 获取文件状态
    stat: async (uri) => {
      try {
        const s = await fs.promises.stat(uri.fsPath);
        return {
          type: s.isFile() ? FileType.File :
                s.isDirectory() ? FileType.Directory :
                FileType.SymbolicLink,
          ctime: s.ctimeMs,
          mtime: s.mtimeMs,
          size: s.size,
        };
      } catch (error) {
        console.error(`Failed to stat ${uri.fsPath}:`, error);
        throw error;
      }
    }
  },
};

// --- window ---
const window = (() => {
  // 内部状态
  const _textEditors = [];
  let _activeTextEditor = null;
  const _onDidChangeActiveTextEditorEmitter = new VSCodeEventEmitter();
  const _onDidChangeVisibleTextEditorsEmitter = new VSCodeEventEmitter();
  const _onDidChangeTextEditorSelectionEmitter = new VSCodeEventEmitter();
  const _onDidChangeTextEditorOptionsEmitter = new VSCodeEventEmitter();
  const _tabGroups = new TabGroups();
  const _webviewViewProviders = new Map();
  
  // ViewColumn 常量
  const ViewColumn = {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
  };

  return {
    get activeTextEditor() {
      return _activeTextEditor;
    },
    
    set activeTextEditor(editor) {
      if (_activeTextEditor !== editor) {
        _activeTextEditor = editor;
        _onDidChangeActiveTextEditorEmitter.fire(editor);
      }
    },
    
    get visibleTextEditors() {
      return [..._textEditors];
    },
    
    ViewColumn,
    
    // 事件监听器
    onDidChangeActiveTextEditor: (callback) => {
      _onDidChangeActiveTextEditorEmitter.event(callback);
      return { dispose: () => _onDidChangeActiveTextEditorEmitter.removeListener('event', callback) };
    },
    
    onDidChangeVisibleTextEditors: (callback) => {
      _onDidChangeVisibleTextEditorsEmitter.event(callback);
      return { dispose: () => _onDidChangeVisibleTextEditorsEmitter.removeListener('event', callback) };
    },
    
    onDidChangeTextEditorSelection: (callback) => {
      _onDidChangeTextEditorSelectionEmitter.event(callback);
      return { dispose: () => _onDidChangeTextEditorSelectionEmitter.removeListener('event', callback) };
    },
    
    onDidChangeTextEditorOptions: (callback) => {
      _onDidChangeTextEditorOptionsEmitter.event(callback);
      return { dispose: () => _onDidChangeTextEditorOptionsEmitter.removeListener('event', callback) };
    },
    
    // 消息显示API（带按钮支持）
    showErrorMessage: async (message, ...items) => {
      console.error("[VSCode][ErrorMessage]", message);
      if (items.length > 0) {
        console.log("[VSCode][ErrorMessage] Available actions:", items);
        // 简单实现：返回第一个按钮
        return items[0];
      }
      return undefined;
    },
    
    showWarningMessage: async (message, ...items) => {
      console.warn("[VSCode][WarningMessage]", message);
      if (items.length > 0) {
        console.log("[VSCode][WarningMessage] Available actions:", items);
        // 简单实现：返回第一个按钮
        return items[0];
      }
      return undefined;
    },
    
    showInformationMessage: async (message, ...items) => {
      console.log("[VSCode][InfoMessage]", message);
      if (items.length > 0) {
        console.log("[VSCode][InfoMessage] Available actions:", items);
        // 简单实现：返回第一个按钮
        return items[0];
      }
      return undefined;
    },
    
    // 输入框API
    showInputBox: async (options = {}) => {
      console.log("[VSCode][showInputBox]", options);
      // 简单实现：在CLI环境下模拟输入
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        const prompt = options.prompt || 'Please enter:';
        const placeholder = options.placeholder ? ` (${options.placeholder})` : '';
        rl.question(`${prompt}${placeholder}: `, (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    },
    
    // 文件对话框API
    showOpenDialog: async (options = {}) => {
      console.log("[VSCode][showOpenDialog]", options);
      // 简单实现：返回模拟结果
      return [];
    },
    
    showSaveDialog: async (options = {}) => {
      console.log("[VSCode][showSaveDialog]", options);
      // 简单实现：返回模拟结果
      return undefined;
    },
    
    // 文档显示API
    showTextDocument: (document, column, preserveFocus) => {
      console.log("[VSCode][showTextDocument]", document, column, preserveFocus);
      
      let doc;
      let editor;
      
      if (typeof document === 'string') {
        // 如果是字符串，假设是文件路径
        doc = new TextDocument(Uri.file(document), 'plaintext', '');
        editor = new TextEditor(doc, column || ViewColumn.One);
      } else if (document.uri) {
        // 如果是TextDocument对象
        doc = document;
        editor = new TextEditor(doc, column || ViewColumn.One);
      } else {
        // 如果是Uri对象
        doc = new TextDocument(document, 'plaintext', '');
        editor = new TextEditor(doc, column || ViewColumn.One);
      }
      
      // 添加到可见编辑器列表
      if (!_textEditors.includes(editor)) {
        _textEditors.push(editor);
        _onDidChangeVisibleTextEditorsEmitter.fire(_textEditors);
      }
      
      // 设置为活动编辑器
      window.activeTextEditor = editor;
      
      return editor;
    },
    
    // 输出通道API
    createOutputChannel: (name) => {
      console.log("[VSCode][createOutputChannel]", name);
      const _buffer = [];
      return {
        name,
        appendLine: (msg) => {
          _buffer.push(msg);
          console.log(`[Output:${name}]`, msg);
        },
        append: (msg) => {
          if (_buffer.length > 0 && !_buffer[_buffer.length - 1].endsWith('\n')) {
            _buffer[_buffer.length - 1] += msg;
          } else {
            _buffer.push(msg);
          }
          process.stdout.write(`[Output:${name}] ${msg}`);
        },
        clear: () => {
          _buffer.length = 0;
          console.log(`[Output:${name}] Cleared`);
        },
        show: (preserveFocus) => {
          console.log(`[Output:${name}] Showed (preserveFocus: ${preserveFocus})`);
        },
        hide: () => {
          console.log(`[Output:${name}] Hidden`);
        },
        dispose: () => {
          console.log(`[Output:${name}] Disposed`);
        },
      };
    },
    
    // 状态栏API
    createStatusBarItem: (alignment, priority) => {
      console.log("[VSCode][createStatusBarItem]", alignment, priority);
      return {
        alignment,
        priority,
        text: '',
        tooltip: '',
        color: undefined,
        backgroundColor: undefined,
        command: undefined,
        show: () => {},
        hide: () => {},
        dispose: () => {}
      };
    },
    
    // 进度API
    withProgress: (options, task) => {
      console.log("[VSCode][withProgress]", options);
      return task({
        report: (value) => console.log('[Progress.report]', value)
      });
    },
    
    // 快速选择API
    createQuickPick: () => {
      console.log("[VSCode][createQuickPick]");
      const _emitter = new EventEmitter();
      return {
        placeholder: '',
        items: [],
        activeItems: [],
        selectedItems: [],
        value: '',
        onDidChangeValue: (callback) => {
          _emitter.on('changeValue', callback);
          return { dispose: () => _emitter.removeListener('changeValue', callback) };
        },
        onDidAccept: (callback) => {
          _emitter.on('accept', callback);
          return { dispose: () => _emitter.removeListener('accept', callback) };
        },
        onDidHide: (callback) => {
          _emitter.on('hide', callback);
          return { dispose: () => _emitter.removeListener('hide', callback) };
        },
        show: () => {
          console.log("[QuickPick] Showed");
        },
        hide: () => {
          _emitter.emit('hide');
          console.log("[QuickPick] Hidden");
        },
        dispose: () => {
          _emitter.removeAllListeners();
          console.log("[QuickPick] Disposed");
        }
      };
    },
    
    // 输入框API
    createInputBox: () => {
      console.log("[VSCode][createInputBox]");
      const _emitter = new EventEmitter();
      return {
        value: '',
        placeholder: '',
        prompt: '',
        password: false,
        onDidChangeValue: (callback) => {
          _emitter.on('changeValue', callback);
          return { dispose: () => _emitter.removeListener('changeValue', callback) };
        },
        onDidAccept: (callback) => {
          _emitter.on('accept', callback);
          return { dispose: () => _emitter.removeListener('accept', callback) };
        },
        onDidHide: (callback) => {
          _emitter.on('hide', callback);
          return { dispose: () => _emitter.removeListener('hide', callback) };
        },
        show: () => {
          console.log("[InputBox] Showed");
        },
        hide: () => {
          _emitter.emit('hide');
          console.log("[InputBox] Hidden");
        },
        dispose: () => {
          _emitter.removeAllListeners();
          console.log("[InputBox] Disposed");
        }
      };
    },
    
    // 终端API
    createTerminal: (options) => {
      console.log("[VSCode][createTerminal]", options);
      const _emitter = new EventEmitter();
      return {
        name: options?.name || "terminal",
        processId: Promise.resolve(process.pid),
        sendText: (txt) => console.log(`[Terminal] ${txt}`),
        show: (preserveFocus) => {
          console.log(`[Terminal] Showed (preserveFocus: ${preserveFocus})`);
        },
        hide: () => {
          console.log("[Terminal] Hidden");
        },
        dispose: () => {
          _emitter.emit('close');
          console.log("[Terminal] Disposed");
        }
      };
    },
    
    onDidCloseTerminal: (callback) => {
      console.log("[VSCode][onDidCloseTerminal]");
      return { dispose: () => {} };
    },
    
    // 编辑器装饰API
    createTextEditorDecorationType: (options) => {
      console.log("[VSCode][createTextEditorDecorationType]", options);
      return {
        key: Math.random().toString(36).substring(2),
        dispose: () => {}
      };
    },
    
    // Webview API
    createWebviewPanel: (viewType, title, showOptions, options) => {
      console.log("[VSCode][createWebviewPanel]", viewType, title, showOptions, options);
      const panel = new WebviewPanel(viewType, title, showOptions, options);
      return panel;
    },
    
    // Webview View Provider API
    registerWebviewViewProvider: (viewType, provider, options) => {
      console.log("[VSCode][registerWebviewViewProvider]", viewType, options);
      _webviewViewProviders.set(viewType, provider);
      
      // 简单实现：解析webview
      if (provider.resolveWebviewView) {
        const webviewView = {
          webview: {
            html: '',
            options: {},
            cspSource: '',
            asWebviewUri: (uri) => uri,
            postMessage: async (message) => {
              console.log('[WebviewView.postMessage]', message);
              return true;
            },
            onDidReceiveMessage: (callback) => {
              const emitter = new EventEmitter();
              emitter.on('message', callback);
              return { dispose: () => emitter.removeAllListeners('message') };
            }
          },
          show: () => {},
          onDidChangeVisibility: () => ({ dispose: () => {} }),
          onDispose: () => ({ dispose: () => {} }),
          dispose: () => {}
        };
        
        provider.resolveWebviewView(webviewView, {
          webview: webviewView.webview
        }, {
          state: undefined
        });
      }
      
      return {
        dispose: () => {
          _webviewViewProviders.delete(viewType);
          console.log("[VSCode][registerWebviewViewProvider] Disposed", viewType);
        }
      };
    },
    
    // 标签组API
    tabGroups: _tabGroups
  };
})();

// --- commands ---
const commandHandlers = new Map();
const textEditorCommandHandlers = new Map();
const commandExecutionHistory = [];
const builtinCommands = new Map();

// 命令管理类
class CommandManager {
  constructor() {
    this._registry = new Map();
    this._textEditorRegistry = new Map();
    this._executionHistory = [];
    this._maxHistorySize = 100;
  }

  // 注册命令
  registerCommand(id, handler) {
    if (!id || typeof id !== 'string') {
      throw new Error('Command ID is required and must be a string');
    }
    
    if (typeof handler !== 'function') {
      throw new Error('Command handler must be a function');
    }
    
    if (this._registry.has(id)) {
      console.warn(`Command '${id}' is already registered and will be overwritten`);
    }
    
    this._registry.set(id, handler);
    console.log(`[VSCode] Command registered: ${id}`);
    
    return {
      dispose: () => {
        this._registry.delete(id);
        console.log(`[VSCode] Command disposed: ${id}`);
      }
    };
  }

  // 注册文本编辑器命令
  registerTextEditorCommand(id, handler) {
    if (!id || typeof id !== 'string') {
      throw new Error('Command ID is required and must be a string');
    }
    
    if (typeof handler !== 'function') {
      throw new Error('Command handler must be a function');
    }
    
    if (this._textEditorRegistry.has(id)) {
      console.warn(`Text editor command '${id}' is already registered and will be overwritten`);
    }
    
    this._textEditorRegistry.set(id, handler);
    console.log(`[VSCode] Text editor command registered: ${id}`);
    
    return {
      dispose: () => {
        this._textEditorRegistry.delete(id);
        console.log(`[VSCode] Text editor command disposed: ${id}`);
      }
    };
  }

  // 执行命令
  async executeCommand(id, ...args) {
    if (!id || typeof id !== 'string') {
      throw new Error('Command ID is required and must be a string');
    }
    
    const startTime = Date.now();
    let result;
    let error;
    
    try {
      // 首先检查内置命令
      if (builtinCommands.has(id)) {
        const builtinHandler = builtinCommands.get(id);
        result = await builtinHandler(...args);
      }
      // 然后检查普通命令
      else if (this._registry.has(id)) {
        const handler = this._registry.get(id);
        result = await handler(...args);
      }
      // 最后检查文本编辑器命令
      else if (this._textEditorRegistry.has(id)) {
        const handler = this._textEditorRegistry.get(id);
        const activeEditor = window.activeTextEditor;
        
        if (!activeEditor) {
          throw new Error(`No active text editor for command '${id}'`);
        }
        
        // 文本编辑器命令的第一个参数是编辑器，然后是用户提供的参数
        result = await handler(activeEditor, ...args);
      }
      else {
        console.warn(`[VSCode] Command not found: ${id}`);
        return undefined;
      }
      
      // 记录执行历史
      this._addToHistory(id, args, result, undefined, Date.now() - startTime);
      
      return result;
    } catch (err) {
      error = err;
      console.error(`[VSCode] Error executing command '${id}':`, err);
      
      // 记录错误历史
      this._addToHistory(id, args, undefined, err, Date.now() - startTime);
      
      throw err;
    }
  }

  // 添加到执行历史
  _addToHistory(id, args, result, error, duration) {
    const historyEntry = {
      id,
      args: args ? [...args] : [],
      result,
      error: error ? error.message : undefined,
      timestamp: new Date().toISOString(),
      duration
    };
    
    this._executionHistory.unshift(historyEntry);
    
    // 限制历史记录大小
    if (this._executionHistory.length > this._maxHistorySize) {
      this._executionHistory = this._executionHistory.slice(0, this._maxHistorySize);
    }
  }

  // 获取执行历史
  getExecutionHistory(filter) {
    if (!filter) {
      return [...this._executionHistory];
    }
    
    return this._executionHistory.filter(entry => {
      if (filter.commandId && entry.id !== filter.commandId) return false;
      if (filter.success !== undefined && (entry.error === undefined) !== filter.success) return false;
      if (filter.since && new Date(entry.timestamp) < new Date(filter.since)) return false;
      return true;
    });
  }

  // 获取所有注册的命令
  getCommands() {
    return {
      regular: Array.from(this._registry.keys()),
      textEditor: Array.from(this._textEditorRegistry.keys()),
      builtin: Array.from(builtinCommands.keys())
    };
  }

  // 检查命令是否存在
  hasCommand(id) {
    return this._registry.has(id) ||
           this._textEditorRegistry.has(id) ||
           builtinCommands.has(id);
  }
}

// 创建命令管理器实例
const commandManager = new CommandManager();

// 内置命令实现
builtinCommands.set('vscode.open', async (uri) => {
  console.log(`[VSCode] Executing builtin command: vscode.open with uri:`, uri);
  
  let targetUri;
  if (typeof uri === 'string') {
    targetUri = uri.includes('://') ? Uri.parse(uri) : Uri.file(path.resolve(uri));
  } else if (uri instanceof Uri) {
    targetUri = uri;
  } else {
    throw new Error('Invalid URI argument for vscode.open');
  }
  
  try {
    const document = await workspace.openTextDocument(targetUri);
    return window.showTextDocument(document);
  } catch (error) {
    console.error(`[VSCode] Error in vscode.open:`, error);
    throw error;
  }
});

builtinCommands.set('workbench.action.files.save', async () => {
  console.log('[VSCode] Executing builtin command: workbench.action.files.save');
  
  const activeEditor = window.activeTextEditor;
  if (!activeEditor || !activeEditor.document) {
    console.warn('[VSCode] No active document to save');
    return false;
  }
  
  try {
    await workspace.fs.writeFile(activeEditor.document.uri, activeEditor.document.getText());
    console.log(`[VSCode] Document saved: ${activeEditor.document.uri.fsPath}`);
    return true;
  } catch (error) {
    console.error(`[VSCode] Error saving document:`, error);
    throw error;
  }
});

builtinCommands.set('workbench.action.files.saveAll', async () => {
  console.log('[VSCode] Executing builtin command: workbench.action.files.saveAll');
  
  const visibleEditors = window.visibleTextEditors;
  if (visibleEditors.length === 0) {
    console.log('[VSCode] No documents to save');
    return true;
  }
  
  const results = [];
  for (const editor of visibleEditors) {
    try {
      await workspace.fs.writeFile(editor.document.uri, editor.document.getText());
      console.log(`[VSCode] Document saved: ${editor.document.uri.fsPath}`);
      results.push(true);
    } catch (error) {
      console.error(`[VSCode] Error saving document ${editor.document.uri.fsPath}:`, error);
      results.push(false);
    }
  }
  
  return results.every(result => result);
});

builtinCommands.set('workbench.action.closeActiveEditor', async () => {
  console.log('[VSCode] Executing builtin command: workbench.action.closeActiveEditor');
  
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) {
    console.warn('[VSCode] No active editor to close');
    return false;
  }
  
  try {
    // 简单实现：从可见编辑器列表中移除
    const index = window.visibleTextEditors.indexOf(activeEditor);
    if (index !== -1) {
      window.visibleTextEditors.splice(index, 1);
    }
    
    // 如果还有其他编辑器，设置新的活动编辑器
    if (window.visibleTextEditors.length > 0) {
      window.activeTextEditor = window.visibleTextEditors[0];
    } else {
      window.activeTextEditor = null;
    }
    
    console.log('[VSCode] Active editor closed');
    return true;
  } catch (error) {
    console.error('[VSCode] Error closing active editor:', error);
    throw error;
  }
});

builtinCommands.set('workbench.action.reloadWindow', async () => {
  console.log('[VSCode] Executing builtin command: workbench.action.reloadWindow');
  
  try {
    // 简单实现：在Node.js环境中，我们可以通过退出进程来模拟重新加载
    console.log('[VSCode] Window reload requested');
    
    // 在实际VSCode扩展中，这会重新加载窗口
    // 在我们的模拟环境中，我们只能记录这个请求
    return true;
  } catch (error) {
    console.error('[VSCode] Error reloading window:', error);
    throw error;
  }
});

builtinCommands.set('editor.action.formatDocument', async () => {
  console.log('[VSCode] Executing builtin command: editor.action.formatDocument');
  
  const activeEditor = window.activeTextEditor;
  if (!activeEditor || !activeEditor.document) {
    console.warn('[VSCode] No active document to format');
    return false;
  }
  
  try {
    // 简单实现：在实际VSCode中，这会调用注册的格式化提供程序
    // 在我们的模拟环境中，我们只能记录这个请求
    console.log(`[VSCode] Document formatting requested: ${activeEditor.document.uri.fsPath}`);
    return true;
  } catch (error) {
    console.error('[VSCode] Error formatting document:', error);
    throw error;
  }
});

builtinCommands.set('editor.action.selectAll', async () => {
  console.log('[VSCode] Executing builtin command: editor.action.selectAll');
  
  const activeEditor = window.activeTextEditor;
  if (!activeEditor || !activeEditor.document) {
    console.warn('[VSCode] No active document to select all');
    return false;
  }
  
  try {
    const document = activeEditor.document;
    const lineCount = document.lineCount;
    const lastLine = document.lineAt(lineCount - 1);
    const endPosition = new Position(lineCount - 1, lastLine.text.length);
    
    // 创建全选范围
    const selection = new Selection(new Position(0, 0), endPosition);
    activeEditor.selection = selection;
    
    console.log('[VSCode] Selected all text in active document');
    return true;
  } catch (error) {
    console.error('[VSCode] Error selecting all text:', error);
    throw error;
  }
});

const commands = {
  registerCommand: (id, handler) => {
    return commandManager.registerCommand(id, handler);
  },
  
  registerTextEditorCommand: (id, handler) => {
    return commandManager.registerTextEditorCommand(id, handler);
  },
  
  executeCommand: async (id, ...args) => {
    return commandManager.executeCommand(id, ...args);
  },
  
  // 获取命令执行历史
  getCommandExecutionHistory: (filter) => {
    return commandManager.getExecutionHistory(filter);
  },
  
  // 获取所有注册的命令
  getCommands: () => {
    return commandManager.getCommands();
  },
  
  // 检查命令是否存在
  hasCommand: (id) => {
    return commandManager.hasCommand(id);
  }
};

// --- languages ---
const languageFeatureManager = new LanguageFeatureManager();
const languages = {
  // 创建诊断集合
  createDiagnosticCollection: (name) => {
    if (!name || typeof name !== 'string') {
      throw new Error('Diagnostic collection name is required and must be a string');
    }
    return languageFeatureManager.createDiagnosticCollection(name);
  },

  // 获取诊断信息
  getDiagnostics: (uri) => {
    return languageFeatureManager.getDiagnostics(uri);
  },

  // 注册代码操作提供者
  registerCodeActionsProvider: (selector, provider, metadata) => {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    if (typeof provider.provideCodeActions !== 'function') {
      throw new Error('Provider must implement provideCodeActions method');
    }

    console.log('[vscode.languages.registerCodeActionsProvider]', selector, metadata);
    
    // 包装提供者以符合标准接口
    const wrappedProvider = {
      provideCodeActions: async (document, range, context, token) => {
        try {
          const result = await provider.provideCodeActions(document, range, context, token);
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error('Error in provideCodeActions:', error);
          return [];
        }
      }
    };

    return languageFeatureManager.registerProvider('codeAction', selector, wrappedProvider);
  },

  // 注册补全项提供者
  registerCompletionItemProvider: (selector, provider, ...triggerCharacters) => {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    if (typeof provider.provideCompletionItems !== 'function') {
      throw new Error('Provider must implement provideCompletionItems method');
    }

    console.log('[vscode.languages.registerCompletionItemProvider]', selector, triggerCharacters);
    
    // 包装提供者以符合标准接口
    const wrappedProvider = {
      provideCompletionItems: async (document, position, token, context) => {
        try {
          const result = await provider.provideCompletionItems(document, position, token, context);
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error('Error in provideCompletionItems:', error);
          return [];
        }
      },
      resolveCompletionItem: provider.resolveCompletionItem ? async (item, token) => {
        try {
          return await provider.resolveCompletionItem(item, token);
        } catch (error) {
          console.error('Error in resolveCompletionItem:', error);
          return item;
        }
      } : undefined
    };

    const disposable = languageFeatureManager.registerProvider('completion', selector, wrappedProvider);
    
    // 存储触发字符
    if (triggerCharacters && triggerCharacters.length > 0) {
      wrappedProvider.triggerCharacters = triggerCharacters;
    }

    return disposable;
  },

  // 注册悬停信息提供者
  registerHoverProvider: (selector, provider) => {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    if (typeof provider.provideHover !== 'function') {
      throw new Error('Provider must implement provideHover method');
    }

    console.log('[vscode.languages.registerHoverProvider]', selector);
    
    // 包装提供者以符合标准接口
    const wrappedProvider = {
      provideHover: async (document, position, token) => {
        try {
          const result = await provider.provideHover(document, position, token);
          return result || null;
        } catch (error) {
          console.error('Error in provideHover:', error);
          return null;
        }
      }
    };

    return languageFeatureManager.registerProvider('hover', selector, wrappedProvider);
  },

  // 注册定义提供者
  registerDefinitionProvider: (selector, provider) => {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    if (typeof provider.provideDefinition !== 'function') {
      throw new Error('Provider must implement provideDefinition method');
    }

    console.log('[vscode.languages.registerDefinitionProvider]', selector);
    
    // 包装提供者以符合标准接口
    const wrappedProvider = {
      provideDefinition: async (document, position, token) => {
        try {
          const result = await provider.provideDefinition(document, position, token);
          return Array.isArray(result) ? result : (result ? [result] : []);
        } catch (error) {
          console.error('Error in provideDefinition:', error);
          return [];
        }
      }
    };

    return languageFeatureManager.registerProvider('definition', selector, wrappedProvider);
  },

  // 注册文档格式化提供者
  registerDocumentFormattingEditProvider: (selector, provider) => {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    if (typeof provider.provideDocumentFormattingEdits !== 'function') {
      throw new Error('Provider must implement provideDocumentFormattingEdits method');
    }

    console.log('[vscode.languages.registerDocumentFormattingEditProvider]', selector);
    
    // 包装提供者以符合标准接口
    const wrappedProvider = {
      provideDocumentFormattingEdits: async (document, options, token) => {
        try {
          const result = await provider.provideDocumentFormattingEdits(document, options, token);
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error('Error in provideDocumentFormattingEdits:', error);
          return [];
        }
      }
    };

    return languageFeatureManager.registerProvider('formatting', selector, wrappedProvider);
  },

  // 注册代码镜头提供者
  registerCodeLensProvider: (selector, provider) => {
    if (!selector || !provider) {
      throw new Error('Selector and provider are required');
    }

    if (typeof provider.provideCodeLenses !== 'function') {
      throw new Error('Provider must implement provideCodeLenses method');
    }

    console.log('[vscode.languages.registerCodeLensProvider]', selector);
    
    // 包装提供者以符合标准接口
    const wrappedProvider = {
      provideCodeLenses: async (document, token) => {
        try {
          const result = await provider.provideCodeLenses(document, token);
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error('Error in provideCodeLenses:', error);
          return [];
        }
      },
      resolveCodeLens: provider.resolveCodeLens ? async (codeLens, token) => {
        try {
          return await provider.resolveCodeLens(codeLens, token);
        } catch (error) {
          console.error('Error in resolveCodeLens:', error);
          return codeLens;
        }
      } : undefined
    };

    return languageFeatureManager.registerProvider('codeLens', selector, wrappedProvider);
  },

  // 调用语言功能提供者（内部方法）
  _invokeProvider: async (featureType, document, ...args) => {
    return languageFeatureManager.invokeProvider(featureType, document, ...args);
  }
};

// --- extensions ---

// Extension 类 - 扩展信息
class Extension {
  constructor(id, extensionPath, packageJSON) {
    this.id = id;
    this.extensionPath = extensionPath;
    this.extensionUri = Uri.file(extensionPath);
    this.packageJSON = packageJSON || {};
    this.isActive = false;
    this.exports = undefined;
    this.extensionKind = ['workspace'];
  }

  async activate() {
    if (!this.isActive) {
      this.isActive = true;
      // 在实际环境中，这里会调用扩展的activate函数
      console.log(`[Extension] Activated: ${this.id}`);
    }
    return this.exports;
  }
}

// Extensions 模块
const extensions = {
  // 所有扩展的映射
  _extensions: new Map(),
  
  // 获取扩展
  getExtension: (id) => {
    console.log(`[extensions.getExtension] ${id}`);
    return extensions._extensions.get(id) || null;
  },
  
  // 获取所有扩展
  getAllExtensions: () => {
    console.log('[extensions.getAllExtensions]');
    return Array.from(extensions._extensions.values());
  },
  
  // 注册扩展
  registerExtension: (id, extensionPath, packageJSON) => {
    console.log(`[extensions.registerExtension] ${id}`);
    const extension = new Extension(id, extensionPath, packageJSON);
    extensions._extensions.set(id, extension);
    return extension;
  },
  
  // 激活扩展
  activateExtension: async (id) => {
    console.log(`[extensions.activateExtension] ${id}`);
    const extension = extensions._extensions.get(id);
    if (extension) {
      return await extension.activate();
    }
    return undefined;
  },
  
  // 当扩展发生变化时触发
  onDidChange: (callback) => {
    console.log('[extensions.onDidChange]');
    // 返回一个可释放的对象
    return { dispose: () => {} };
  }
};

// --- authentication ---

// AuthenticationSession 类 - 认证会话
class AuthenticationSession {
  constructor(id, account, scopes, accessToken) {
    this.id = id;
    this.account = account;
    this.scopes = scopes;
    this.accessToken = accessToken;
  }
}

// AuthenticationProvider 类 - 认证提供者
class AuthenticationProvider {
  constructor(id) {
    this.id = id;
    this._onDidChangeSessionsEmitter = new VSCodeEventEmitter();
  }

  get onDidChangeSessions() {
    return this._onDidChangeSessionsEmitter.event;
  }

  async getSession(scopes, options) {
    console.log(`[AuthenticationProvider] getSession for ${this.id}`, scopes, options);
    // 在实际环境中，这里会调用认证提供者的实现
    return undefined;
  }

  async createSession(scopes) {
    console.log(`[AuthenticationProvider] createSession for ${this.id}`, scopes);
    // 在实际环境中，这里会创建新的认证会话
    return undefined;
  }

  async removeSession(sessionId) {
    console.log(`[AuthenticationProvider] removeSession for ${this.id}`, sessionId);
    // 在实际环境中，这里会移除认证会话
  }
}

// Authentication 模块
const authentication = {
  // 所有认证提供者的映射
  _providers: new Map(),
  
  // 注册认证提供者
  registerAuthenticationProvider: (id, provider) => {
    console.log(`[authentication.registerAuthenticationProvider] ${id}`);
    if (!id || typeof id !== 'string') {
      throw new Error('Provider ID is required and must be a string');
    }
    
    if (!provider || typeof provider.getSession !== 'function') {
      throw new Error('Provider must implement getSession method');
    }
    
    const authProvider = new AuthenticationProvider(id);
    authentication._providers.set(id, authProvider);
    
    // 包装提供者方法
    authProvider.getSession = provider.getSession;
    if (provider.createSession) {
      authProvider.createSession = provider.createSession;
    }
    if (provider.removeSession) {
      authProvider.removeSession = provider.removeSession;
    }
    
    return {
      dispose: () => {
        authentication._providers.delete(id);
        console.log(`[AuthenticationProvider] Disposed: ${id}`);
      }
    };
  },
  
  // 获取认证会话
  getSession: async (providerId, scopes, options) => {
    console.log(`[authentication.getSession] ${providerId}`, scopes, options);
    const provider = authentication._providers.get(providerId);
    if (provider) {
      return await provider.getSession(scopes, options);
    }
    return undefined;
  },
  
  // 创建认证会话
  createSession: async (providerId, scopes) => {
    console.log(`[authentication.createSession] ${providerId}`, scopes);
    const provider = authentication._providers.get(providerId);
    if (provider && provider.createSession) {
      return await provider.createSession(scopes);
    }
    return undefined;
  },
  
  // 移除认证会话
  removeSession: async (providerId, sessionId) => {
    console.log(`[authentication.removeSession] ${providerId}`, sessionId);
    const provider = authentication._providers.get(providerId);
    if (provider && provider.removeSession) {
      await provider.removeSession(sessionId);
    }
  },
  
  // 监听认证会话变化
  onDidChangeSessions: (callback) => {
    console.log('[authentication.onDidChangeSessions]');
    // 在实际环境中，这里会监听所有提供者的会话变化
    return { dispose: () => {} };
  },
  
  // 获取所有认证提供者
  getProviders: () => {
    console.log('[authentication.getProviders]');
    return Array.from(authentication._providers.keys());
  }
};

// --- webview ---

// WebviewOptions 类 - Webview选项
class WebviewOptions {
  constructor(options = {}) {
    this.enableScripts = options.enableScripts || false;
    this.enableCommandUris = options.enableCommandUris || false;
    this.localResourceRoots = options.localResourceRoots || [];
  }
}

// WebviewPanelOptions 类 - Webview面板选项
class WebviewPanelOptions {
  constructor(options = {}) {
    this.enableFindWidget = options.enableFindWidget || false;
    this.retainContextWhenHidden = options.retainContextWhenHidden || false;
  }
}

// Webview 类 - Webview实现
class Webview {
  constructor(options = {}) {
    this.options = new WebviewOptions(options);
    this.html = '';
    this.cspSource = '';
    this._onDidReceiveMessageEmitter = new VSCodeEventEmitter();
  }

  // 设置HTML内容
  set html(value) {
    this._html = value;
    console.log('[Webview] HTML content set');
  }

  get html() {
    return this._html;
  }

  // 将本地资源转换为Webview URI
  asWebviewUri(localResource) {
    console.log('[Webview] asWebviewUri', localResource);
    // 在实际环境中，这里会将本地资源转换为Webview可访问的URI
    return localResource;
  }

  // 发送消息到Webview
  async postMessage(message) {
    console.log('[Webview] postMessage', message);
    // 在实际环境中，这里会发送消息到Webview
    return true;
  }

  // 监听来自Webview的消息
  onDidReceiveMessage(callback) {
    return this._onDidReceiveMessageEmitter.event(callback);
  }
}

// WebviewPanel 类 - Webview面板实现
class WebviewPanelImpl {
  constructor(viewType, title, showOptions, options = {}) {
    this.viewType = viewType;
    this.title = title;
    this.options = new WebviewPanelOptions(options);
    this._visible = true;
    this._active = true;
    this._disposed = false;
    
    this._onDidDisposeEmitter = new VSCodeEventEmitter();
    this._onDidChangeViewStateEmitter = new VSCodeEventEmitter();
    
    // 创建Webview
    this.webview = new Webview(options);
  }

  get visible() {
    return this._visible;
  }

  get active() {
    return this._active;
  }

  // 显示面板
  reveal(viewColumn) {
    console.log('[WebviewPanel] reveal', viewColumn);
    this._visible = true;
    this._active = true;
    this._onDidChangeViewStateEmitter.fire({ webviewPanel: this });
  }

  // 处理面板
  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      this._visible = false;
      this._active = false;
      this._onDidDisposeEmitter.fire();
      this._onDidDisposeEmitter.removeAllListeners();
      this._onDidChangeViewStateEmitter.removeAllListeners();
    }
  }

  // 监听面板处理事件
  onDidDispose(callback) {
    return this._onDidDisposeEmitter.event(callback);
  }

  // 监听视图状态变化事件
  onDidChangeViewState(callback) {
    return this._onDidChangeViewStateEmitter.event(callback);
  }
}

// WebviewView 类 - Webview视图实现
class WebviewView {
  constructor(webview, options = {}) {
    this.webview = webview;
    this.options = options;
    this._visible = true;
    this._onDidChangeVisibilityEmitter = new VSCodeEventEmitter();
    this._onDisposeEmitter = new VSCodeEventEmitter();
  }

  get visible() {
    return this._visible;
  }

  // 显示视图
  show() {
    console.log('[WebviewView] show');
    this._visible = true;
    this._onDidChangeVisibilityEmitter.fire({ webviewView: this });
  }

  // 处理视图
  dispose() {
    console.log('[WebviewView] dispose');
    this._onDisposeEmitter.fire();
    this._onDisposeEmitter.removeAllListeners();
    this._onDidChangeVisibilityEmitter.removeAllListeners();
  }

  // 监听可见性变化
  onDidChangeVisibility(callback) {
    return this._onDidChangeVisibilityEmitter.event(callback);
  }

  // 监听处理事件
  onDispose(callback) {
    return this._onDisposeEmitter.event(callback);
  }
}

// Webview 模块
const webview = {
  // 创建Webview面板
  createWebviewPanel: (viewType, title, showOptions, options = {}) => {
    console.log('[webview.createWebviewPanel]', viewType, title, showOptions, options);
    const panel = new WebviewPanelImpl(viewType, title, showOptions, options);
    return panel;
  },
  
  // 注册Webview视图提供者
  registerWebviewViewProvider: (viewType, provider, options = {}) => {
    console.log('[webview.registerWebviewViewProvider]', viewType, options);
    
    // 创建Webview
    const webview = new Webview(options);
    
    // 创建Webview视图
    const webviewView = new WebviewView(webview, options);
    
    // 调用提供者的resolveWebviewView方法
    if (provider.resolveWebviewView) {
      provider.resolveWebviewView(webviewView, {
        webview: webviewView.webview
      }, {
        state: undefined
      });
    }
    
    return {
      dispose: () => {
        console.log('[webview.registerWebviewViewProvider] disposed', viewType);
        webviewView.dispose();
      }
    };
  },
  
  // Webview选项
  WebviewOptions,
  
  // Webview面板选项
  WebviewPanelOptions
};

// --- env ---
const env = {
  // VSCode应用程序根目录
  appRoot: process.cwd(),
  
  // 当前会话ID
  sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
  
  // 剪贴板功能
  clipboard: {
    writeText: async (text) => {
      console.log('[vscode.env.clipboard.writeText]', text);
      // 在实际环境中，这里会使用系统剪贴板
      // 在Node.js环境中，我们可以使用clipboardy模块或类似工具
      try {
        // 尝试使用clipboardy（如果可用）
        const clipboardy = require('clipboardy');
        clipboardy.writeSync(text);
        return true;
      } catch (error) {
        console.warn('Failed to use clipboardy, falling back to simulation:', error);
        // 模拟实现：仅记录日志
        return true;
      }
    },
    readText: async () => {
      console.log('[vscode.env.clipboard.readText]');
      // 在实际环境中，这里会使用系统剪贴板
      try {
        // 尝试使用clipboardy（如果可用）
        const clipboardy = require('clipboardy');
        return clipboardy.readSync();
      } catch (error) {
        console.warn('Failed to use clipboardy, falling back to simulation:', error);
        // 模拟实现：返回空字符串
        return '';
      }
    }
  },
  
  // 外部URI转换
  asExternalUri: async (uri) => {
    console.log('[vscode.env.asExternalUri]', uri);
    
    // 如果是字符串，尝试解析为URI
    let targetUri;
    if (typeof uri === 'string') {
      targetUri = uri.includes('://') ? Uri.parse(uri) : Uri.file(path.resolve(uri));
    } else if (uri instanceof Uri) {
      targetUri = uri;
    } else {
      throw new Error('Invalid URI argument');
    }
    
    // 如果是文件URI，尝试转换为HTTP URL（如果可能）
    if (targetUri.scheme === 'file') {
      // 在实际VSCode环境中，这里可能会使用本地开发服务器
      // 在我们的模拟环境中，我们返回原始URI
      return targetUri;
    }
    
    return targetUri;
  },
  
  // 打开外部URI
  openExternal: async (uri) => {
    const target = typeof uri === "string" ? uri : uri.fsPath || uri.toString();
    console.log("[VSCode][openExternal]", target);
    try {
      if (process.platform === "win32") {
        child_process.exec(`start "" "${target}"`);
      } else if (process.platform === "darwin") {
        child_process.exec(`open "${target}"`);
      } else {
        child_process.exec(`xdg-open "${target}"`);
      }
      return true;
    } catch (e) {
      console.error("[VSCode][openExternal] failed:", e);
      return false;
    }
  },
  
  // 扩展相关属性
  appName: 'VSCode',
  appHost: 'desktop',
  language: 'en',
  machineId: `machine-${Math.random().toString(36).substring(2, 15)}`,
  remoteName: undefined,
  shell: process.env.SHELL || process.env.COMSPEC || '',
  uiKind: 1, // UIKind.Desktop
  uriScheme: 'vscode'
};

// --- 扩展激活支持 ---

// ExtensionActivator 类 - 扩展激活器
class ExtensionActivator {
  constructor() {
    this._extensions = new Map();
    this._activeExtensions = new Map();
    this._extensionContexts = new Map();
    this._onDidActivateExtensionEmitter = new VSCodeEventEmitter();
    this._onDidDeactivateExtensionEmitter = new VSCodeEventEmitter();
  }

  // 注册扩展
  registerExtension(id, extensionPath, activate, deactivate, packageJSON) {
    console.log(`[ExtensionActivator] Register extension: ${id}`);
    
    const extensionInfo = {
      id,
      extensionPath,
      activate,
      deactivate,
      packageJSON: packageJSON || {},
      isActive: false
    };
    
    this._extensions.set(id, extensionInfo);
    
    // 注册到extensions模块
    extensions.registerExtension(id, extensionPath, packageJSON);
    
    return {
      dispose: () => {
        this._extensions.delete(id);
        if (this._activeExtensions.has(id)) {
          this.deactivateExtension(id);
        }
        console.log(`[ExtensionActivator] Extension unregistered: ${id}`);
      }
    };
  }

  // 激活扩展
  async activateExtension(id, context) {
    console.log(`[ExtensionActivator] Activate extension: ${id}`);
    
    const extensionInfo = this._extensions.get(id);
    if (!extensionInfo) {
      throw new Error(`Extension not found: ${id}`);
    }
    
    if (extensionInfo.isActive) {
      return this._activeExtensions.get(id);
    }
    
    try {
      // 创建扩展上下文
      const extensionContext = context || new ExtensionContext(extensionInfo.extensionPath, id);
      this._extensionContexts.set(id, extensionContext);
      
      // 调用激活函数
      let result;
      if (extensionInfo.activate) {
        result = await extensionInfo.activate(extensionContext);
      }
      
      // 标记为已激活
      extensionInfo.isActive = true;
      this._activeExtensions.set(id, result);
      
      // 触发激活事件
      this._onDidActivateExtensionEmitter.fire({
        id,
        extension: extensions.getExtension(id)
      });
      
      console.log(`[ExtensionActivator] Extension activated: ${id}`);
      return result;
    } catch (error) {
      console.error(`[ExtensionActivator] Failed to activate extension ${id}:`, error);
      throw error;
    }
  }

  // 停用扩展
  async deactivateExtension(id) {
    console.log(`[ExtensionActivator] Deactivate extension: ${id}`);
    
    const extensionInfo = this._extensions.get(id);
    if (!extensionInfo || !extensionInfo.isActive) {
      return;
    }
    
    try {
      // 调用停用函数
      if (extensionInfo.deactivate) {
        await extensionInfo.deactivate();
      }
      
      // 清理上下文
      const context = this._extensionContexts.get(id);
      if (context) {
        context.dispose();
        this._extensionContexts.delete(id);
      }
      
      // 标记为未激活
      extensionInfo.isActive = false;
      this._activeExtensions.delete(id);
      
      // 触发停用事件
      this._onDidDeactivateExtensionEmitter.fire({
        id,
        extension: extensions.getExtension(id)
      });
      
      console.log(`[ExtensionActivator] Extension deactivated: ${id}`);
    } catch (error) {
      console.error(`[ExtensionActivator] Failed to deactivate extension ${id}:`, error);
      throw error;
    }
  }

  // 获取扩展上下文
  getExtensionContext(id) {
    return this._extensionContexts.get(id);
  }

  // 检查扩展是否已激活
  isExtensionActive(id) {
    const extensionInfo = this._extensions.get(id);
    return extensionInfo ? extensionInfo.isActive : false;
  }

  // 获取所有已激活的扩展
  getActiveExtensions() {
    return Array.from(this._activeExtensions.keys());
  }

  // 监听扩展激活事件
  onDidActivateExtension(callback) {
    return this._onDidActivateExtensionEmitter.event(callback);
  }

  // 监听扩展停用事件
  onDidDeactivateExtension(callback) {
    return this._onDidDeactivateExtensionEmitter.event(callback);
  }

  // 停用所有扩展
  async deactivateAll() {
    console.log('[ExtensionActivator] Deactivate all extensions');
    
    const deactivationPromises = [];
    for (const id of this._activeExtensions.keys()) {
      deactivationPromises.push(this.deactivateExtension(id));
    }
    
    await Promise.all(deactivationPromises);
    console.log('[ExtensionActivator] All extensions deactivated');
  }
}

// 创建扩展激活器实例
const extensionActivator = new ExtensionActivator();

// --- exports ---
module.exports = function createVscodeApi({ log, registerCommand }) {
  // 如果提供了log函数，替换console方法
  if (log) {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    console.error = (...args) => log('[ERROR]', ...args);
    console.warn = (...args) => log('[WARN]', ...args);
    console.log = (...args) => log('[INFO]', ...args);
  }
  
  // 如果提供了registerCommand函数，使用它来注册命令
  if (registerCommand) {
    const originalRegisterCommand = commands.registerCommand;
    commands.registerCommand = (id, handler) => {
      registerCommand(id, handler);
      return originalRegisterCommand(id, handler);
    };
  }
 

  return {
    workspace,
    window,
    commands,
    languages,
    extensions,
    authentication,
    webview,
    env,
    Uri,
    Range,
    Position,
    Selection,
    ThemeIcon,
    FileType,
    DiagnosticSeverity,
    OverviewRulerLane,
    EventEmitter,
    CodeAction,
    CodeActionKind,
    Diagnostic,
    CompletionItem,
    CompletionItemKind,
    Hover,
    Location,
    CodeActionProvider,
    CompletionItemProvider,
    HoverProvider,
    DefinitionProvider,
    DocumentFormattingEditProvider,
    CodeLensProvider,
    DiagnosticRelatedInformation,
    Disposable,
    CancellationToken,
    CancellationTokenSource,
    MarkdownString,
    TextEdit,
    WorkspaceEdit,
    EventEmitter: VSCodeEventEmitter,
    ExtensionMode,
    UIKind,
    TextDocumentSaveReason,
    ConfigurationTarget,
    ProgressLocation,
    StatusBarAlignment,
    ExtensionContext,
    Memento,
    ExtensionActivator,
    extensionActivator
  };
};