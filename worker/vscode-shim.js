// worker/vscode-shim.js
const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");
const child_process = require("child_process");
const { createExtensionContext } = require("./vscode-extension-context");

// --- 基础类型 ---
class Uri {
  constructor(fsPath, scheme = "file") {
    this.fsPath = fsPath;
    this.path = fsPath;
    this.scheme = scheme;
  }
  static file(p) {
    return new Uri(path.resolve(p));
  }
  static parse(p) {
    return new Uri(path.resolve(p));
  }
  static joinPath(base, ...segments) {
    const newPath = path.join(base.fsPath, ...segments);
    return Uri.file(newPath);
  }
}

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Selection extends Range {
  constructor(start, end) {
    super(start, end);
    this.anchor = start;
    this.active = end;
  }
}

class ThemeIcon {
  constructor(id) {
    this.id = id;
  }
}

class CodeAction {
  constructor(title, kind) {
    this.title = title;
    this.kind = kind;
    this.command = undefined;
  }
}

// --- 常量 ---
const FileType = {
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
};

const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

const OverviewRulerLane = {
  Left: 1,
  Center: 2,
  Right: 4,
  Full: 7,
};

const CodeActionKind = {
  QuickFix: { value: "quickfix" },
  RefactorRewrite: { value: "refactor.rewrite" },
};

// --- workspace ---
const workspace = {
  workspaceFolders: [
    { uri: Uri.file(process.cwd()), name: path.basename(process.cwd()) },
  ],
  getWorkspaceFolder: (uri) => {
    return workspace.workspaceFolders.find((f) =>
      uri.fsPath.startsWith(f.uri.fsPath)
    );
  },
  onDidChangeWorkspaceFolders: (cb) => {
    // CLI 模式基本不会变化
    return { dispose: () => {} };
  },
  getConfiguration: (section) => {
    // 这里可以接配置文件，暂时返回默认
    return {
      get: (key, def) => def,
      update: async () => {},
    };
  },
  createFileSystemWatcher: () => {
    // 简单 fs.watch 实现
    const emitter = new EventEmitter();
    const watcher = fs.watch(process.cwd(), { recursive: true }, (event, file) => {
      if (event === "rename") emitter.emit("create", Uri.file(file));
      if (event === "change") emitter.emit("change", Uri.file(file));
    });
    return {
      onDidCreate: (cb) => { emitter.on("create", cb); return { dispose: () => emitter.removeAllListeners("create") }; },
      onDidChange: (cb) => { emitter.on("change", cb); return { dispose: () => emitter.removeAllListeners("change") }; },
      onDidDelete: (cb) => { /* 复杂情况暂略 */ return { dispose: () => {} }; },
      dispose: () => watcher.close(),
    };
  },
  fs: {
    readFile: async (uri) => fs.promises.readFile(uri.fsPath),
    writeFile: async (uri, content) => fs.promises.writeFile(uri.fsPath, content),
    delete: async (uri, options) => fs.promises.unlink(uri.fsPath),
    rename: async (source, target, options) => fs.promises.rename(source.fsPath, target.fsPath),
    copy: async (source, target, options) => fs.promises.copyFile(source.fsPath, target.fsPath),
    createDirectory: async (uri) => fs.promises.mkdir(uri.fsPath, { recursive: true }),
    readDirectory: async (uri) => {
      const entries = await fs.promises.readdir(uri.fsPath, { withFileTypes: true });
      return entries.map(entry => [
        entry.name,
        entry.isFile() ? FileType.File : entry.isDirectory() ? FileType.Directory : FileType.SymbolicLink
      ]);
    },
    stat: async (uri) => {
      const s = await fs.promises.stat(uri.fsPath);
      return {
        type: s.isFile() ? FileType.File : s.isDirectory() ? FileType.Directory : FileType.SymbolicLink,
        ctime: s.ctimeMs,
        mtime: s.mtimeMs,
        size: s.size,
      };
    }
  },
};

// --- window ---
const window = {
  activeTextEditor: null,
  onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
  showErrorMessage: async (...args) => {
    console.error("[VSCode][ErrorMessage]", ...args);
    return undefined;
  },
  showWarningMessage: async (...args) => {
    console.warn("[VSCode][WarningMessage]", ...args);
    return undefined;
  },
  showInformationMessage: async (...args) => {
    console.log("[VSCode][InfoMessage]", ...args);
    return undefined;
  },
  createOutputChannel: (name) => {
    return {
      appendLine: (msg) => console.log(`[Output:${name}]`, msg),
      append: (msg) => process.stdout.write(`[Output:${name}] ${msg}`),
      clear: () => {},
      show: () => {},
      dispose: () => {},
    };
  },
  createStatusBarItem: (alignment, priority) => {
    return {
      alignment,
      priority,
      text: '',
      tooltip: '',
      color: undefined,
      backgroundColor: undefined,
      command: undefined,
      show: () => {},
      hide: () => {},
      dispose: () => {}
    };
  },
  withProgress: (options, task) => {
    // 简单模拟，直接执行任务
    return task({
      report: (value) => console.log('[Progress.report]', value)
    });
  },
  createQuickPick: () => {
    return {
      placeholder: '',
      items: [],
      activeItems: [],
      selectedItems: [],
      onDidChangeValue: () => {},
      onDidAccept: () => {},
      onDidHide: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {}
    };
  },
  createInputBox: () => {
    return {
      value: '',
      placeholder: '',
      prompt: '',
      password: false,
      onDidChangeValue: () => {},
      onDidAccept: () => {},
      onDidHide: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {}
    };
  },
  createTerminal: (options) => {
    console.log("[VSCode][Terminal created]", options?.name || "default");
    return {
      name: options?.name || "terminal",
      processId: Promise.resolve(process.pid),
      sendText: (txt) => console.log(`[Terminal] ${txt}`),
      show: () => {},
      hide: () => {},
      dispose: () => {},
    };
  },
  onDidCloseTerminal: () => ({ dispose: () => {} }),
  createTextEditorDecorationType: (options) => {
    return { dispose: () => {} };
  },
};

// --- commands ---
const commandHandlers = new Map();
const commands = {
  registerCommand: (id, handler) => {
    commandHandlers.set(id, handler);
    return { dispose: () => commandHandlers.delete(id) };
  },
  registerTextEditorCommand: (id, handler) => {
    commandHandlers.set(id, handler);
    return { dispose: () => commandHandlers.delete(id) };
  },
  executeCommand: async (id, ...args) => {
    if (commandHandlers.has(id)) {
      return commandHandlers.get(id)(...args);
    }
    console.warn("[VSCode] Command not found:", id);
    return undefined;
  },
};

// --- languages ---
const diagnostics = new Map();
const languages = {
  createDiagnosticCollection: (name) => {
    const store = new Map();
    diagnostics.set(name, store);
    return {
      set: (uri, diags) => {
        store.set(uri.fsPath, diags);
        console.log(`[Diagnostics:${name}]`, uri.fsPath, diags);
      },
      delete: (uri) => store.delete(uri.fsPath),
      clear: () => store.clear(),
      dispose: () => diagnostics.delete(name),
    };
  },
  registerCompletionItemProvider: (selector, provider, ...triggerCharacters) => {
    console.log('[vscode.languages.registerCompletionItemProvider]', selector, triggerCharacters);
    return { dispose: () => {} };
  },
  registerHoverProvider: (selector, provider) => {
    console.log('[vscode.languages.registerHoverProvider]', selector);
    return { dispose: () => {} };
  },
  registerDefinitionProvider: (selector, provider) => {
    console.log('[vscode.languages.registerDefinitionProvider]', selector);
    return { dispose: () => {} };
  },
  registerDocumentFormattingEditProvider: (selector, provider) => {
    console.log('[vscode.languages.registerDocumentFormattingEditProvider]', selector);
    return { dispose: () => {} };
  },
  registerCodeLensProvider: (selector, provider) => {
    console.log('[vscode.languages.registerCodeLensProvider]', selector);
    return { dispose: () => {} };
  }
};

// --- extensions ---
const extensions = {
  getExtension: (id) => null, // 可扩展为返回本地插件信息
};

// --- authentication ---
const authentication = {
  getSession: async (providerId, scopes, options) => {
    console.log('[vscode.authentication.getSession]', providerId, scopes, options);
    return undefined;
  },
  onDidChangeSessions: () => {
    console.log('[vscode.authentication.onDidChangeSessions]');
    return { dispose: () => {} };
  }
};

// --- webview ---
const webview = {
  createWebviewPanel: (viewType, title, showOptions, options) => {
    console.log('[vscode.webview.createWebviewPanel]', viewType, title, showOptions, options);
    return {
      viewType,
      title,
      webview: {
        html: '',
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        postMessage: async () => true
      },
      onDidDispose: () => ({ dispose: () => {} }),
      reveal: () => {},
      dispose: () => {}
    };
  }
};

// --- env ---
const env = {
  clipboard: {
    writeText: async (text) => console.log('[vscode.env.clipboard.writeText]', text),
    readText: async () => {
      console.log('[vscode.env.clipboard.readText]');
      return '';
    }
  },
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
  asExternalUri: async (uri) => {
    console.log('[vscode.env.asExternalUri]', uri);
    return uri;
  }
};

// --- exports ---
module.exports = function createVscodeApi({ log, registerCommand }) {
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
    const originalRegisterCommand = commands.registerCommand;
    commands.registerCommand = (id, handler) => {
      registerCommand(id, handler);
      return originalRegisterCommand(id, handler);
    };
  }
 

  return {
    workspace,
    window,
    commands,
    languages,
    extensions,
    authentication,
    webview,
    env,
    Uri,
    Range,
    Position,
    Selection,
    ThemeIcon,
    FileType,
    DiagnosticSeverity,
    OverviewRulerLane,
    EventEmitter,
    CodeAction,
    CodeActionKind
  };
};