const createVscodeApi = require('../vscode-api');
const { Uri, Position, Range, Disposable } = require('../modules/base-types');

// 模拟extension-context模块
jest.mock('../modules/extension-context', () => {
  // 创建一个真实的ExtensionActivator类模拟
  class MockExtensionActivator {
    constructor() {
      this._extensions = new Map();
      this._activeExtensions = new Map();
      this._extensionContexts = new Map();
      this.activate = jest.fn();
      this.deactivate = jest.fn();
      this.isActive = false;
    }
  }

  return {
    ExtensionActivator: MockExtensionActivator,
    createExtensionContext: jest.fn((extensionPath, extensionId) => ({
      subscriptions: [],
      extensionPath,
      extensionId,
      workspaceState: {
        get: jest.fn(),
        update: jest.fn()
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn()
      }
    })),
    ExtensionContext: jest.fn(),
    Memento: jest.fn()
  };
});

// 模拟config模块
jest.mock('../modules/config', () => {
  let storedConfig = null;
  let storedRooCodeConfig = {
    apiProvider: 'openai',
    language: 'en'
  };
  
  const mockConfigManager = {
    resolvePath: jest.fn(p => require('path').resolve(p)),
    getWorkspaceRoot: jest.fn(() => '/test/workspace'),
    setWorkspaceRoot: jest.fn(root => {
      // 存储工作目录
      mockConfigManager.workspaceRoot = root;
    }),
    getRooCodeConfiguration: jest.fn(() => storedRooCodeConfig),
    setConfig: jest.fn(config => {
      storedConfig = config;
    }),
    getConfig: jest.fn(() => storedConfig),
    setRooCodeConfig: jest.fn(config => {
      storedRooCodeConfig = { ...config };
    }),
    getRooCodeConfig: jest.fn(() => storedRooCodeConfig),
    updateRooCodeConfig: jest.fn(config => {
      storedRooCodeConfig = { ...storedRooCodeConfig, ...config };
    }),
    resetRooCodeConfig: jest.fn(() => {
      storedRooCodeConfig = {
        apiProvider: 'openai',
        language: 'en'
      };
    }),
    setLogFunction: jest.fn(),
    setRegisterCommandFunction: jest.fn(),
    setPersistStorageFunction: jest.fn(),
    setRooCodeConfiguration: jest.fn(config => {
      storedRooCodeConfig = { ...config };
    }),
    updateRooCodeConfiguration: jest.fn(config => {
      storedRooCodeConfig = { ...storedRooCodeConfig, ...config };
    }),
    resetRooCodeConfiguration: jest.fn(() => {
      storedRooCodeConfig = {
        apiProvider: 'openai',
        language: 'en'
      };
    })
  };
  
  return {
    configManager: mockConfigManager
  };
});

// 模拟依赖模块
jest.mock('../modules/base-types', () => {
  const mockPath = require('path');
  const UriConstructor = jest.fn().mockImplementation((fsPath, scheme = 'file') => ({
    fsPath,
    path: fsPath,
    scheme,
    toString: () => `${scheme}://${fsPath}`
  }));
  
  // 添加静态方法
  UriConstructor.file = jest.fn(p => ({
    fsPath: p,
    path: p,
    scheme: 'file',
    toString: () => `file://${p}`
  }));
  
  UriConstructor.parse = jest.fn(p => ({
    fsPath: p,
    path: p,
    scheme: 'file',
    toString: () => `file://${p}`
  }));
  
  UriConstructor.joinPath = jest.fn((base, ...pathSegments) => {
    const joinedPath = mockPath.posix.join(base.fsPath, ...pathSegments);
    return {
      fsPath: joinedPath,
      path: joinedPath,
      scheme: 'file',
      toString: () => `file://${joinedPath}`
    };
  });
  
  const DisposableConstructor = jest.fn().mockImplementation(callOnDispose => {
    let disposed = false;
    let disposeFn = callOnDispose || jest.fn();
    
    return {
      dispose: () => {
        if (!disposed) {
          disposeFn();
          disposed = true;
        }
      },
      get isDisposed() {
        return disposed;
      }
    };
  });
  
  // 添加静态方法
  DisposableConstructor.from = jest.fn((...disposables) => ({
    dispose: jest.fn(() => {
      disposables.forEach(d => d.dispose());
    })
  }));
  
  return {
    VSCodeEventEmitter: jest.fn().mockImplementation(() => ({
      event: jest.fn(callback => ({
        dispose: jest.fn()
      })),
      fire: jest.fn()
    })),
    Uri: UriConstructor,
    Position: jest.fn().mockImplementation((line, character) => ({ line, character })),
    Range: jest.fn().mockImplementation((start, end) => ({ start, end })),
    Disposable: DisposableConstructor
  };
});

jest.mock('../modules/window', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createOutputChannel: jest.fn(),
    createStatusBarItem: jest.fn(),
    createQuickPick: jest.fn(),
    createInputBox: jest.fn(),
    createTerminal: jest.fn(),
    createTextEditorDecorationType: jest.fn(),
    showTextDocument: jest.fn(),
    onDidChangeActiveTextEditor: jest.fn(),
    onDidChangeVisibleTextEditors: jest.fn(),
    createWebviewPanel: jest.fn(),
    registerWebviewViewProvider: jest.fn(),
    tabGroups: {
      all: [],
      activeTabGroup: {},
      onDidChangeTabs: jest.fn()
    },
    ViewColumn: {
      Active: -1,
      Beside: -2,
      One: 1,
      Two: 2
    }
  }
}));

jest.mock('../modules/workspace', () => {
  const mockWorkspace = {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' }, name: 'test', index: 0 }],
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn(),
    getConfiguration: jest.fn(),
    onDidChangeWorkspaceFolders: jest.fn(),
    onDidChangeConfiguration: jest.fn(),
    onDidOpenTextDocument: jest.fn(),
    openTextDocument: jest.fn(),
    findFiles: jest.fn(),
    saveAll: jest.fn(),
    applyEdit: jest.fn(),
    WorkspaceEdit: jest.fn().mockImplementation(() => ({
      size: jest.fn(() => 1),
      replace: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn()
    })),
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      delete: jest.fn(),
      createDirectory: jest.fn(),
      readDirectory: jest.fn()
    }
  };
  
  // 监听工作目录变化
  const configManager = require('../modules/config').configManager;
  const originalSetWorkspaceRoot = configManager.setWorkspaceRoot;
  configManager.setWorkspaceRoot = jest.fn(root => {
    if (root) {
      mockWorkspace.workspaceFolders = [{ uri: { fsPath: root }, name: 'test', index: 0 }];
    } else {
      mockWorkspace.workspaceFolders = [{ uri: { fsPath: process.cwd() }, name: 'test', index: 0 }];
    }
    return originalSetWorkspaceRoot(root);
  });
  
  return {
    workspace: mockWorkspace
  };
});

jest.mock('../modules/commands', () => ({
  commands: {
    registerCommand: jest.fn(),
    registerTextEditorCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn(),
    isCommandAllowed: jest.fn()
  }
}));

jest.mock('../modules/languages', () => ({
  languages: {
    createDiagnosticCollection: jest.fn(),
    registerCompletionItemProvider: jest.fn(),
    registerCodeActionsProvider: jest.fn(),
    registerHoverProvider: jest.fn(),
    registerDefinitionProvider: jest.fn(),
    registerDocumentFormattingEditProvider: jest.fn(),
    onDidChangeDiagnostics: jest.fn(),
    match: jest.fn()
  }
}));

jest.mock('../modules/env', () => ({
  env: {
    appName: 'VS Code Test',
    sessionId: 'test-session-id',
    language: 'en',
    clipboard: {
      writeText: jest.fn(),
      readText: jest.fn()
    }
  }
}));

jest.mock('../modules/extensions', () => ({
  extensions: {
    registerExtension: jest.fn(),
    getExtension: jest.fn(),
    getAllExtensions: jest.fn()
  }
}));

jest.mock('../modules/authentication', () => ({
  authentication: {
    registerAuthenticationProvider: jest.fn(),
    getSession: jest.fn()
  }
}));

jest.mock('../modules/webview', () => ({
  webview: {
    createWebviewPanel: jest.fn(),
    registerWebviewViewProvider: jest.fn()
  }
}));



jest.mock('../modules/roocode-config', () => ({
  RooCodeSettings: jest.fn().mockImplementation(settings => ({
    ...settings,
    isValid: () => true,
    getValidationErrors: () => []
  }))
}));

describe('vscode-api模块测试', () => {
  let vscode;
  let mockConfig;

  beforeEach(() => {
    // 重置模拟状态
    jest.clearAllMocks();
    
    // 创建模拟配置
    mockConfig = {
      log: jest.fn(),
      registerCommand: jest.fn(),
      workspaceRoot: '/test/workspace',
      rooCodeSettings: {
        apiProvider: 'openai',
        modelTemperature: 0.7,
        allowedCommands: ['git', 'npm', 'node'],
        deniedCommands: ['rm', 'sudo']
      },
      persistStorage: jest.fn()
    };
    
    // 创建VSCode API实例
    vscode = createVscodeApi(mockConfig);
  });

  describe('API结构', () => {
    test('应该包含所有必要的模块', () => {
      expect(vscode.window).toBeDefined();
      expect(vscode.workspace).toBeDefined();
      expect(vscode.commands).toBeDefined();
      expect(vscode.languages).toBeDefined();
      expect(vscode.env).toBeDefined();
      expect(vscode.extensions).toBeDefined();
      expect(vscode.authentication).toBeDefined();
      expect(vscode.webview).toBeDefined();
      expect(vscode.rooCode).toBeDefined();
    });

    test('应该包含所有必要的类型', () => {
      expect(vscode.Uri).toBeDefined();
      expect(vscode.Position).toBeDefined();
      expect(vscode.Range).toBeDefined();
      expect(vscode.Disposable).toBeDefined();
    });
  });

  describe('配置传递', () => {
    test('应该传递配置给configManager', () => {
      const configManager = require('../modules/config').configManager;
      expect(configManager.setConfig).toHaveBeenCalledWith(mockConfig);
    });

    test('应该传递RooCode配置给roocode-config', () => {
      const configManager = require('../modules/config').configManager;
      expect(configManager.setRooCodeConfig).toHaveBeenCalledWith(mockConfig.rooCodeSettings);
    });
  });

  describe('工作目录功能', () => {
    test('应该使用指定的工作目录', () => {
      const customWorkspaceConfig = {
        ...mockConfig,
        workspaceRoot: '/custom/workspace'
      };
      
      const vscodeCustom = createVscodeApi(customWorkspaceConfig);
      
      expect(vscodeCustom.workspace.workspaceFolders[0].uri.fsPath).toBe('/custom/workspace');
    });

    test('应该使用process.cwd()作为默认工作目录', () => {
      const defaultWorkspaceConfig = {
        log: jest.fn(),
        registerCommand: jest.fn()
        // 不指定workspaceRoot
      };
      
      const vscodeDefault = createVscodeApi(defaultWorkspaceConfig);
      
      expect(vscodeDefault.workspace.workspaceFolders[0].uri.fsPath).toBe(process.cwd());
    });
  });

  describe('Uri功能', () => {
    test('应该能够创建Uri实例', () => {
      const uri = vscode.Uri.file('/test/path');
      expect(uri).toBeDefined();
      expect(uri.fsPath).toBe('/test/path');
      expect(uri.scheme).toBe('file');
    });

    test('应该能够解析Uri字符串', () => {
      const uri = vscode.Uri.parse('/test/path');
      expect(uri).toBeDefined();
      expect(uri.fsPath).toBe('/test/path');
      expect(uri.scheme).toBe('file');
    });

    test('应该能够连接路径', () => {
      const baseUri = vscode.Uri.file('/base');
      const joinedUri = vscode.Uri.joinPath(baseUri, 'subdir', 'file.txt');
      expect(joinedUri.fsPath).toBe('/base/subdir/file.txt');
    });
  });

  describe('Position和Range功能', () => {
    test('应该能够创建Position实例', () => {
      const position = new vscode.Position(5, 10);
      expect(position.line).toBe(5);
      expect(position.character).toBe(10);
    });

    test('应该能够创建Range实例', () => {
      const start = new vscode.Position(1, 2);
      const end = new vscode.Position(3, 4);
      const range = new vscode.Range(start, end);
      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
    });
  });

  describe('Disposable功能', () => {
    test('应该能够创建Disposable实例', () => {
      let disposed = false;
      const disposable = new vscode.Disposable(() => {
        disposed = true;
      });
      
      expect(disposable.isDisposed).toBe(false);
      disposable.dispose();
      expect(disposed).toBe(true);
      expect(disposable.isDisposed).toBe(true);
    });

    test('应该能够从多个Disposable创建一个Disposable', () => {
      const disposable1 = { dispose: jest.fn() };
      const disposable2 = { dispose: jest.fn() };
      const composite = vscode.Disposable.from(disposable1, disposable2);
      
      composite.dispose();
      expect(disposable1.dispose).toHaveBeenCalled();
      expect(disposable2.dispose).toHaveBeenCalled();
    });
  });

  describe('RooCode配置功能', () => {
    test('应该能够获取RooCode配置', () => {
      const config = vscode.rooCode.getConfiguration();
      expect(config).toEqual(mockConfig.rooCodeSettings);
    });

    test('应该能够更新RooCode配置', async () => {
      const partialConfig = {
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      };
      
      await vscode.rooCode.updateConfiguration(partialConfig);
      
      const configManager = require('../modules/config').configManager;
      expect(configManager.updateRooCodeConfig).toHaveBeenCalledWith(partialConfig);
    });

    test('应该能够设置完整的RooCode配置', async () => {
      const fullConfig = {
        ...mockConfig.rooCodeSettings,
        modelTemperature: 0.8,
        apiProvider: 'anthropic'
      };
      
      await vscode.rooCode.setConfiguration(fullConfig);
      
      const configManager = require('../modules/config').configManager;
      expect(configManager.setRooCodeConfig).toHaveBeenCalledWith(fullConfig);
    });

    test('应该能够重置RooCode配置', async () => {
      await vscode.rooCode.resetConfiguration();
      
      const configManager = require('../modules/config').configManager;
      expect(configManager.resetRooCodeConfig).toHaveBeenCalled();
    });
  });

  describe('createExtensionContext功能', () => {
    test('应该能够创建扩展上下文', () => {
      const context = vscode.createExtensionContext('/test/path', 'test.extension');
      
      expect(context).toBeDefined();
      expect(context.extensionPath).toBe('/test/path');
      expect(context.extensionId).toBe('test.extension');
    });
  });

  describe('模块集成', () => {
    test('应该正确集成window模块', () => {
      expect(vscode.window).toBe(require('../modules/window').window);
    });

    test('应该正确集成workspace模块', () => {
      expect(vscode.workspace).toBe(require('../modules/workspace').workspace);
    });

    test('应该正确集成commands模块', () => {
      expect(vscode.commands).toBe(require('../modules/commands').commands);
    });

    test('应该正确集成languages模块', () => {
      expect(vscode.languages).toBe(require('../modules/languages').languages);
    });

    test('应该正确集成env模块', () => {
      expect(vscode.env).toBe(require('../modules/env').env);
    });

    test('应该正确集成extensions模块', () => {
      expect(vscode.extensions).toBe(require('../modules/extensions').extensions);
    });

    test('应该正确集成authentication模块', () => {
      expect(vscode.authentication).toBe(require('../modules/authentication').authentication);
    });

    test('应该正确集成webview模块', () => {
      expect(vscode.webview).toBe(require('../modules/webview').webview);
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的配置', () => {
      expect(() => {
        createVscodeApi(null);
      }).not.toThrow();
    });

    test('应该处理部分配置', () => {
      const partialConfig = {
        log: jest.fn()
        // 缺少其他必需配置
      };
      
      expect(() => {
        createVscodeApi(partialConfig);
      }).not.toThrow();
    });
  });

  describe('异步操作', () => {
    test('应该异步处理RooCode配置更新', async () => {
      const partialConfig = {
        modelTemperature: 0.5
      };
      
      const promise = vscode.rooCode.updateConfiguration(partialConfig);
      expect(promise).toBeInstanceOf(Promise);
      
      await promise;
    });

    test('应该异步处理RooCode配置设置', async () => {
      const fullConfig = {
        ...mockConfig.rooCodeSettings,
        modelTemperature: 0.8
      };
      
      const promise = vscode.rooCode.setConfiguration(fullConfig);
      expect(promise).toBeInstanceOf(Promise);
      
      await promise;
    });

    test('应该异步处理RooCode配置重置', async () => {
      const promise = vscode.rooCode.resetConfiguration();
      expect(promise).toBeInstanceOf(Promise);
      
      await promise;
    });
  });

  describe('向后兼容性', () => {
    test('应该与原始vscode-shim.js功能一致', () => {
      // 测试基础类型
      const uri = vscode.Uri.file('/test/path');
      expect(uri.fsPath).toBeDefined();
      
      const position = new vscode.Position(0, 5);
      const range = new vscode.Range(position, new vscode.Position(1, 10));
      expect(range.start).toBe(position);
      
      const disposable = new vscode.Disposable(() => {});
      disposable.dispose();
      
      // 测试window模块
      expect(vscode.window.showInformationMessage).toBeDefined();
      expect(vscode.window.createOutputChannel).toBeDefined();
      
      // 测试workspace模块
      expect(vscode.workspace.workspaceFolders).toBeDefined();
      expect(vscode.workspace.getConfiguration).toBeDefined();
      
      // 测试commands模块
      expect(vscode.commands.registerCommand).toBeDefined();
      expect(vscode.commands.executeCommand).toBeDefined();
      
      // 测试languages模块
      expect(vscode.languages.createDiagnosticCollection).toBeDefined();
      expect(vscode.languages.registerCompletionItemProvider).toBeDefined();
    });
  });
});