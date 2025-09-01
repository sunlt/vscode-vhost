# 文档：在Node.js中模拟VS Code并支持并发会话

本文档是“在Node.js中模拟VS Code并运行Roo-Code”的进阶版，详细阐述了如何将该架构升级为支持并发会话（Concurrent Sessions）的模式。这允许您的Node.js应用同时为多个客户端提供独立的、隔离的Roo-Code代理服务。

---

## 1. 架构演进：从单例到会话隔离

为了支持并发，我们必须放弃全局单例的模拟方式。核心思想是引入一个`Session`类，每个客户端连接（例如，一个WebSocket连接）都会创建一个独立的`Session`实例。每个实例都封装了运行一个完整Roo-Code实例所需的所有资源，从而实现彻底的状态隔离。

**每个`Session`实例将包含：**

- 一个唯一的`sessionId`。
- 一套**完全独立**的模拟`vscode` API对象。
- 一个独立的模拟`ExtensionContext`，包括隔离的`globalState`和`secrets`存储。
- 一个由该会话的`activate`函数返回的、独立的`API`对象实例。
- 与单个客户端通信的WebSocket连接实例。

---

## 2. 步骤一：重构模拟VS Code主机为工厂模式

为了给每个会话提供隔离的API环境，我们需要将`vscode-host-mock.ts`重构为一个工厂函数或类，它能够按需生成全新的模拟API实例。

**实现要点 (`vscode-host-mock.ts`):**

```typescript
import { EventEmitter } from 'events';

// 工厂函数，为每个会话创建一套新的、隔离的模拟API
export function createMockVsCodeApi(session: Session) {
    const onDidReceiveMessageEmitter = new EventEmitter();

    const mockWebview = {
        postMessage: (message: any) => {
            // 通过session将消息转发给对应的客户端
            session.sendMessageToClient(message);
        },
        onDidReceiveMessage: (listener: (message: any) => void) => {
            onDidReceiveMessageEmitter.on('message', listener);
            return { dispose: () => onDidReceiveMessageEmitter.removeListener('message', listener) };
        },
    };

    // 返回一套全新的、包含隔离状态的模拟API
    return {
        // 将事件触发器暴露出去，以便Session可以注入来自客户端的消息
        _triggerWebviewMessage: (message: any) => {
            onDidReceiveMessageEmitter.emit('message', message);
        },
        workspace: { /* ...为每个session创建独立的workspace模拟... */ },
        window: {
            createWebviewPanel: () => ({ webview: mockWebview }),
            // ...其他window API
        },
        // ...其他API
    };
}

// Session的类型定义，用于循环依赖
import type { Session } from './headless-runner';
```

---

## 3. 步骤二：引入Session类并重构运行器

Node.js运行器现在将扮演“会话管理器”（Session Manager）的角色。它负责监听新的客户端连接，并为每个连接创建和管理一个`Session`实例。

**实现要点 (`headless-runner.ts`):**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createMockVsCodeApi } from './vscode-host-mock';

// Session类，封装了单个会话的所有逻辑和状态
export class Session {
    public readonly sessionId: string;
    private readonly ws: WebSocket;
    private readonly mockVsCode: any;
    private readonly mockContext: any;
    private api: any; // Roo-Code扩展导出的API

    constructor(ws: WebSocket) {
        this.sessionId = uuidv4();
        this.ws = ws;

        // 为本会话创建一套全新的模拟API和Context
        this.mockVsCode = createMockVsCodeApi(this);
        this.mockContext = {
            globalState: new Map<string, any>(),
            secrets: new Map<string, any>(),
            subscriptions: [],
            extensionPath: process.cwd(),
        };

        console.log(`[Session ${this.sessionId}] 已创建`);
    }

    // 激活扩展并开始会话
    public async start() {
        // 注入模拟的vscode模块
        require.cache['vscode'] = { exports: this.mockVsCode };
        const extension = require('../dist/extension.js');

        try {
            this.api = await extension.activate(this.mockContext);
            console.log(`[Session ${this.sessionId}] 扩展已激活`);
        } catch (error) {
            console.error(`[Session ${this.sessionId}] 激活失败`, error);
            this.ws.close();
        }
    }

    // 从客户端接收消息
    public handleMessageFromClient(message: any) {
        // 将消息注入到本会话的模拟事件系统中
        this.mockVsCode._triggerWebviewMessage(message);
    }

    // 向客户端发送消息
    public sendMessageToClient(message: any) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    // 清理会话资源
    public destroy() {
        const extension = require('../dist/extension.js');
        if (extension.deactivate) {
            extension.deactivate();
        }
        console.log(`[Session ${this.sessionId}] 已销毁`);
    }
}

// 会话管理器
class SessionManager {
    private sessions = new Map<string, Session>();

    public start() {
        const wss = new WebSocketServer({ port: 8080 });
        console.log('会话管理器已启动，监听端口8080...');

        wss.on('connection', async (ws) => {
            const session = new Session(ws);
            this.sessions.set(session.sessionId, session);

            await session.start();

            ws.on('message', (message) => {
                session.handleMessageFromClient(JSON.parse(message.toString()));
            });

            ws.on('close', () => {
                session.destroy();
                this.sessions.delete(session.sessionId);
                console.log(`客户端断开连接，会话 ${session.sessionId} 已清理。`);
            });
        });
    }
}

// 启动会话管理器
new SessionManager().start();
```

---

## 4. 步骤三：适配Webview UI（无需改动）

采用这种服务器端的会话管理架构后，一个显著的优点是**前端`webview-ui`的代码几乎无需任何改动**。前端的`vscode.ts`实现仍然是连接到`ws://localhost:8080`的单个WebSocket客户端。服务器端的`SessionManager`会自动为每个新的连接创建一个隔离的后端实例，前端对此是无感的。

---

## 5. 总结与优势

通过引入`Session`类和`SessionManager`，我们成功地将原有的单例架构改造成了支持高并发、状态隔离的多会话架构。

**核心优势:** 

- **状态隔离**: 每个用户会话都拥有独立的内存空间、状态和配置，互不干扰，确保了数据的安全性和一致性。
- **可扩展性**: 架构清晰，易于横向扩展。您可以将`SessionManager`部署在多个Node.js实例上，并通过负载均衡器来分发客户端连接。
- **资源管理**: 通过监听WebSocket的`close`事件，可以确保在客户端断开连接时，及时销毁对应的`Session`实例并释放所有相关资源，有效防止内存泄漏。
- **对前端透明**: 前端应用无需关心后端的并发模型，简化了整体架构的复杂性。

这种设计为您将Roo-Code的强大功能集成到生产级的多用户服务中奠定了坚实的基础。
