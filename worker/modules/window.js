const { EventEmitter } = require("events");
const {
  VSCodeEventEmitter,
  Uri,
  Position,
  Range,
  Selection
} = require('./base-types');
const { configManager } = require('./config');

/**
 * TextEditor类 - 表示文本编辑器
 */
class TextEditor {
  /**
   * 创建文本编辑器实例
   * @param {TextDocument} document 文本文档
   * @param {number} viewColumn 视图列
   */
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

  /**
   * 编辑文档
   * @param {Function} editBuilder 编辑构建器
   * @returns {boolean} 是否成功
   */
  edit(editBuilder) {
    // 简单实现，实际应该更复杂
    return true;
  }

  /**
   * 显示编辑器
   * @param {number} column 视图列
   * @returns {TextEditor} 当前编辑器实例
   */
  show(column) {
    this.viewColumn = column || this.viewColumn;
    return this;
  }

  /**
   * 隐藏编辑器
   * @returns {TextEditor} 当前编辑器实例
   */
  hide() {
    return this;
  }
}

/**
 * TextDocument类 - 表示文本文档
 */
class TextDocument {
  /**
   * 创建文本文档实例
   * @param {Uri} uri 文档URI
   * @param {string} languageId 语言ID
   * @param {string} content 文档内容
   */
  constructor(uri, languageId, content) {
    this.uri = uri;
    this.languageId = languageId;
    this.version = 1;
    this._content = content || '';
    this._lines = this._content.split('\n');
  }

  /**
   * 获取行数
   * @returns {number} 行数
   */
  get lineCount() {
    return this._lines.length;
  }

  /**
   * 获取指定行
   * @param {number} line 行号
   * @returns {Object} 行信息
   */
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

  /**
   * 获取文本内容
   * @param {Range} range 范围
   * @returns {string} 文本内容
   */
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

  /**
   * 获取位置处的单词范围
   * @param {Position} position 位置
   * @param {RegExp} regex 正则表达式
   * @returns {Range|undefined} 单词范围
   */
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

/**
 * Tab类 - 表示标签页
 */
class Tab {
  /**
   * 创建标签页实例
   * @param {Object} input 输入
   * @param {number} viewColumn 视图列
   */
  constructor(input, viewColumn) {
    this.input = input;
    this.viewColumn = viewColumn;
    this.isActive = false;
    this.isDirty = false;
    this.isPinned = false;
    this.label = input.title || 'Untitled';
  }
}

/**
 * TabGroup类 - 表示标签组
 */
class TabGroup {
  /**
   * 创建标签组实例
   * @param {number} viewColumn 视图列
   */
  constructor(viewColumn) {
    this.viewColumn = viewColumn;
    this.isActive = viewColumn === 1; // 假设第一列是活动的
    this.tabs = [];
  }

  /**
   * 获取活动标签页
   * @returns {Tab|undefined} 活动标签页
   */
  get activeTab() {
    return this.tabs.find(tab => tab.isActive);
  }
}

/**
 * TabGroups类 - 表示标签组集合
 */
class TabGroups {
  constructor() {
    this._groups = [new TabGroup(1)]; // 默认有一个标签组
    this._onDidChangeTabsEmitter = new VSCodeEventEmitter();
    this._onDidChangeTabGroupsEmitter = new VSCodeEventEmitter();
  }

  /**
   * 获取所有标签组
   * @returns {TabGroup[]} 标签组数组
   */
  get all() {
    return this._groups;
  }

  /**
   * 获取活动标签组
   * @returns {TabGroup} 活动标签组
   */
  get activeTabGroup() {
    return this._groups.find(group => group.isActive) || this._groups[0];
  }

  /**
   * 监听标签页变化
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeTabs(callback) {
    return this._onDidChangeTabsEmitter.event(callback);
  }

  /**
   * 监听标签组变化
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeTabGroups(callback) {
    this._onDidChangeTabGroupsEmitter.event(callback);
    return { dispose: () => this._onDidChangeTabGroupsEmitter.removeListener('event', callback) };
  }
}

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

// 创建window对象
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

  return {
    /**
     * 获取活动文本编辑器
     * @returns {TextEditor|null} 活动文本编辑器
     */
    get activeTextEditor() {
      return _activeTextEditor;
    },
    
    /**
     * 设置活动文本编辑器
     * @param {TextEditor} editor 文本编辑器
     */
    set activeTextEditor(editor) {
      if (_activeTextEditor !== editor) {
        _activeTextEditor = editor;
        _onDidChangeActiveTextEditorEmitter.fire(editor);
      }
    },
    
    /**
     * 获取可见文本编辑器
     * @returns {TextEditor[]} 可见文本编辑器数组
     */
    get visibleTextEditors() {
      return [..._textEditors];
    },
    
    ViewColumn,
    
    /**
     * 监听活动文本编辑器变化
     * @param {Function} callback 回调函数
     * @returns {Object} 可释放对象
     */
    onDidChangeActiveTextEditor: (callback) => {
      return _onDidChangeActiveTextEditorEmitter.event(callback);
    },
    
    /**
     * 监听可见文本编辑器变化
     * @param {Function} callback 回调函数
     * @returns {Object} 可释放对象
     */
    onDidChangeVisibleTextEditors: (callback) => {
      return _onDidChangeVisibleTextEditorsEmitter.event(callback);
    },
    
    /**
     * 监听文本编辑器选择变化
     * @param {Function} callback 回调函数
     * @returns {Object} 可释放对象
     */
    onDidChangeTextEditorSelection: (callback) => {
      _onDidChangeTextEditorSelectionEmitter.event(callback);
      return { dispose: () => _onDidChangeTextEditorSelectionEmitter.removeListener('event', callback) };
    },
    
    /**
     * 监听文本编辑器选项变化
     * @param {Function} callback 回调函数
     * @returns {Object} 可释放对象
     */
    onDidChangeTextEditorOptions: (callback) => {
      _onDidChangeTextEditorOptionsEmitter.event(callback);
      return { dispose: () => _onDidChangeTextEditorOptionsEmitter.removeListener('event', callback) };
    },
    
    /**
     * 显示错误消息
     * @param {string} message 消息内容
     * @param {...string} items 按钮项
     * @returns {Promise<string|undefined>} 选择的按钮项
     */
    showErrorMessage: async (message, ...items) => {
      // 获取RooCode配置
      const rooCodeConfig = configManager.getRooCodeConfiguration();
      
      // 根据配置的语言调整消息显示
      const localizedMessage = window._localizeMessage(message, rooCodeConfig.language);
      
      console.error("[VSCode][ErrorMessage]", localizedMessage);
      if (items.length > 0) {
        console.log("[VSCode][ErrorMessage] Available actions:", items);
        // 简单实现：返回第一个按钮
        return items[0];
      }
      return undefined;
    },
    
    /**
     * 显示警告消息
     * @param {string} message 消息内容
     * @param {...string} items 按钮项
     * @returns {Promise<string|undefined>} 选择的按钮项
     */
    showWarningMessage: async (message, ...items) => {
      // 获取RooCode配置
      const rooCodeConfig = configManager.getRooCodeConfiguration();
      
      // 根据配置的语言调整消息显示
      const localizedMessage = window._localizeMessage(message, rooCodeConfig.language);
      
      console.warn("[VSCode][WarningMessage]", localizedMessage);
      if (items.length > 0) {
        console.log("[VSCode][WarningMessage] Available actions:", items);
        // 简单实现：返回第一个按钮
        return items[0];
      }
      return undefined;
    },
    
    /**
     * 显示信息消息
     * @param {string} message 消息内容
     * @param {...string} items 按钮项
     * @returns {Promise<string|undefined>} 选择的按钮项
     */
    showInformationMessage: async (message, ...items) => {
      // 获取RooCode配置
      const rooCodeConfig = configManager.getRooCodeConfiguration();
      
      // 根据配置的语言调整消息显示
      const localizedMessage = window._localizeMessage(message, rooCodeConfig.language);
      
      console.log("[VSCode][InfoMessage]", localizedMessage);
      if (items.length > 0) {
        console.log("[VSCode][InfoMessage] Available actions:", items);
        // 简单实现：返回第一个按钮
        return items[0];
      }
      return undefined;
    },
    
    /**
     * 显示输入框
     * @param {Object} options 输入框选项
     * @returns {Promise<string|undefined>} 输入的文本
     */
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
    
    /**
     * 显示打开文件对话框
     * @param {Object} options 对话框选项
     * @returns {Promise<Uri[]>} 选择的文件URI数组
     */
    showOpenDialog: async (options = {}) => {
      console.log("[VSCode][showOpenDialog]", options);
      // 简单实现：返回模拟结果
      return [];
    },
    
    /**
     * 显示保存文件对话框
     * @param {Object} options 对话框选项
     * @returns {Promise<Uri|undefined>} 保存的文件URI
     */
    showSaveDialog: async (options = {}) => {
      console.log("[VSCode][showSaveDialog]", options);
      // 简单实现：返回模拟结果
      return undefined;
    },
    
    /**
     * 显示文本文档
     * @param {string|Uri|TextDocument} document 文档
     * @param {number} column 视图列
     * @param {boolean} preserveFocus 是否保留焦点
     * @returns {TextEditor} 文本编辑器
     */
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
    
    /**
     * 创建输出通道
     * @param {string} name 通道名称
     * @returns {Object} 输出通道
     */
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
    
    /**
     * 创建状态栏项
     * @param {StatusBarAlignment} alignment 对齐方式
     * @param {number} priority 优先级
     * @returns {Object} 状态栏项
     */
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
    
    /**
     * 显示进度
     * @param {Object} options 进度选项
     * @param {Function} task 进度任务
     * @returns {Promise<any>} 任务结果
     */
    withProgress: (options, task) => {
      console.log("[VSCode][withProgress]", options);
      return task({
        report: (value) => console.log('[Progress.report]', value)
      });
    },
    
    /**
     * 创建快速选择
     * @returns {Object} 快速选择
     */
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
    
    /**
     * 创建输入框
     * @returns {Object} 输入框
     */
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
    
    /**
     * 创建终端
     * @param {Object} options 终端选项
     * @returns {Object} 终端
     */
    createTerminal: (options) => {
      // 获取RooCode配置
      const rooCodeConfig = configManager.getRooCodeConfiguration();
      
      console.log("[VSCode][createTerminal]", options);
      const _emitter = new EventEmitter();
      
      // 检查是否允许使用终端
      if (!rooCodeConfig.alwaysAllowBrowser) {
        console.log("[VSCode][createTerminal] Terminal created with permission check");
      }
      
      return {
        name: options?.name || "terminal",
        processId: Promise.resolve(process.pid),
        sendText: (txt) => {
          // 检查命令是否被允许
          if (!configManager.isCommandAllowedByRooCode(txt)) {
            console.warn(`[Terminal] Command not allowed: ${txt}`);
            return;
          }
          console.log(`[Terminal] ${txt}`);
        },
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
    
    /**
     * 监听终端关闭
     * @param {Function} callback 回调函数
     * @returns {Object} 可释放对象
     */
    onDidCloseTerminal: (callback) => {
      console.log("[VSCode][onDidCloseTerminal]");
      return { dispose: () => {} };
    },
    
    /**
     * 创建文本编辑器装饰类型
     * @param {Object} options 装饰选项
     * @returns {Object} 装饰类型
     */
    createTextEditorDecorationType: (options) => {
      console.log("[VSCode][createTextEditorDecorationType]", options);
      return {
        key: Math.random().toString(36).substring(2),
        dispose: () => {}
      };
    },
    
    /**
     * 创建Webview面板
     * @param {string} viewType 视图类型
     * @param {string} title 标题
     * @param {Object} showOptions 显示选项
     * @param {Object} options 面板选项
     * @returns {Object} Webview面板
     */
    createWebviewPanel: (viewType, title, showOptions, options) => {
      console.log("[VSCode][createWebviewPanel]", viewType, title, showOptions, options);
      // 创建WebviewPanel实例
      const _emitter = new EventEmitter();
      const panel = {
        viewType,
        title,
        visible: true,
        active: true,
        viewColumn: showOptions || ViewColumn.One,
        webview: {
          html: '',
          set html(value) {
            console.log("[WebviewPanel] HTML set:", value);
            this._html = value;
          },
          get html() {
            return this._html || '';
          },
          postMessage: (message) => {
            console.log("[WebviewPanel] postMessage:", message);
            return Promise.resolve(true);
          },
          onDidReceiveMessage: (callback) => {
            _emitter.on('message', callback);
            return { dispose: () => _emitter.removeListener('message', callback) };
          }
        },
        reveal: (viewColumn) => {
          console.log("[WebviewPanel] reveal:", viewColumn);
          this.viewColumn = viewColumn || this.viewColumn;
          this.visible = true;
          this.active = true;
        },
        dispose: () => {
          console.log("[WebviewPanel] dispose");
          this.visible = false;
          this.active = false;
          _emitter.removeAllListeners();
        }
      };
      return panel;
    },
    
    /**
     * 注册Webview视图提供者
     * @param {string} viewType 视图类型
     * @param {Object} provider 提供者
     * @param {Object} options 选项
     * @returns {Object} 可释放对象
     */
    registerWebviewViewProvider: (viewType, provider, options) => {
      console.log("[VSCode][registerWebviewViewProvider]", viewType, options);
      _webviewViewProviders.set(viewType, provider);
      
      return {
        dispose: () => {
          _webviewViewProviders.delete(viewType);
          console.log("[VSCode][registerWebviewViewProvider] Disposed", viewType);
        }
      };
    },
    
    /**
     * 标签组
     */
    tabGroups: _tabGroups,
    
    /**
     * 本地化消息
     * @param {string} message 消息内容
     * @param {string} language 语言代码
     * @returns {string} 本地化后的消息
     * @private
     */
    _localizeMessage: (message, language) => {
      // 简单实现：根据语言代码返回不同的消息
      // 在实际应用中，这里应该使用更复杂的本地化系统
      if (language === 'zh-CN') {
        // 这里可以添加中文翻译逻辑
        return message;
      }
      return message;
    }
  };
})();

module.exports = {
  // 类
  TextEditor,
  TextDocument,
  Tab,
  TabGroup,
  TabGroups,
  
  // window 对象
  window,
  
  // 常量
  ViewColumn
};