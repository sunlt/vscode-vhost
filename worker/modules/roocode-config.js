/**
 * RooCode配置模块
 * 定义RooCodeSettings类型和相关配置管理功能
 */

/**
 * RooCodeSettings类型定义
 * 包含所有RooCode插件的配置参数
 */
class RooCodeSettings {
  constructor() {
    // AI提供商与模型配置
    this.apiProvider = 'openai'; // 默认使用OpenAI
    this.openAiApiKey = '';
    this.openAiModelId = 'gpt-4-turbo';
    this.openAiBaseUrl = '';
    this.anthropicApiKey = '';
    this.apiModelId = 'claude-3-opus-20240229';
    this.ollamaModelId = '';
    this.ollamaBaseUrl = '';
    this.openRouterApiKey = '';
    this.openRouterModelId = '';
    this.geminiApiKey = '';
    this.modelTemperature = 0.7;
    this.modelMaxTokens = 4000;

    // 安全与权限配置
    this.allowedCommands = [];
    this.deniedCommands = [];
    this.alwaysAllowExecute = false;
    this.alwaysAllowWrite = false;
    this.alwaysAllowReadOnly = false;
    this.alwaysAllowBrowser = false;
    this.alwaysAllowSubtasks = false;

    // 功能与行为配置
    this.customInstructions = '';
    this.diffEnabled = true;
    this.enableCheckpoints = false;
    this.writeDelayMs = 500;
    this.terminalOutputLineLimit = 100;
    this.language = 'en';

    // 内部状态与历史
    this.currentApiConfigName = '';
    this.listApiConfigMeta = [];
    this.taskHistory = [];
  }

  /**
   * 验证配置参数
   * @param {Partial<RooCodeSettings>} config 要验证的配置
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validate(config) {
    const errors = [];

    // 验证AI提供商配置
    if (config.apiProvider && typeof config.apiProvider !== 'string') {
      errors.push('apiProvider must be a string');
    }

    // 验证API密钥
    if (config.openAiApiKey && typeof config.openAiApiKey !== 'string') {
      errors.push('openAiApiKey must be a string');
    }

    if (config.anthropicApiKey && typeof config.anthropicApiKey !== 'string') {
      errors.push('anthropicApiKey must be a string');
    }

    if (config.openRouterApiKey && typeof config.openRouterApiKey !== 'string') {
      errors.push('openRouterApiKey must be a string');
    }

    if (config.geminiApiKey && typeof config.geminiApiKey !== 'string') {
      errors.push('geminiApiKey must be a string');
    }

    // 验证模型ID
    if (config.openAiModelId && typeof config.openAiModelId !== 'string') {
      errors.push('openAiModelId must be a string');
    }

    if (config.apiModelId && typeof config.apiModelId !== 'string') {
      errors.push('apiModelId must be a string');
    }

    if (config.ollamaModelId && typeof config.ollamaModelId !== 'string') {
      errors.push('ollamaModelId must be a string');
    }

    if (config.openRouterModelId && typeof config.openRouterModelId !== 'string') {
      errors.push('openRouterModelId must be a string');
    }

    // 验证URL
    if (config.openAiBaseUrl && typeof config.openAiBaseUrl !== 'string') {
      errors.push('openAiBaseUrl must be a string');
    }

    if (config.ollamaBaseUrl && typeof config.ollamaBaseUrl !== 'string') {
      errors.push('ollamaBaseUrl must be a string');
    }

    // 验证数值参数
    if (config.modelTemperature !== undefined && 
        (typeof config.modelTemperature !== 'number' || 
         config.modelTemperature < 0 || 
         config.modelTemperature > 1)) {
      errors.push('modelTemperature must be a number between 0 and 1');
    }

    if (config.modelMaxTokens !== undefined && 
        (typeof config.modelMaxTokens !== 'number' || 
         config.modelMaxTokens <= 0)) {
      errors.push('modelMaxTokens must be a positive number');
    }

    // 验证命令列表
    if (config.allowedCommands !== undefined && !Array.isArray(config.allowedCommands)) {
      errors.push('allowedCommands must be an array');
    } else if (config.allowedCommands) {
      for (let i = 0; i < config.allowedCommands.length; i++) {
        if (typeof config.allowedCommands[i] !== 'string') {
          errors.push(`allowedCommands[${i}] must be a string`);
        }
      }
    }

    if (config.deniedCommands !== undefined && !Array.isArray(config.deniedCommands)) {
      errors.push('deniedCommands must be an array');
    } else if (config.deniedCommands) {
      for (let i = 0; i < config.deniedCommands.length; i++) {
        if (typeof config.deniedCommands[i] !== 'string') {
          errors.push(`deniedCommands[${i}] must be a string`);
        }
      }
    }

    // 验证布尔值参数
    const booleanParams = [
      'alwaysAllowExecute', 'alwaysAllowWrite', 'alwaysAllowReadOnly',
      'alwaysAllowBrowser', 'alwaysAllowSubtasks', 'diffEnabled', 'enableCheckpoints'
    ];

    for (const param of booleanParams) {
      if (config[param] !== undefined && typeof config[param] !== 'boolean') {
        errors.push(`${param} must be a boolean`);
      }
    }

    // 验证其他字符串参数
    if (config.customInstructions !== undefined && typeof config.customInstructions !== 'string') {
      errors.push('customInstructions must be a string');
    }

    if (config.language !== undefined && typeof config.language !== 'string') {
      errors.push('language must be a string');
    }

    if (config.currentApiConfigName !== undefined && typeof config.currentApiConfigName !== 'string') {
      errors.push('currentApiConfigName must be a string');
    }

    // 验证数值参数
    if (config.writeDelayMs !== undefined && 
        (typeof config.writeDelayMs !== 'number' || 
         config.writeDelayMs < 0)) {
      errors.push('writeDelayMs must be a non-negative number');
    }

    if (config.terminalOutputLineLimit !== undefined && 
        (typeof config.terminalOutputLineLimit !== 'number' || 
         config.terminalOutputLineLimit <= 0)) {
      errors.push('terminalOutputLineLimit must be a positive number');
    }

    // 验证数组参数
    if (config.listApiConfigMeta !== undefined && !Array.isArray(config.listApiConfigMeta)) {
      errors.push('listApiConfigMeta must be an array');
    }

    if (config.taskHistory !== undefined && !Array.isArray(config.taskHistory)) {
      errors.push('taskHistory must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 合并配置
   * @param {Partial<RooCodeSettings>} config 要合并的配置
   * @returns {RooCodeSettings} 合并后的配置
   */
  merge(config) {
    const validation = RooCodeSettings.validate(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const merged = new RooCodeSettings();
    Object.assign(merged, this, config);
    return merged;
  }

  /**
   * 获取默认配置
   * @returns {RooCodeSettings} 默认配置
   */
  static getDefault() {
    return new RooCodeSettings();
  }

  /**
   * 从对象创建配置
   * @param {Object} obj 配置对象
   * @returns {RooCodeSettings} 配置实例
   */
  static fromObject(obj) {
    const config = new RooCodeSettings();
    Object.assign(config, obj);
    return config;
  }

  /**
   * 转换为普通对象
   * @returns {Object} 普通对象
   */
  toObject() {
    return { ...this };
  }

  /**
   * 克隆配置
   * @returns {RooCodeSettings} 克隆的配置
   */
  clone() {
    return RooCodeSettings.fromObject(this.toObject());
  }

  /**
   * 序列化配置为JSON字符串
   * @returns {string} JSON字符串
   */
  serialize() {
    return JSON.stringify(this.toObject());
  }

  /**
   * 从JSON字符串反序列化配置
   * @param {string} json JSON字符串
   * @returns {RooCodeSettings} 配置实例
   */
  static deserialize(json) {
    try {
      const obj = JSON.parse(json);
      return RooCodeSettings.fromObject(obj);
    } catch (error) {
      throw new Error(`Failed to deserialize configuration: ${error.message}`);
    }
  }

  /**
   * 验证当前配置是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    const validation = RooCodeSettings.validate(this);
    return validation.isValid;
  }

  /**
   * 获取配置验证错误
   * @returns {string[]} 错误列表
   */
  getValidationErrors() {
    const validation = RooCodeSettings.validate(this);
    return validation.errors;
  }

  /**
   * 重置为默认值
   */
  reset() {
    const defaultConfig = RooCodeSettings.getDefault();
    Object.assign(this, defaultConfig);
  }

  /**
   * 更新配置
   * @param {Partial<RooCodeSettings>} config 要更新的配置
   */
  update(config) {
    const validation = RooCodeSettings.validate(config);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }
    Object.assign(this, config);
  }

  /**
   * 计算与另一个配置的差异
   * @param {RooCodeSettings} other 另一个配置
   * @returns {Object} 差异对象
   */
  diff(other) {
    const diff = {};
    const thisObj = this.toObject();
    const otherObj = other.toObject();

    for (const key in thisObj) {
      if (thisObj[key] !== otherObj[key]) {
        diff[key] = {
          from: thisObj[key],
          to: otherObj[key]
        };
      }
    }

    return diff;
  }
}

/**
 * RooCode配置管理器
 */
class RooCodeConfigManager {
  constructor() {
    this._config = RooCodeSettings.getDefault();
    this._persistCallback = null;
  }

  /**
   * 获取当前配置
   * @returns {RooCodeSettings} 当前配置
   */
  getConfig() {
    return this._config.clone();
  }

  /**
   * 设置配置
   * @param {Partial<RooCodeSettings>} config 要设置的配置
   */
  setConfig(config) {
    const validation = RooCodeSettings.validate(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this._config = this._config.merge(config);
    
    // 如果有持久化回调，则调用它
    if (this._persistCallback) {
      this._persistCallback(this._config.toObject());
    }
  }

  /**
   * 更新配置的部分参数
   * @param {Partial<RooCodeSettings>} config 要更新的配置
   */
  updateConfig(config) {
    this.setConfig(config);
  }

  /**
   * 重置为默认配置
   */
  resetToDefault() {
    this._config = RooCodeSettings.getDefault();
    
    // 如果有持久化回调，则调用它
    if (this._persistCallback) {
      this._persistCallback(this._config.toObject());
    }
  }

  /**
   * 设置持久化回调
   * @param {Function} callback 持久化回调函数
   */
  setPersistCallback(callback) {
    this._persistCallback = callback;
  }

  /**
   * 检查命令是否被允许
   * @param {string} command 要检查的命令
   * @returns {boolean} 是否允许
   */
  isCommandAllowed(command) {
    // 如果在拒绝列表中，直接拒绝
    if (this._config.deniedCommands.some(denied => command.startsWith(denied))) {
      return false;
    }

    // 如果允许列表为空或包含通配符，允许所有命令
    if (this._config.allowedCommands.length === 0 || this._config.allowedCommands.includes('*')) {
      return true;
    }

    // 检查是否在允许列表中
    return this._config.allowedCommands.some(allowed => command.startsWith(allowed));
  }

  /**
   * 获取AI提供商配置
   * @returns {Object} AI提供商配置
   */
  getProviderConfig() {
    const provider = this._config.apiProvider;
    
    switch (provider) {
      case 'openai':
        return {
          provider: 'openai',
          apiKey: this._config.openAiApiKey,
          modelId: this._config.openAiModelId,
          baseUrl: this._config.openAiBaseUrl,
          temperature: this._config.modelTemperature,
          maxTokens: this._config.modelMaxTokens
        };
      
      case 'anthropic':
        return {
          provider: 'anthropic',
          apiKey: this._config.anthropicApiKey,
          modelId: this._config.apiModelId,
          temperature: this._config.modelTemperature,
          maxTokens: this._config.modelMaxTokens
        };
      
      case 'ollama':
        return {
          provider: 'ollama',
          modelId: this._config.ollamaModelId,
          baseUrl: this._config.ollamaBaseUrl,
          temperature: this._config.modelTemperature,
          maxTokens: this._config.modelMaxTokens
        };
      
      case 'openrouter':
        return {
          provider: 'openrouter',
          apiKey: this._config.openRouterApiKey,
          modelId: this._config.openRouterModelId,
          temperature: this._config.modelTemperature,
          maxTokens: this._config.modelMaxTokens
        };
      
      case 'gemini':
        return {
          provider: 'gemini',
          apiKey: this._config.geminiApiKey,
          temperature: this._config.modelTemperature,
          maxTokens: this._config.modelMaxTokens
        };
      
      default:
        throw new Error(`Unsupported API provider: ${provider}`);
    }
  }
}

// 创建全局配置管理器实例
const rooCodeConfigManager = new RooCodeConfigManager();

module.exports = {
  RooCodeSettings,
  RooCodeConfigManager,
  rooCodeConfigManager
};