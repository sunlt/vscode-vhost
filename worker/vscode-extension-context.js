const path = require("path");
const fs = require("fs");

class Memento {
  constructor(file) {
    this.file = file;
    this.data = {};
    if (fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        this.data = {};
      }
    }
  }

  get(key, defaultValue) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  async update(key, value) {
    this.data[key] = value;
    await fs.promises.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }
  
  keys() {
    return Object.keys(this.data);
  }
}

function createExtensionContext(extensionPath) {
  const storageFile = path.join(extensionPath, ".roo-shim-globalState.json");
  const workspaceFile = path.join(process.cwd(), ".roo-shim-workspaceState.json");

  return {
    subscriptions: [],
    extensionPath,
    extensionUri: { fsPath: extensionPath, scheme: "file" },
    asAbsolutePath: (rel) => path.join(extensionPath, rel),
    globalState: new Memento(storageFile),
    workspaceState: new Memento(workspaceFile),
    secrets: {
      get: async () => undefined,
      store: async () => {},
      delete: async () => {},
      onDidChange: () => ({ dispose: () => {} }),
    },
    storageUri: { fsPath: path.join(process.cwd(), ".roo-shim-storage"), scheme: "file" },
    globalStorageUri: { fsPath: path.join(process.cwd(), ".roo-shim-global"), scheme: "file" },
    logUri: { fsPath: path.join(process.cwd(), ".roo-shim-logs"), scheme: "file" },
    environmentVariableCollection: {
      replace: () => {},
      append: () => {},
      prepend: () => {},
      get: () => undefined,
      forEach: () => {},
      delete: () => {},
      clear: () => {}
    },
    extensionMode: 1, // ExtensionMode.Development
    extension: {
      id: 'roo.extension',
      extensionUri: { fsPath: extensionPath, scheme: "file" },
      extensionPath,
      isActive: true,
      packageJSON: {},
      exports: undefined,
      activate: async () => {}
    }
  };
}

module.exports = { createExtensionContext, Memento };