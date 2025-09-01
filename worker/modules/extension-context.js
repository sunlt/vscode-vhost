const path = require("path");
const fs = require("fs");
const { Uri, VSCodeEventEmitter, Disposable } = require('./base-types');

/**
 * Memento类 - 用于存储键值对
 */
class Memento {
  /**
   * 创建Memento实例
   * @param {string} file 存储文件路径
   */
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

  /**
   * 获取值
   * @param {string} key 键
   * @param {any} defaultValue 默认值
   * @returns {any} 值
   */
  get(key, defaultValue) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  /**
   * 更新值
   * @param {string} key 键
   * @param {any} value 值
   * @returns {Promise<void>}
   */
  async update(key, value) {
    this.data[key] = value;
    await fs.promises.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }
  
  /**
   * 获取所有键
   * @returns {string[]} 键数组
   */
  keys() {
    return Object.keys(this.data);
  }
}

/**
 * ExtensionContext类 - 扩展上下文
 */
class ExtensionContext {
  /**
   * 创建扩展上下文实例
   * @param {string} extensionPath 扩展路径
   * @param {string} extensionId 扩展ID
   */
  constructor(extensionPath, extensionId) {
    this.subscriptions = [];
    this.extensionPath = extensionPath;
    this.extensionUri = Uri.file(extensionPath);
    this.extensionId = extensionId;
    this.extensionMode = 1; // ExtensionMode.Development
    
    // 创建存储文件路径
    const storageFile = path.join(extensionPath, `.roo-shim-${extensionId}-globalState.json`);
    const workspaceFile = path.join(process.cwd(), `.roo-shim-${extensionId}-workspaceState.json`);
    
    // 初始化存储
    this.globalState = new Memento(storageFile);
    this.workspaceState = new Memento(workspaceFile);
    
    // 初始化其他属性
    this.secrets = {
      get: async (key) => {
        console.log(`[ExtensionContext.secrets.get] ${key}`);
        // 简单实现：返回undefined
        return undefined;
      },
      store: async (key, value) => {
        console.log(`[ExtensionContext.secrets.store] ${key}`);
        // 简单实现：不存储任何值
      },
      delete: async (key) => {
        console.log(`[ExtensionContext.secrets.delete] ${key}`);
        // 简单实现：不执行任何操作
      },
      onDidChange: (callback) => {
        console.log('[ExtensionContext.secrets.onDidChange]');
        // 返回一个可释放的对象
        return { dispose: () => {} };
      },
    };
    
    this.storageUri = Uri.file(path.join(process.cwd(), `.roo-shim-${extensionId}-storage`));
    this.globalStorageUri = Uri.file(path.join(process.cwd(), `.roo-shim-${extensionId}-global`));
    this.logUri = Uri.file(path.join(process.cwd(), `.roo-shim-${extensionId}-logs`));
    
    this.environmentVariableCollection = {
      replace: (variable, value) => {
        console.log(`[ExtensionContext.environmentVariableCollection.replace] ${variable}=${value}`);
        // 简单实现：不执行任何操作
      },
      append: (variable, value) => {
        console.log(`[ExtensionContext.environmentVariableCollection.append] ${variable}+=${value}`);
        // 简单实现：不执行任何操作
      },
      prepend: (variable, value) => {
        console.log(`[ExtensionContext.environmentVariableCollection.prepend] ${variable}=${value}+`);
        // 简单实现：不执行任何操作
      },
      get: (variable) => {
        console.log(`[ExtensionContext.environmentVariableCollection.get] ${variable}`);
        // 简单实现：返回undefined
        return undefined;
      },
      forEach: (callback) => {
        console.log('[ExtensionContext.environmentVariableCollection.forEach]');
        // 简单实现：不执行任何操作
      },
      delete: (variable) => {
        console.log(`[ExtensionContext.environmentVariableCollection.delete] ${variable}`);
        // 简单实现：不执行任何操作
      },
      clear: () => {
        console.log('[ExtensionContext.environmentVariableCollection.clear]');
        // 简单实现：不执行任何操作
      }
    };
    
    this.extension = {
      id: extensionId,
      extensionUri: this.extensionUri,
      extensionPath: this.extensionPath,
      isActive: true,
      packageJSON: {},
      exports: undefined,
      activate: async () => {}
    };
  }

  /**
   * 释放资源
   */
  dispose() {
    // 释放所有订阅
    this.subscriptions.forEach(subscription => {
      if (subscription && typeof subscription.dispose === 'function') {
        subscription.dispose();
      }
    });
    this.subscriptions = [];
    
    console.log(`[ExtensionContext] Disposed: ${this.extensionId}`);
  }
}

/**
 * ExtensionActivator类 - 扩展激活器
 */
class ExtensionActivator {
  constructor() {
    this._extensions = new Map();
    this._activeExtensions = new Map();
    this._extensionContexts = new Map();
    this._onDidActivateExtensionEmitter = new VSCodeEventEmitter();
    this._onDidDeactivateExtensionEmitter = new VSCodeEventEmitter();
  }

  /**
   * 注册扩展
   * @param {string} id 扩展ID
   * @param {string} extensionPath 扩展路径
   * @param {Function} activate 激活函数
   * @param {Function} deactivate 停用函数
   * @param {Object} packageJSON package.json内容
   * @returns {Object} 可释放对象
   */
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

  /**
   * 激活扩展
   * @param {string} id 扩展ID
   * @param {ExtensionContext} context 扩展上下文
   * @returns {Promise<any>} 扩展导出
   */
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
        extension: {
          id,
          extensionPath: extensionInfo.extensionPath,
          extensionUri: Uri.file(extensionInfo.extensionPath),
          packageJSON: extensionInfo.packageJSON,
          isActive: true,
          exports: result
        }
      });
      
      console.log(`[ExtensionActivator] Extension activated: ${id}`);
      return result;
    } catch (error) {
      console.error(`[ExtensionActivator] Failed to activate extension ${id}:`, error);
      throw error;
    }
  }

  /**
   * 停用扩展
   * @param {string} id 扩展ID
   */
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
        extension: {
          id,
          extensionPath: extensionInfo.extensionPath,
          extensionUri: Uri.file(extensionInfo.extensionPath),
          packageJSON: extensionInfo.packageJSON,
          isActive: false,
          exports: this._activeExtensions.get(id)
        }
      });
      
      console.log(`[ExtensionActivator] Extension deactivated: ${id}`);
    } catch (error) {
      console.error(`[ExtensionActivator] Failed to deactivate extension ${id}:`, error);
      throw error;
    }
  }

  /**
   * 获取扩展上下文
   * @param {string} id 扩展ID
   * @returns {ExtensionContext|undefined} 扩展上下文
   */
  getExtensionContext(id) {
    return this._extensionContexts.get(id);
  }

  /**
   * 检查扩展是否已激活
   * @param {string} id 扩展ID
   * @returns {boolean} 是否已激活
   */
  isExtensionActive(id) {
    const extensionInfo = this._extensions.get(id);
    return extensionInfo ? extensionInfo.isActive : false;
  }

  /**
   * 获取所有已激活的扩展
   * @returns {string[]} 扩展ID数组
   */
  getActiveExtensions() {
    return Array.from(this._activeExtensions.keys());
  }

  /**
   * 监听扩展激活事件
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidActivateExtension(callback) {
    return this._onDidActivateExtensionEmitter.event(callback);
  }

  /**
   * 监听扩展停用事件
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidDeactivateExtension(callback) {
    return this._onDidDeactivateExtensionEmitter.event(callback);
  }

  /**
   * 停用所有扩展
   */
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

/**
 * 创建扩展上下文
 * @param {string} extensionPath 扩展路径
 * @param {string} extensionId 扩展ID
 * @returns {ExtensionContext} 扩展上下文
 */
function createExtensionContext(extensionPath, extensionId) {
  return new ExtensionContext(extensionPath, extensionId);
}

module.exports = {
  // 类
  Memento,
  ExtensionContext,
  ExtensionActivator,
  
  // 工厂函数
  createExtensionContext
};