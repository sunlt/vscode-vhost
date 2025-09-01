const path = require('path');
const fs = require('fs');

/**
 * 全局测试设置和工具函数
 */

// 创建临时文件目录
const tempDir = path.join(__dirname, '..', 'temp');

// 在所有测试之前运行
beforeAll(() => {
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
});

// 在所有测试之后运行
afterAll(() => {
  // 清理临时目录
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 在每个测试之后运行
afterEach(() => {
  // 清理测试状态
  jest.clearAllMocks();
});

/**
 * 创建临时文件
 * @param {string} content 文件内容
 * @param {string} filename 文件名
 * @returns {string} 文件路径
 */
global.createTempFile = (content, filename = 'temp-test-file') => {
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

/**
 * 清理临时文件
 */
global.cleanupTempFiles = () => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });
  }
};

/**
 * 创建模拟的VSCode API配置
 * @param {Object} customConfig 自定义配置
 * @returns {Object} VSCode API配置
 */
global.createMockVscodeConfig = (customConfig = {}) => {
  return {
    log: (level, ...args) => {
      console.log(`[${level}]`, ...args);
    },
    registerCommand: (id, handler) => {
      console.log(`[Command Registered] ${id}`);
      return { dispose: () => {} };
    },
    workspaceRoot: '/test/workspace',
    rooCodeSettings: {
      apiProvider: 'openai',
      openAiModelId: 'gpt-4-turbo',
      modelTemperature: 0.7,
      modelMaxTokens: 4000,
      allowedCommands: ['git', 'npm', 'node'],
      deniedCommands: ['rm', 'sudo'],
      alwaysAllowExecute: false,
      alwaysAllowWrite: false,
      alwaysAllowReadOnly: true,
      alwaysAllowBrowser: false,
      alwaysAllowSubtasks: false,
      customInstructions: 'You are a helpful assistant.',
      diffEnabled: true,
      enableCheckpoints: false,
      writeDelayMs: 500,
      terminalOutputLineLimit: 100,
      language: 'en',
      ...customConfig.rooCodeSettings
    },
    persistStorage: (config) => {
      console.log('[Persist Storage] Persisting configuration:', JSON.stringify(config, null, 2));
    },
    ...customConfig
  };
};

/**
 * 模拟异步操作
 * @param {any} value 要返回的值
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Promise} Promise对象
 */
global.mockAsyncOperation = (value, delay = 10) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), delay);
  });
};

/**
 * 模拟文件系统操作
 */
global.mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn()
};

/**
 * 模拟路径操作
 */
global.mockPath = {
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => path.resolve(...args)),
  dirname: jest.fn(p => path.dirname(p)),
  basename: jest.fn(p => path.basename(p)),
  extname: jest.fn(p => path.extname(p))
};

/**
 * 创建模拟的VSCode事件发射器
 * @returns {Object} 模拟的事件发射器
 */
global.createMockEventEmitter = () => {
  const listeners = [];
  return {
    event: (callback) => {
      listeners.push(callback);
      return { dispose: () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }};
    },
    fire: (...args) => {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    },
    get listenerCount() {
      return listeners.length;
    }
  };
};

/**
 * 验证对象是否包含特定属性
 * @param {Object} obj 要验证的对象
 * @param {string[]} props 属性列表
 * @returns {boolean} 是否包含所有属性
 */
global.hasProperties = (obj, props) => {
  return props.every(prop => prop in obj);
};

/**
 * 验证函数是否被调用
 * @param {Function} fn 要验证的函数
 * @param {number} times 调用次数
 * @returns {boolean} 是否被调用指定次数
 */
global.wasCalledTimes = (fn, times) => {
  return fn.mock.calls.length === times;
};

/**
 * 验证函数是否被调用并带有特定参数
 * @param {Function} fn 要验证的函数
 * @param {any[]} args 参数列表
 * @returns {boolean} 是否被调用并带有特定参数
 */
global.wasCalledWith = (fn, args) => {
  return fn.mock.calls.some(call => 
    args.every((arg, index) => 
      JSON.stringify(call[index]) === JSON.stringify(arg)
    )
  );
};

// 设置全局超时
jest.setTimeout(10000);

// 添加一个简单的测试以避免"no tests found"错误
describe('测试工具', () => {
  test('应该正确设置全局工具函数', () => {
    expect(typeof global.createTempFile).toBe('function');
    expect(typeof global.cleanupTempFiles).toBe('function');
    expect(typeof global.createMockVscodeConfig).toBe('function');
    expect(typeof global.mockAsyncOperation).toBe('function');
    expect(typeof global.createMockEventEmitter).toBe('function');
    expect(typeof global.hasProperties).toBe('function');
    expect(typeof global.wasCalledTimes).toBe('function');
    expect(typeof global.wasCalledWith).toBe('function');
  });
});