const path = require("path");
const { Uri } = require('./base-types');
const child_process = require("child_process");

// 创建env对象
const env = {
  // VSCode应用程序根目录
  appRoot: process.cwd(),
  
  // 当前会话ID
  sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
  
  // 剪贴板功能
  clipboard: {
    /**
     * 写入文本到剪贴板
     * @param {string} text 要写入的文本
     * @returns {Promise<boolean>} 是否成功
     */
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
    
    /**
     * 从剪贴板读取文本
     * @returns {Promise<string>} 剪贴板中的文本
     */
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
  
  /**
   * 将URI转换为外部URI
   * @param {Uri} uri URI
   * @returns {Promise<Uri>} 外部URI
   */
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
  
  /**
   * 打开外部URI
   * @param {Uri|string} uri URI
   * @returns {Promise<boolean>} 是否成功
   */
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

module.exports = {
  // env 对象
  env
};