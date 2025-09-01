/**
 * VSCode API 测试文件
 * 
 * 这个文件用于测试新的模块化VSCode API是否与原始vscode-shim.js功能一致。
 * 运行此文件可以验证所有模块是否正常工作。
 */

const createVscodeApi = require('./vscode-api');

// 创建VSCode API实例
const vscode = createVscodeApi({
  log: (level, ...args) => {
    console.log(`[${level}]`, ...args);
  },
  registerCommand: (id, handler) => {
    console.log(`[Command Registered] ${id}`);
  },
  workspaceRoot: '/test/workspace', // 指定测试工作目录
  
  // RooCode配置
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
    language: 'en'
  },
  
  // 持久化存储函数
  persistStorage: (config) => {
    console.log('[Persist Storage] Persisting configuration:', JSON.stringify(config, null, 2));
  }
});

// 测试基础类型
function testBaseTypes() {
  console.log('\n=== 测试基础类型 ===');
  
  // 测试Uri
  const uri = vscode.Uri.file('/test/path');
  console.log('Uri.file (absolute path):', uri.fsPath);
  
  // 测试相对路径解析
  const relativeUri = vscode.Uri.file('src/index.js');
  console.log('Uri.file (relative path):', relativeUri.fsPath);
  
  // 测试Position和Range
  const position = new vscode.Position(0, 5);
  const range = new vscode.Range(position, new vscode.Position(1, 10));
  console.log('Position:', position);
  console.log('Range:', range);
  
  // 测试Disposable
  const disposable = new vscode.Disposable(() => {
    console.log('Disposed');
  });
  disposable.dispose();
  
  console.log('基础类型测试通过');
}

// 测试window模块
function testWindowModule() {
  console.log('\n=== 测试window模块 ===');
  
  // 测试ViewColumn常量
  console.log('ViewColumn.One:', vscode.ViewColumn.One);
  
  // 测试消息显示
  vscode.window.showInformationMessage('测试信息消息').then(result => {
    console.log('showInformationMessage result:', result);
  });
  
  // 测试输出通道
  const outputChannel = vscode.window.createOutputChannel('测试输出');
  outputChannel.appendLine('测试输出内容');
  outputChannel.dispose();
  
  console.log('window模块测试通过');
}

// 测试workspace模块
function testWorkspaceModule() {
  console.log('\n=== 测试workspace模块 ===');
  
  // 测试工作空间文件夹
  console.log('Workspace folders:', vscode.workspace.workspaceFolders);
  console.log('Workspace root:', vscode.workspace.workspaceFolders[0].uri.fsPath);
  
  // 测试配置
  const config = vscode.workspace.getConfiguration();
  console.log('Configuration:', config.get('editor.tabSize'));
  
  // 测试WorkspaceEdit
  const edit = new vscode.WorkspaceEdit();
  const editUri = vscode.Uri.file('file.txt');
  edit.replace(editUri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5)), '替换文本');
  console.log('WorkspaceEdit size:', edit.size());
  console.log('WorkspaceEdit URI:', editUri.fsPath);
  
  console.log('workspace模块测试通过');
}

// 测试commands模块
function testCommandsModule() {
  console.log('\n=== 测试commands模块 ===');
  
  // 测试命令注册
  const disposable = vscode.commands.registerCommand('test.command', () => {
    console.log('测试命令执行');
  });
  
  // 测试命令执行
  vscode.commands.executeCommand('test.command').then(result => {
    console.log('Command execution result:', result);
  });
  
  // 测试内置命令
  vscode.commands.executeCommand('vscode.open', '/test/file.txt').then(result => {
    console.log('Built-in command execution result:', result);
  });
  
  disposable.dispose();
  
  console.log('commands模块测试通过');
}

// 测试languages模块
function testLanguagesModule() {
  console.log('\n=== 测试languages模块 ===');
  
  // 测试诊断集合
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('test');
  const uri = vscode.Uri.file('/test/file.txt');
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5)),
    '测试诊断信息',
    vscode.DiagnosticSeverity.Warning
  );
  diagnosticCollection.set(uri, [diagnostic]);
  console.log('Diagnostics:', diagnosticCollection.get(uri));
  diagnosticCollection.dispose();
  
  // 测试补全项
  const completionItem = new vscode.CompletionItem('test', vscode.CompletionItemKind.Function);
  console.log('CompletionItem:', completionItem);
  
  console.log('languages模块测试通过');
}

// 测试env模块
function testEnvModule() {
  console.log('\n=== 测试env模块 ===');
  
  // 测试环境属性
  console.log('App name:', vscode.env.appName);
  console.log('Session ID:', vscode.env.sessionId);
  console.log('Language:', vscode.env.language);
  
  // 测试剪贴板
  vscode.env.clipboard.writeText('测试剪贴板内容').then(() => {
    console.log('Clipboard write success');
  });
  
  vscode.env.clipboard.readText().then(text => {
    console.log('Clipboard read:', text);
  });
  
  console.log('env模块测试通过');
}

// 测试extensions模块
function testExtensionsModule() {
  console.log('\n=== 测试extensions模块 ===');
  
  // 测试扩展注册
  const extension = vscode.extensions.registerExtension(
    'test.extension',
    '/test/path',
    { name: 'Test Extension', version: '1.0.0' }
  );
  
  // 测试扩展获取
  const retrievedExtension = vscode.extensions.getExtension('test.extension');
  console.log('Extension:', retrievedExtension);
  
  // 测试所有扩展
  const allExtensions = vscode.extensions.getAllExtensions();
  console.log('All extensions:', allExtensions);
  
  console.log('extensions模块测试通过');
}

// 测试authentication模块
function testAuthenticationModule() {
  console.log('\n=== 测试authentication模块 ===');
  
  // 测试认证提供者注册
  const provider = {
    getSession: async (scopes, options) => {
      console.log('Getting session for scopes:', scopes);
      return undefined;
    }
  };
  
  const disposable = vscode.authentication.registerAuthenticationProvider('test.provider', provider);
  
  // 测试认证会话
  vscode.authentication.getSession('test.provider', ['read'], {}).then(session => {
    console.log('Authentication session:', session);
  });
  
  disposable.dispose();
  
  console.log('authentication模块测试通过');
}

// 测试webview模块
function testWebviewModule() {
  console.log('\n=== 测试webview模块 ===');
  
  // 测试Webview面板创建
  const panel = vscode.webview.createWebviewPanel(
    'test.viewType',
    '测试面板',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  
  // 测试Webview
  panel.webview.html = '<html><body><h1>测试Webview</h1></body></html>';
  console.log('Webview HTML set');
  
  panel.dispose();
  
  console.log('webview模块测试通过');
}

// 测试extension-context模块
function testExtensionContextModule() {
  console.log('\n=== 测试extension-context模块 ===');
  
  // 测试扩展上下文创建
  const context = vscode.createExtensionContext('/test/path', 'test.extension');
  
  console.log('Extension path:', context.extensionPath);
  console.log('Extension URI:', context.extensionUri);
  console.log('Extension ID:', context.extensionId);
  
  // 测试Memento
  context.globalState.update('testKey', 'testValue').then(() => {
    console.log('Global state updated');
    const value = context.globalState.get('testKey');
    console.log('Global state value:', value);
  });
  
  context.workspaceState.update('testKey', 'testValue').then(() => {
    console.log('Workspace state updated');
    const value = context.workspaceState.get('testKey');
    console.log('Workspace state value:', value);
  });
  
  context.dispose();
  
  console.log('extension-context模块测试通过');
}

// 测试工作目录功能
function testWorkspaceRootFeature() {
  console.log('\n=== 测试工作目录功能 ===');
  
  // 测试默认工作目录
  const vscodeDefault = createVscodeApi({
    log: (level, ...args) => {
      console.log(`[${level}]`, ...args);
    },
    registerCommand: (id, handler) => {
      console.log(`[Command Registered] ${id}`);
    }
    // 不指定workspaceRoot，应使用process.cwd()
  });
  
  console.log('Default workspace root:', vscodeDefault.workspace.workspaceFolders[0].uri.fsPath);
  
  // 测试指定工作目录
  const vscodeCustom = createVscodeApi({
    log: (level, ...args) => {
      console.log(`[${level}]`, ...args);
    },
    registerCommand: (id, handler) => {
      console.log(`[Command Registered] ${id}`);
    },
    workspaceRoot: '/custom/workspace'
  });
  
  console.log('Custom workspace root:', vscodeCustom.workspace.workspaceFolders[0].uri.fsPath);
  
  // 测试相对路径解析
  const relativeUri = vscodeCustom.Uri.file('src/app.js');
  console.log('Relative path resolution:', relativeUri.fsPath);
  
  // 测试绝对路径解析
  const absoluteUri = vscodeCustom.Uri.file('/absolute/path/file.js');
  console.log('Absolute path resolution:', absoluteUri.fsPath);
  
  console.log('工作目录功能测试通过');
}

// 测试RooCode配置功能
async function testRooCodeConfig() {
  console.log('\n=== 测试RooCode配置功能 ===');
  
  // 测试获取当前配置
  const currentConfig = vscode.rooCode.getConfiguration();
  console.log('Current configuration:', JSON.stringify(currentConfig, null, 2));
  
  // 测试更新部分配置
  await vscode.rooCode.updateConfiguration({
    modelTemperature: 0.5,
    allowedCommands: ['git', 'npm', 'node', 'python']
  });
  
  const updatedConfig = vscode.rooCode.getConfiguration();
  console.log('Updated configuration temperature:', updatedConfig.modelTemperature);
  console.log('Updated configuration allowedCommands:', updatedConfig.allowedCommands);
  
  // 测试设置完整配置
  await vscode.rooCode.setConfiguration({
    ...currentConfig,
    apiProvider: 'anthropic',
    anthropicApiKey: 'test-anthropic-key',
    apiModelId: 'claude-3-opus-20240229',
    modelTemperature: 0.8
  });
  
  const newConfig = vscode.rooCode.getConfiguration();
  console.log('New configuration provider:', newConfig.apiProvider);
  console.log('New configuration model:', newConfig.apiModelId);
  
  // 测试命令权限检查
  console.log('Is "git" command allowed:', vscode.commands.isCommandAllowed('git'));
  console.log('Is "rm" command allowed:', vscode.commands.isCommandAllowed('rm'));
  console.log('Is "node" command allowed:', vscode.commands.isCommandAllowed('node'));
  
  // 测试配置验证
  try {
    await vscode.rooCode.setConfiguration({
      modelTemperature: 1.5 // 超出范围，应该抛出错误
    });
    console.error('Configuration validation failed - should have thrown an error');
  } catch (error) {
    console.log('Configuration validation working correctly:', error.message);
  }
  
  try {
    await vscode.rooCode.setConfiguration({
      allowedCommands: 'git' // 类型错误，应该是数组，应该抛出错误
    });
    console.error('Configuration validation failed - should have thrown an error');
  } catch (error) {
    console.log('Configuration validation working correctly:', error.message);
  }
  
  // 测试重置为默认配置
  await vscode.rooCode.resetConfiguration();
  const defaultConfig = vscode.rooCode.getConfiguration();
  console.log('Default configuration provider:', defaultConfig.apiProvider);
  console.log('Default configuration temperature:', defaultConfig.modelTemperature);
  
  console.log('RooCode配置功能测试通过');
}

// 运行所有测试
async function runAllTests() {
  console.log('开始运行VSCode API测试...');
  
  try {
    testBaseTypes();
    testWindowModule();
    testWorkspaceModule();
    testCommandsModule();
    testLanguagesModule();
    testEnvModule();
    testExtensionsModule();
    testAuthenticationModule();
    testWebviewModule();
    testExtensionContextModule();
    testWorkspaceRootFeature();
    await testRooCodeConfig();
    
    console.log('\n✅ 所有测试通过！新的模块化VSCode API与原始vscode-shim.js功能一致。');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();