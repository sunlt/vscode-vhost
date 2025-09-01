const path = require('path');
const { commands } = require('../modules/commands');
const { Uri } = require('../modules/base-types');

// 模拟依赖模块
jest.mock('../modules/base-types', () => ({
  Uri: jest.fn().mockImplementation((fsPath, scheme = 'file') => ({
    fsPath,
    path: fsPath,
    scheme,
    toString: () => `${scheme}://${fsPath}`
  })),
  Disposable: jest.fn().mockImplementation(callOnDispose => ({
    dispose: callOnDispose || jest.fn(),
    isDisposed: false
  }))
}));

jest.mock('../modules/window', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    activeTextEditor: null,
    visibleTextEditors: []
  }
}));

jest.mock('../modules/workspace', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' }, name: 'test', index: 0 }],
    openTextDocument: jest.fn(),
    asRelativePath: jest.fn(p => p)
  }
}));

jest.mock('../modules/config', () => {
  const mockPath = require('path');
  return {
    configManager: {
      resolvePath: jest.fn(p => mockPath.resolve(p)),
      getRooCodeConfiguration: jest.fn(() => ({
        apiProvider: 'openai',
        modelTemperature: 0.7,
        allowedCommands: ['git', 'npm'],
        deniedCommands: ['rm', 'sudo'],
        alwaysAllowExecute: false,
        language: 'en'
      })),
      isCommandAllowedByRooCode: jest.fn(() => true),
      reset: jest.fn(),
      setConfig: jest.fn(),
      getConfig: jest.fn(() => ({})),
      setPersistCallback: jest.fn()
    }
  };
});

describe('commands模块测试', () => {
  beforeEach(() => {
    // 重置模拟状态
    jest.clearAllMocks();
  });

  describe('命令注册', () => {
    test('应该能够注册命令', () => {
      const handler = jest.fn();
      const disposable = commands.registerCommand('test.command', handler);
      
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      // 测试命令是否已注册
      expect(commands.getCommands()).toContain('test.command');
      
      // 清理
      disposable.dispose();
    });

    test('应该能够注册文本编辑器命令', () => {
      const handler = jest.fn();
      const disposable = commands.registerTextEditorCommand('test.editorCommand', handler);
      
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      
      // 清理
      disposable.dispose();
    });

    test('应该拒绝无效的命令ID', () => {
      const handler = jest.fn();
      
      expect(() => {
        commands.registerCommand(null, handler);
      }).toThrow('Command ID is required and must be a string');
      
      expect(() => {
        commands.registerCommand('', handler);
      }).toThrow('Command ID is required and must be a string');
      
      expect(() => {
        commands.registerCommand(123, handler);
      }).toThrow('Command ID is required and must be a string');
    });

    test('应该拒绝无效的命令处理函数', () => {
      expect(() => {
        commands.registerCommand('test.command', null);
      }).toThrow('Command handler must be a function');
      
      expect(() => {
        commands.registerCommand('test.command', 'not a function');
      }).toThrow('Command handler must be a function');
    });

    test('应该覆盖已注册的命令', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      const disposable1 = commands.registerCommand('test.duplicate', handler1);
      const disposable2 = commands.registerCommand('test.duplicate', handler2);
      
      // 执行命令应该调用新的处理函数
      commands.executeCommand('test.duplicate');
      expect(handler2).toHaveBeenCalled();
      expect(handler1).not.toHaveBeenCalled();
      
      // 清理
      disposable1.dispose();
      disposable2.dispose();
    });
  });

  describe('命令执行', () => {
    test('应该能够执行已注册的命令', async () => {
      const handler = jest.fn().mockReturnValue('result');
      const disposable = commands.registerCommand('test.execute', handler);
      
      const result = await commands.executeCommand('test.execute', 'arg1', 'arg2');
      
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
      
      // 清理
      disposable.dispose();
    });

    test('应该能够执行文本编辑器命令', async () => {
      const handler = jest.fn().mockReturnValue('editor result');
      const disposable = commands.registerTextEditorCommand('test.editorExecute', handler);
      
      const mockEditor = { id: 'test-editor' };
      const result = await commands.executeCommand('test.editorExecute', mockEditor, 'arg1');
      
      expect(handler).toHaveBeenCalledWith(mockEditor, 'arg1');
      expect(result).toBe('editor result');
      
      // 清理
      disposable.dispose();
    });

    test('应该处理未注册的命令', async () => {
      const result = await commands.executeCommand('non.existent.command');
      expect(result).toBeUndefined();
    });

    test('应该处理命令执行中的错误', async () => {
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Command execution error');
      });
      const disposable = commands.registerCommand('test.error', handler);
      
      try {
        await commands.executeCommand('test.error');
      } catch (error) {
        expect(error.message).toBe('Command execution error');
      }
      
      // 清理
      disposable.dispose();
    });
  });

  describe('内置命令', () => {
    test('应该实现vscode.open命令', async () => {
      const mockWindow = require('../modules/window').window;
      const mockWorkspace = require('../modules/workspace').workspace;
      
      // 模拟打开文档
      const mockDocument = { uri: { fsPath: '/test/file.txt' } };
      mockWorkspace.openTextDocument.mockResolvedValue(mockDocument);
      
      const result = await commands.executeCommand('vscode.open', '/test/file.txt');
      
      expect(mockWorkspace.openTextDocument).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBeDefined();
    });

    test('应该实现vscode.openWith命令', async () => {
      const mockWindow = require('../modules/window').window;
      const mockWorkspace = require('../modules/workspace').workspace;
      
      // 模拟打开文档
      const mockDocument = { uri: { fsPath: '/test/file.txt' } };
      mockWorkspace.openTextDocument.mockResolvedValue(mockDocument);
      
      const result = await commands.executeCommand('vscode.openWith', '/test/file.txt', 'default');
      
      expect(mockWorkspace.openTextDocument).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBeDefined();
    });

    test('应该实现workbench.action.reloadWindow命令', async () => {
      const result = await commands.executeCommand('workbench.action.reloadWindow');
      expect(result).toBeUndefined();
    });
  });

  describe('命令权限检查', () => {
    beforeEach(() => {
      // 设置RooCode配置
      commands.setRooCodeConfig({
        allowedCommands: ['git', 'npm', 'node'],
        deniedCommands: ['rm', 'sudo'],
        alwaysAllowExecute: false,
        alwaysAllowWrite: false,
        alwaysAllowReadOnly: true
      });
    });

    test('应该检查命令是否被允许', () => {
      expect(commands.isCommandAllowed('git')).toBe(true);
      expect(commands.isCommandAllowed('npm')).toBe(true);
      expect(commands.isCommandAllowed('node')).toBe(true);
      expect(commands.isCommandAllowed('rm')).toBe(false);
      expect(commands.isCommandAllowed('sudo')).toBe(false);
      expect(commands.isCommandAllowed('unknown')).toBe(false);
    });

    test('应该处理alwaysAllowExecute配置', () => {
      commands.setRooCodeConfig({
        allowedCommands: ['git'],
        deniedCommands: ['rm'],
        alwaysAllowExecute: true
      });
      
      expect(commands.isCommandAllowed('git')).toBe(true);
      expect(commands.isCommandAllowed('rm')).toBe(true);
      expect(commands.isCommandAllowed('unknown')).toBe(true);
    });

    test('应该处理无效的配置', () => {
      commands.setRooCodeConfig(null);
      
      expect(commands.isCommandAllowed('git')).toBe(false);
      expect(commands.isCommandAllowed('rm')).toBe(false);
    });
  });

  describe('命令历史记录', () => {
    test('应该记录命令执行历史', async () => {
      const handler = jest.fn();
      const disposable = commands.registerCommand('test.history', handler);
      
      await commands.executeCommand('test.history', 'arg1');
      
      const history = commands.getExecutionHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1]).toEqual({
        command: 'test.history',
        args: ['arg1'],
        timestamp: expect.any(Number)
      });
      
      // 清理
      disposable.dispose();
    });

    test('应该限制历史记录大小', async () => {
      const handler = jest.fn();
      const disposable = commands.registerCommand('test.historyLimit', handler);
      
      // 执行超过最大历史记录数量的命令
      for (let i = 0; i < 110; i++) {
        await commands.executeCommand('test.historyLimit', `arg${i}`);
      }
      
      const history = commands.getExecutionHistory();
      expect(history.length).toBeLessThanOrEqual(100);
      
      // 清理
      disposable.dispose();
    });

    test('应该能够清除历史记录', async () => {
      const handler = jest.fn();
      const disposable = commands.registerCommand('test.clearHistory', handler);
      
      await commands.executeCommand('test.clearHistory');
      expect(commands.getExecutionHistory().length).toBeGreaterThan(0);
      
      commands.clearExecutionHistory();
      expect(commands.getExecutionHistory().length).toBe(0);
      
      // 清理
      disposable.dispose();
    });
  });

  describe('命令获取', () => {
    test('应该能够获取所有已注册的命令', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      const disposable1 = commands.registerCommand('test.get1', handler1);
      const disposable2 = commands.registerCommand('test.get2', handler2);
      
      const allCommands = commands.getCommands();
      expect(allCommands).toContain('test.get1');
      expect(allCommands).toContain('test.get2');
      
      // 清理
      disposable1.dispose();
      disposable2.dispose();
    });

    test('应该能够获取命令处理函数', () => {
      const handler = jest.fn();
      const disposable = commands.registerCommand('test.getHandler', handler);
      
      const retrievedHandler = commands.getCommandHandler('test.getHandler');
      expect(retrievedHandler).toBe(handler);
      
      // 清理
      disposable.dispose();
    });

    test('应该为不存在的命令返回undefined', () => {
      const handler = commands.getCommandHandler('non.existent');
      expect(handler).toBeUndefined();
    });
  });

  describe('错误处理', () => {
    test('应该处理命令执行中的异步错误', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw new Error('Async error');
      });
      const disposable = commands.registerCommand('test.asyncError', handler);
      
      try {
        await commands.executeCommand('test.asyncError');
      } catch (error) {
        expect(error.message).toBe('Async error');
      }
      
      // 清理
      disposable.dispose();
    });

    test('应该处理命令执行中的同步错误', async () => {
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const disposable = commands.registerCommand('test.syncError', handler);
      
      try {
        await commands.executeCommand('test.syncError');
      } catch (error) {
        expect(error.message).toBe('Sync error');
      }
      
      // 清理
      disposable.dispose();
    });

    test('应该处理无效的命令参数', async () => {
      const handler = jest.fn();
      const disposable = commands.registerCommand('test.invalidArgs', handler);
      
      // 传递null作为命令ID
      try {
        await commands.executeCommand(null);
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      // 清理
      disposable.dispose();
    });
  });

  describe('异步操作', () => {
    test('应该异步执行命令', async () => {
      const handler = jest.fn().mockImplementation(async (arg) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `async result: ${arg}`;
      });
      const disposable = commands.registerCommand('test.async', handler);
      
      const promise = commands.executeCommand('test.async', 'test');
      expect(promise).toBeInstanceOf(Promise);
      
      const result = await promise;
      expect(result).toBe('async result: test');
      
      // 清理
      disposable.dispose();
    });

    test('应该并发执行多个命令', async () => {
      const handler = jest.fn().mockImplementation(async (arg) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `result: ${arg}`;
      });
      const disposable = commands.registerCommand('test.concurrent', handler);
      
      const promises = [
        commands.executeCommand('test.concurrent', '1'),
        commands.executeCommand('test.concurrent', '2'),
        commands.executeCommand('test.concurrent', '3')
      ];
      
      const results = await Promise.all(promises);
      expect(results).toEqual(['result: 1', 'result: 2', 'result: 3']);
      
      // 清理
      disposable.dispose();
    });
  });
});