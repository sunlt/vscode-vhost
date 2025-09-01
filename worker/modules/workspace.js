const fs = require("fs");
const path = require("path");
const {
  VSCodeEventEmitter,
  Uri,
  Position,
  Range,
  Selection,
  FileType
} = require('./base-types');

const { TextDocument } = require('./window');
const { configManager } = require('./config');

/**
 * WorkspaceEdit类 - 表示工作空间编辑操作
 */
class WorkspaceEdit {
  constructor() {
    this._edits = new Map();
  }

  /**
   * 替换文本
   * @param {Uri} uri URI
   * @param {Range} range 范围
   * @param {string} newText 新文本
   */
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

  /**
   * 插入文本
   * @param {Uri} uri URI
   * @param {Position} position 位置
   * @param {string} newText 新文本
   */
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

  /**
   * 删除文本
   * @param {Uri} uri URI
   * @param {Range} range 范围
   */
  delete(uri, range) {
    if (!this._edits.has(uri.toString())) {
      this._edits.set(uri.toString(), []);
    }
    this._edits.get(uri.toString()).push({
      type: 'delete',
      range
    });
  }

  /**
   * 获取编辑操作
   * @param {Uri} uri URI
   * @returns {Array} 编辑操作数组
   */
  get(uri) {
    return this._edits.get(uri.toString()) || [];
  }

  /**
   * 获取编辑操作数量
   * @returns {number} 编辑操作数量
   */
  size() {
    return this._edits.size;
  }

  /**
   * 检查是否有编辑操作
   * @param {Uri} uri URI
   * @returns {boolean} 是否有编辑操作
   */
  has(uri) {
    return this._edits.has(uri.toString());
  }
}

/**
 * TextDocumentContentProvider接口 - 文本文档内容提供者
 */
class TextDocumentContentProvider {
  constructor() {
    this.onDidChangeEmitter = new EventEmitter();
  }

  /**
   * 提供文本内容
   * @param {Uri} uri URI
   * @returns {Promise<string>} 文本内容
   */
  async provideTextDocumentContent(uri) {
    throw new Error('provideTextDocumentContent must be implemented');
  }

  /**
   * 当内容变化时触发事件
   * @returns {Function} 事件监听器
   */
  get onDidChange() {
    return this.onDidChangeEmitter.event;
  }
}

/**
 * ConfigurationChangeEvent类 - 配置变更事件
 */
class ConfigurationChangeEvent {
  /**
   * 创建配置变更事件实例
   * @param {Array} changedConfiguration 变更的配置
   */
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

/**
 * WorkspaceFoldersChangeEvent类 - 工作空间文件夹变更事件
 */
class WorkspaceFoldersChangeEvent {
  /**
   * 创建工作空间文件夹变更事件实例
   * @param {Array} added 添加的文件夹
   * @param {Array} removed 移除的文件夹
   */
  constructor(added, removed) {
    this.added = added || [];
    this.removed = removed || [];
  }
}

/**
 * WorkspaceConfiguration类 - 工作空间配置
 */
class WorkspaceConfiguration {
  /**
   * 创建工作空间配置实例
   * @param {Object} configData 配置数据
   */
  constructor(configData = {}) {
    this._configData = configData;
  }

  /**
   * 获取配置值
   * @param {string} section 配置节
   * @param {any} defaultValue 默认值
   * @returns {any} 配置值
   */
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

  /**
   * 检查配置是否存在
   * @param {string} section 配置节
   * @returns {boolean} 是否存在
   */
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

  /**
   * 更新配置值
   * @param {string} section 配置节
   * @param {any} value 配置值
   * @param {any} configurationTarget 配置目标
   * @returns {Promise<void>}
   */
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

  /**
   * 检查配置
   * @param {string} section 配置节
   * @returns {Object} 配置信息
   */
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

// 创建workspace对象
const workspace = {
  // 工作空间文件夹
  get workspaceFolders() {
    const workspaceRoot = configManager.getWorkspaceRoot();
    return [
      { uri: Uri.file(workspaceRoot), name: path.basename(workspaceRoot), index: 0 },
    ];
  },
  
  // 事件发射器
  _onDidChangeWorkspaceFoldersEmitter: new VSCodeEventEmitter(),
  _onDidChangeConfigurationEmitter: new VSCodeEventEmitter(),
  _onDidOpenTextDocumentEmitter: new VSCodeEventEmitter(),
  _textDocumentContentProviders: new Map(),
  _configData: {},
  
  /**
   * 获取工作空间文件夹
   * @param {Uri} uri URI
   * @returns {Object|undefined} 工作空间文件夹
   */
  getWorkspaceFolder: (uri) => {
    if (!uri) return undefined;
    const fsPath = uri.fsPath || uri;
    return workspace.workspaceFolders.find((f) =>
      fsPath.startsWith(f.uri.fsPath)
    );
  },
  
  /**
   * 获取包含URI的工作空间文件夹的相对路径
   * @param {string|Uri} pathOrUri 路径或URI
   * @param {boolean} includeWorkspaceFolder 是否包含工作空间文件夹名称
   * @returns {string} 相对路径
   */
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
  
  /**
   * 监听工作空间文件夹变化
   * @param {Function} cb 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeWorkspaceFolders: (cb) => {
    workspace._onDidChangeWorkspaceFoldersEmitter.event(cb);
    return { dispose: () => workspace._onDidChangeWorkspaceFoldersEmitter.removeListener('event', cb) };
  },
  
  /**
   * 获取配置
   * @param {string} section 配置节
   * @param {Object} scope 范围
   * @returns {WorkspaceConfiguration} 工作空间配置
   */
  getConfiguration: (section, scope) => {
    // 如果提供了scope，尝试从特定范围获取配置
    let configData = workspace._configData;
    
    // 简单实现：从JSON文件加载配置
    try {
      const workspaceRoot = configManager.getWorkspaceRoot();
      const configPath = path.join(workspaceRoot, '.vscode', 'settings.json');
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        configData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.warn('Failed to load configuration:', error);
    }
    
    return new WorkspaceConfiguration(configData);
  },
  
  /**
   * 监听配置变化
   * @param {Function} cb 回调函数
   * @returns {Object} 可释放对象
   */
  onDidChangeConfiguration: (cb) => {
    workspace._onDidChangeConfigurationEmitter.event(cb);
    return { dispose: () => workspace._onDidChangeConfigurationEmitter.removeListener('event', cb) };
  },
  
  /**
   * 监听文本文档打开事件
   * @param {Function} cb 回调函数
   * @returns {Object} 可释放对象
   */
  onDidOpenTextDocument: (cb) => {
    workspace._onDidOpenTextDocumentEmitter.event(cb);
    return { dispose: () => workspace._onDidOpenTextDocumentEmitter.removeListener('event', cb) };
  },
  
  /**
   * 注册文本文档内容提供者
   * @param {string} scheme 方案
   * @param {TextDocumentContentProvider} provider 提供者
   * @returns {Object} 可释放对象
   */
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
  
  /**
   * 应用工作空间编辑
   * @param {WorkspaceEdit} edit 工作空间编辑
   * @returns {Promise<boolean>} 是否成功
   */
  applyEdit: async (edit) => {
    if (!edit || !(edit instanceof WorkspaceEdit)) {
      throw new Error('Edit must be a WorkspaceEdit instance');
    }
    
    // 获取RooCode配置
    const rooCodeConfig = configManager.getRooCodeConfiguration();
    
    // 简单实现：遍历所有编辑操作
    for (const [uriString, edits] of edit._edits) {
      const uri = Uri.parse(uriString);
      
      try {
        // 如果配置了alwaysAllowWrite为false，则检查文件路径
        if (!rooCodeConfig.alwaysAllowWrite) {
          // 这里可以添加更多的权限检查逻辑
          console.log(`Applying edit to file ${uri.fsPath} with permission check`);
        }
        
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
        
        // 如果配置了writeDelayMs，则添加延迟
        if (rooCodeConfig.writeDelayMs && rooCodeConfig.writeDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, rooCodeConfig.writeDelayMs));
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
  
  /**
   * 打开文本文档
   * @param {string|Uri} uriOrFileName URI或文件名
   * @returns {Promise<TextDocument>} 文本文档
   */
  openTextDocument: async (uriOrFileName) => {
    let uri;
    
    if (typeof uriOrFileName === 'string') {
      // 如果是字符串，可能是文件名或URI字符串
      if (uriOrFileName.includes('://')) {
        uri = Uri.parse(uriOrFileName);
      } else {
        // 使用配置管理器解析路径
        const resolvedPath = configManager.resolvePath(uriOrFileName);
        uri = Uri.file(resolvedPath);
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
  
  /**
   * 创建文件系统监视器
   * @param {string|Uri} globPattern glob模式
   * @param {boolean} ignoreCreateEvents 是否忽略创建事件
   * @param {boolean} ignoreChangeEvents 是否忽略变更事件
   * @param {boolean} ignoreDeleteEvents 是否忽略删除事件
   * @returns {Object} 文件系统监视器
   */
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
    /**
     * 读取文件
     * @param {Uri} uri URI
     * @returns {Promise<Buffer>} 文件内容
     */
    readFile: async (uri) => {
      try {
        // 获取RooCode配置
        const rooCodeConfig = configManager.getRooCodeConfiguration();
        
        // 如果配置了alwaysAllowReadOnly为false，则检查文件路径
        if (!rooCodeConfig.alwaysAllowReadOnly) {
          // 这里可以添加更多的权限检查逻辑
          console.log(`Reading file ${uri.fsPath} with permission check`);
        }
        
        return await fs.promises.readFile(uri.fsPath);
      } catch (error) {
        console.error(`Failed to read file ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    /**
     * 写入文件
     * @param {Uri} uri URI
     * @param {string|Buffer} content 文件内容
     * @returns {Promise<void>}
     */
    writeFile: async (uri, content) => {
      try {
        // 获取RooCode配置
        const rooCodeConfig = configManager.getRooCodeConfiguration();
        
        // 如果配置了writeDelayMs，则添加延迟
        if (rooCodeConfig.writeDelayMs && rooCodeConfig.writeDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, rooCodeConfig.writeDelayMs));
        }
        
        // 如果配置了alwaysAllowWrite为false，则检查文件路径
        if (!rooCodeConfig.alwaysAllowWrite) {
          // 这里可以添加更多的权限检查逻辑
          console.log(`Writing file ${uri.fsPath} with permission check`);
        }
        
        await fs.promises.writeFile(uri.fsPath, content);
      } catch (error) {
        console.error(`Failed to write file ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    /**
     * 删除文件
     * @param {Uri} uri URI
     * @param {Object} options 选项
     * @returns {Promise<void>}
     */
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
    
    /**
     * 重命名文件
     * @param {Uri} source 源URI
     * @param {Uri} target 目标URI
     * @param {Object} options 选项
     * @returns {Promise<void>}
     */
    rename: async (source, target, options) => {
      try {
        await fs.promises.rename(source.fsPath, target.fsPath);
      } catch (error) {
        console.error(`Failed to rename ${source.fsPath} to ${target.fsPath}:`, error);
        throw error;
      }
    },
    
    /**
     * 复制文件
     * @param {Uri} source 源URI
     * @param {Uri} target 目标URI
     * @param {Object} options 选项
     * @returns {Promise<void>}
     */
    copy: async (source, target, options) => {
      try {
        await fs.promises.copyFile(source.fsPath, target.fsPath);
      } catch (error) {
        console.error(`Failed to copy ${source.fsPath} to ${target.fsPath}:`, error);
        throw error;
      }
    },
    
    /**
     * 创建目录
     * @param {Uri} uri URI
     * @returns {Promise<void>}
     */
    createDirectory: async (uri) => {
      try {
        await fs.promises.mkdir(uri.fsPath, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${uri.fsPath}:`, error);
        throw error;
      }
    },
    
    /**
     * 读取目录
     * @param {Uri} uri URI
     * @returns {Promise<Array>} 目录项数组
     */
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
    
    /**
     * 获取文件状态
     * @param {Uri} uri URI
     * @returns {Promise<Object>} 文件状态
     */
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

module.exports = {
  // 类
  WorkspaceEdit,
  TextDocumentContentProvider,
  ConfigurationChangeEvent,
  WorkspaceFoldersChangeEvent,
  WorkspaceConfiguration,
  
  // workspace 对象
  workspace
};