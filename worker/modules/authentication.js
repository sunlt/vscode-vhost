const { VSCodeEventEmitter } = require('./base-types');

/**
 * AuthenticationSession类 - 认证会话
 */
class AuthenticationSession {
  /**
   * 创建认证会话实例
   * @param {string} id 会话ID
   * @param {Object} account 账户信息
   * @param {string[]} scopes 权限范围
   * @param {string} accessToken 访问令牌
   */
  constructor(id, account, scopes, accessToken) {
    this.id = id;
    this.account = account;
    this.scopes = scopes;
    this.accessToken = accessToken;
  }
}

/**
 * AuthenticationProvider类 - 认证提供者
 */
class AuthenticationProvider {
  /**
   * 创建认证提供者实例
   * @param {string} id 提供者ID
   */
  constructor(id) {
    this.id = id;
    this._onDidChangeSessionsEmitter = new VSCodeEventEmitter();
  }

  /**
   * 获取会话变化事件
   * @returns {Function} 事件监听器
   */
  get onDidChangeSessions() {
    return this._onDidChangeSessionsEmitter.event;
  }

  /**
   * 获取会话
   * @param {string[]} scopes 权限范围
   * @param {Object} options 选项
   * @returns {Promise<AuthenticationSession|undefined>} 认证会话
   */
  async getSession(scopes, options) {
    console.log(`[AuthenticationProvider] getSession for ${this.id}`, scopes, options);
    // 在实际环境中，这里会调用认证提供者的实现
    return undefined;
  }

  /**
   * 创建会话
   * @param {string[]} scopes 权限范围
   * @returns {Promise<AuthenticationSession|undefined>} 认证会话
   */
  async createSession(scopes) {
    console.log(`[AuthenticationProvider] createSession for ${this.id}`, scopes);
    // 在实际环境中，这里会创建新的认证会话
    return undefined;
  }

  /**
   * 移除会话
   * @param {string} sessionId 会话ID
   */
  async removeSession(sessionId) {
    console.log(`[AuthenticationProvider] removeSession for ${this.id}`, sessionId);
    // 在实际环境中，这里会移除认证会话
  }
}

// Authentication 模块
const authentication = {
  // 所有认证提供者的映射
  _providers: new Map(),
  
  /**
   * 注册认证提供者
   * @param {string} id 提供者ID
   * @param {Object} provider 提供者
   * @returns {Object} 可释放对象
   */
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
  
  /**
   * 获取认证会话
   * @param {string} providerId 提供者ID
   * @param {string[]} scopes 权限范围
   * @param {Object} options 选项
   * @returns {Promise<AuthenticationSession|undefined>} 认证会话
   */
  getSession: async (providerId, scopes, options) => {
    console.log(`[authentication.getSession] ${providerId}`, scopes, options);
    const provider = authentication._providers.get(providerId);
    if (provider) {
      return await provider.getSession(scopes, options);
    }
    return undefined;
  },
  
  /**
   * 创建认证会话
   * @param {string} providerId 提供者ID
   * @param {string[]} scopes 权限范围
   * @returns {Promise<AuthenticationSession|undefined>} 认证会话
   */
  createSession: async (providerId, scopes) => {
    console.log(`[authentication.createSession] ${providerId}`, scopes);
    const provider = authentication._providers.get(providerId);
    if (provider && provider.createSession) {
      return await provider.createSession(scopes);
    }
    return undefined;
  },
  
  /**
   * 移除认证会话
   * @param {string} providerId 提供者ID
   * @param {string} sessionId 会话ID
   */
  removeSession: async (providerId, sessionId) => {
    console.log(`[authentication.removeSession] ${providerId}`, sessionId);
    const provider = authentication._providers.get(providerId);
    if (provider && provider.removeSession) {
      await provider.removeSession(sessionId);
    }
  },
  
  /**
   * 监听认证会话变化
   * @param {Function} callback 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeSessions: (callback) => {
    console.log('[authentication.onDidChangeSessions]');
    // 在实际环境中，这里会监听所有提供者的会话变化
    return { dispose: () => {} };
  },
  
  /**
   * 获取所有认证提供者
   * @returns {string[]} 提供者ID数组
   */
  getProviders: () => {
    console.log('[authentication.getProviders]');
    return Array.from(authentication._providers.keys());
  }
};

module.exports = {
  // 类
  AuthenticationSession,
  AuthenticationProvider,
  
  // authentication 对象
  authentication
};