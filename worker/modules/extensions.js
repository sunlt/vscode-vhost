const { Uri } = require('./base-types');

/**
 * Extension类 - 扩展信息
 */
class Extension {
  /**
   * 创建扩展实例
   * @param {string} id 扩展ID
   * @param {string} extensionPath 扩展路径
   * @param {Object} packageJSON package.json内容
   */
  constructor(id, extensionPath, packageJSON) {
    this.id = id;
    this.extensionPath = extensionPath;
    this.extensionUri = Uri.file(extensionPath);
    this.packageJSON = packageJSON || {};
    this.isActive = false;
    this.exports = undefined;
    this.extensionKind = ['workspace'];
  }

  /**
   * 激活扩展
   * @returns {Promise<any>} 扩展导出
   */
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
  
  /**
   * 获取扩展
   * @param {string} id 扩展ID
   * @returns {Extension|null} 扩展实例
   */
  getExtension: (id) => {
    console.log(`[extensions.getExtension] ${id}`);
    return extensions._extensions.get(id) || null;
  },
  
  /**
   * 获取所有扩展
   * @returns {Extension[]} 扩展数组
   */
  getAllExtensions: () => {
    console.log('[extensions.getAllExtensions]');
    return Array.from(extensions._extensions.values());
  },
  
  /**
   * 注册扩展
   * @param {string} id 扩展ID
   * @param {string} extensionPath 扩展路径
   * @param {Object} packageJSON package.json内容
   * @returns {Extension} 扩展实例
   */
  registerExtension: (id, extensionPath, packageJSON) => {
    console.log(`[extensions.registerExtension] ${id}`);
    const extension = new Extension(id, extensionPath, packageJSON);
    extensions._extensions.set(id, extension);
    return extension;
  },
  
  /**
   * 激活扩展
   * @param {string} id 扩展ID
   * @returns {Promise<any>} 扩展导出
   */
  activateExtension: async (id) => {
    console.log(`[extensions.activateExtension] ${id}`);
    const extension = extensions._extensions.get(id);
    if (extension) {
      return await extension.activate();
    }
    return undefined;
  },
  
  /**
   * 当扩展发生变化时触发
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChange: (callback) => {
    console.log('[extensions.onDidChange]');
    // 返回一个可释放的对象
    return { dispose: () => {} };
  }
};

module.exports = {
  // 类
  Extension,
  
  // extensions 对象
  extensions
};