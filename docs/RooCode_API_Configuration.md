
# Roo-Code API: `setConfiguration` 参数文档

本文档详细说明了可以通过`api.setConfiguration()`方法设置的`RooCodeSettings`对象中的所有参数。这些设置允许您以编程方式完全控制Roo-Code插件的行为。

## 核心用法

要更新配置，您需要获取Roo-Code的API对象，创建一个包含要修改的键和新值的对象，然后调用`setConfiguration`方法。

```typescript
import { RooCodeAPI, RooCodeSettings } from '@roo-code/types';

async function configureRoo(rooApi: RooCodeAPI) {
    const currentConfig = rooApi.getConfiguration();

    const newConfig: Partial<RooCodeSettings> = {
        // 在此定义您想修改的配置
        apiProvider: 'openai',
        openAiModelId: 'gpt-4-turbo',
        allowedCommands: ['git', 'npm', 'node'],
    };

    await rooApi.setConfiguration({ ...currentConfig, ...newConfig });
}
```

---

## 配置参数详解

`RooCodeSettings`对象中的参数可以分为以下几类：

### 1. AI提供商与模型 (Provider & Model)

这些设置决定了Roo-Code使用哪个AI模型来处理您的请求。

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| `apiProvider` | `string` | **必需**。指定当前使用的AI提供商。例如: `openai`, `anthropic`, `ollama`, `openrouter`等。 |
| `openAiApiKey` | `string` | OpenAI的API密钥。 |
| `openAiModelId` | `string` | 要使用的OpenAI模型ID，例如 `gpt-4-turbo`。 |
| `openAiBaseUrl` | `string` | 用于连接与OpenAI兼容的API的自定义URL。 |
| `anthropicApiKey`| `string` | Anthropic的API密钥。 |
| `apiModelId` | `string` | Anthropic或其他兼容提供商的模型ID，例如 `claude-3-opus-20240229`。 |
| `ollamaModelId` | `string` | 要使用的Ollama模型ID。 |
| `ollamaBaseUrl` | `string` | Ollama服务的URL。 |
| `openRouterApiKey`| `string` | OpenRouter的API密钥。 |
| `openRouterModelId`| `string` | 要使用的OpenRouter模型ID。 |
| `geminiApiKey` | `string` | Google Gemini的API密钥。 |
| `modelTemperature`| `number` | 模型温度，控制输出的随机性。值越高，输出越随机。通常在0到1之间。 |
| `modelMaxTokens` | `number` | 模型生成的最大token数。 |

### 2. 安全与权限 (Security & Permissions)

这些设置控制Roo-Code可以执行哪些操作。

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| `allowedCommands` | `string[]` | 一个字符串数组，定义了允许Roo-Code在终端中执行的命令白名单。可以使用 `*` 来允许所有命令。 |
| `deniedCommands` | `string[]` | 一个字符串数组，定义了禁止Roo-Code执行的命令黑名单。 |
| `alwaysAllowExecute`| `boolean` | 如果为`true`，则在执行终端命令前不再请求用户批准。 |
| `alwaysAllowWrite` | `boolean` | 如果为`true`，则在写入或修改文件前不再请求用户批准。 |
| `alwaysAllowReadOnly`| `boolean` | 如果为`true`，则在读取文件前不再请求用户批准。 |
| `alwaysAllowBrowser`| `boolean` | 如果为`true`，则在使用浏览器工具前不再请求用户批准。 |
| `alwaysAllowSubtasks`| `boolean` | 如果为`true`，则在创建子任务前不再请求用户批准。 |

### 3. 功能与行为 (Features & Behavior)

这些设置调整插件的核心功能和用户体验。

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| `customInstructions`| `string` | 自定义指令，会作为系统提示（System Prompt）的一部分发送给AI，用于定制AI的行为和个性。 |
| `diffEnabled` | `boolean` | 是否启用差异视图（Diff View）。如果为`true`，文件修改将以并排差异视图的形式呈现给用户确认。 |
| `enableCheckpoints` | `boolean` | 是否启用任务检查点功能，允许在任务中断后恢复。 |
| `writeDelayMs` | `number` | 写入文件后的延迟时间（毫秒），用于等待文件系统和相关工具（如linter）的响应。 |
| `terminalOutputLineLimit` | `number` | 从终端读取输出时，限制的最大行数。 |
| `language` | `string` | 插件的显示语言，例如 `en`, `zh-CN`。 |

### 4. 内部状态与历史

这些通常由插件内部管理，但在特定场景下可能需要读取或修改。

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| `currentApiConfigName` | `string` | 当前激活的提供商配置档案（Profile）的名称。 |
| `listApiConfigMeta` | `object[]` | 一个对象数组，包含了所有已保存的提供商配置档案的元数据。 |
| `taskHistory` | `object[]` | 包含了所有历史任务记录的数组。 |

---

**注意**: 修改配置，特别是API密钥等敏感信息时，请确保您的代码是安全的，避免将敏感信息硬编码或暴露在不安全的环境中。
