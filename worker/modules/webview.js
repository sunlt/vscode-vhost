const { VSCodeEventEmitter, Uri } = require('./base-types');

/**
 * WebviewOptions类 - Webview选项
 */
class WebviewOptions {
  /**
   * 创建Webview选项实例
   * @param {Object} options 选项
   */
  constructor(options = {}) {
    this.enableScripts = options.enableScripts || false;
    this.enableCommandUris = options.enableCommandUris || false;
    this.localResourceRoots = options.localResourceRoots || [];
  }
}

/**
 * WebviewPanelOptions类 - Webview面板选项
 */
class WebviewPanelOptions {
  /**
   * 创建Webview面板选项实例
   * @param {Object} options 选项
   */
  constructor(options = {}) {
    this.enableFindWidget = options.enableFindWidget || false;
    this.retainContextWhenHidden = options.retainContextWhenHidden || false;
  }
}

/**
 * Webview类 - Webview实现
 */
class Webview {
  /**
   * 创建Webview实例
   * @param {Object} options 选项
   */
  constructor(options = {}) {
    this.options = new WebviewOptions(options);
    this.html = '';
    this.cspSource = '';
    this._onDidReceiveMessageEmitter = new VSCodeEventEmitter();
  }

  /**
   * 设置HTML内容
   * @param {string} value HTML内容
   */
  set html(value) {
    this._html = value;
    console.log('[Webview] HTML content set');
  }

  /**
   * 获取HTML内容
   * @returns {string} HTML内容
   */
  get html() {
    return this._html;
  }

  /**
   * 将本地资源转换为Webview URI
   * @param {Uri} localResource 本地资源
   * @returns {Uri} Webview URI
   */
  asWebviewUri(localResource) {
    console.log('[Webview] asWebviewUri', localResource);
    // 在实际环境中，这里会将本地资源转换为Webview可访问的URI
    return localResource;
  }

  /**
   * 发送消息到Webview
   * @param {any} message 消息
   * @returns {Promise<boolean>} 是否成功
   */
  async postMessage(message) {
    console.log('[Webview] postMessage', message);
    // 在实际环境中，这里会发送消息到Webview
    return true;
  }

  /**
   * 监听来自Webview的消息
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidReceiveMessage(callback) {
    return this._onDidReceiveMessageEmitter.event(callback);
  }
}

/**
 * WebviewPanel类 - Webview面板实现
 */
class WebviewPanelImpl {
  /**
   * 创建Webview面板实例
   * @param {string} viewType 视图类型
   * @param {string} title 标题
   * @param {Object} showOptions 显示选项
   * @param {Object} options 面板选项
   */
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

  /**
   * 获取是否可见
   * @returns {boolean} 是否可见
   */
  get visible() {
    return this._visible;
  }

  /**
   * 获取是否活动
   * @returns {boolean} 是否活动
   */
  get active() {
    return this._active;
  }

  /**
   * 显示面板
   * @param {number} viewColumn 视图列
   */
  reveal(viewColumn) {
    console.log('[WebviewPanel] reveal', viewColumn);
    this._visible = true;
    this._active = true;
    this._onDidChangeViewStateEmitter.fire({ webviewPanel: this });
  }

  /**
   * 处理面板
   */
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

  /**
   * 监听面板处理事件
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidDispose(callback) {
    return this._onDidDisposeEmitter.event(callback);
  }

  /**
   * 监听视图状态变化事件
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeViewState(callback) {
    return this._onDidChangeViewStateEmitter.event(callback);
  }
}

/**
 * WebviewView类 - Webview视图实现
 */
class WebviewView {
  /**
   * 创建Webview视图实例
   * @param {Webview} webview Webview
   * @param {Object} options 选项
   */
  constructor(webview, options = {}) {
    this.webview = webview;
    this.options = options;
    this._visible = true;
    this._onDidChangeVisibilityEmitter = new VSCodeEventEmitter();
    this._onDisposeEmitter = new VSCodeEventEmitter();
  }

  /**
   * 获取是否可见
   * @returns {boolean} 是否可见
   */
  get visible() {
    return this._visible;
  }

  /**
   * 显示视图
   */
  show() {
    console.log('[WebviewView] show');
    this._visible = true;
    this._onDidChangeVisibilityEmitter.fire({ webviewView: this });
  }

  /**
   * 处理视图
   */
  dispose() {
    console.log('[WebviewView] dispose');
    this._onDisposeEmitter.fire();
    this._onDisposeEmitter.removeAllListeners();
    this._onDidChangeVisibilityEmitter.removeAllListeners();
  }

  /**
   * 监听可见性变化
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeVisibility(callback) {
    return this._onDidChangeVisibilityEmitter.event(callback);
  }

  /**
   * 监听处理事件
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDispose(callback) {
    return this._onDisposeEmitter.event(callback);
  }
}

// Webview 模块
const webview = {
  /**
   * 创建Webview面板
   * @param {string} viewType 视图类型
   * @param {string} title 标题
   * @param {Object} showOptions 显示选项
   * @param {Object} options 面板选项
   * @returns {WebviewPanelImpl} Webview面板
   */
  createWebviewPanel: (viewType, title, showOptions, options = {}) => {
    console.log('[webview.createWebviewPanel]', viewType, title, showOptions, options);
    const panel = new WebviewPanelImpl(viewType, title, showOptions, options);
    return panel;
  },
  
  /**
   * 注册Webview视图提供者
   * @param {string} viewType 视图类型
   * @param {Object} provider 提供者
   * @param {Object} options 选项
   * @returns {Object} 可释放对象
   */
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

module.exports = {
  // 类
  WebviewPanel,
  WebviewOptions,
  WebviewPanelOptions,
  Webview,
  WebviewPanelImpl,
  WebviewView,
  
  // webview 对象
  webview
};