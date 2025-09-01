const baseTypes = require('./modules/base-types');
const window = require('./modules/window');
const workspace = require('./modules/workspace');
const commands = require('./modules/commands');
const languages = require('./modules/languages');
const env = require('./modules/env');
const extensions = require('./modules/extensions');
const authentication = require('./modules/authentication');
const webview = require('./modules/webview');
const { ExtensionActivator, createExtensionContext } = require('./modules/extension-context');
const { configManager } = require('./modules/config');

// 创建扩展激活器实例
const extensionActivator = new ExtensionActivator();

/**
 * 创建VSCode API
 * @param {Object} options 选项
 * @param {Function} options.log 日志函数
 * @param {Function} options.registerCommand 命令注册函数
 * @param {string} options.workspaceRoot 工作目录路径，如果未指定则使用process.cwd()
 * @param {Object} options.rooCodeSettings RooCode配置对象
 * @param {Function} options.persistStorage 持久化存储函数
 * @returns {Object} VSCode API
 */
module.exports = function createVscodeApi(options) {
  // 处理无效配置
  if (!options) {
    options = {};
  }
  
  const { log, registerCommand, workspaceRoot, rooCodeSettings, persistStorage } = options;
  
  // 设置配置
  if (options) {
    configManager.setConfig(options);
  }
  
  // 设置工作目录
  configManager.setWorkspaceRoot(workspaceRoot);
  
  // 设置日志函数
  configManager.setLogFunction(log);
  
  // 设置命令注册函数
  configManager.setRegisterCommandFunction(registerCommand);
  
  // 设置持久化存储函数
  configManager.setPersistStorageFunction(persistStorage);
  
  // 设置RooCode配置
  if (rooCodeSettings) {
    configManager.setRooCodeConfig(rooCodeSettings);
  }
  
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
    const originalRegisterCommand = commands.commands.registerCommand;
    commands.commands.registerCommand = (id, handler) => {
      registerCommand(id, handler);
      return originalRegisterCommand(id, handler);
    };
  }

  // 创建RooCode API
  const rooCodeApi = {
    /**
     * 获取当前配置
     * @returns {Object} 当前配置
     */
    getConfiguration() {
      return configManager.getRooCodeConfiguration();
    },
    
    /**
     * 设置配置
     * @param {Object} config 要设置的配置
     * @returns {Promise<void>}
     */
    async setConfiguration(config) {
      return new Promise((resolve, reject) => {
        try {
          configManager.setRooCodeConfig(config);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    },
    
    /**
     * 更新配置的部分参数
     * @param {Object} config 要更新的配置
     * @returns {Promise<void>}
     */
    async updateConfiguration(config) {
      return new Promise((resolve, reject) => {
        try {
          configManager.updateRooCodeConfig(config);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    },
    
    /**
     * 重置配置为默认值
     * @returns {Promise<void>}
     */
    async resetConfiguration() {
      return new Promise((resolve, reject) => {
        try {
          configManager.resetRooCodeConfig();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }
  };

  // 返回完整的VSCode API
  return {
    // 基础类型
    ...baseTypes,
    
    // window 模块
    ...window,
    
    // workspace 模块
    ...workspace,
    
    // commands 模块
    ...commands,
    
    // languages 模块
    ...languages,
    
    // env 模块
    ...env,
    
    // extensions 模块
    ...extensions,
    
    // authentication 模块
    ...authentication,
    
    // webview 模块
    ...webview,
    
    // 扩展上下文相关
    ExtensionContext: require('./modules/extension-context').ExtensionContext,
    Memento: require('./modules/extension-context').Memento,
    ExtensionActivator: require('./modules/extension-context').ExtensionActivator,
    extensionActivator,
    createExtensionContext,
    
    // RooCode API
    rooCode: rooCodeApi
  };
};