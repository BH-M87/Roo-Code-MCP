# Roo Code MCP 服务器

Roo Code MCP 是一个基于 VS Code 插件的 MCP（Model Context Protocol）服务器实现，允许外部客户端通过 MCP 协议控制 Roo Code。

## 功能

- 自动启动 MCP 服务器：当 VS Code 插件启动时，MCP 服务器会自动启动
- 支持 SSE 传输：使用 Server-Sent Events 实现可靠的 MCP 通信
- 提供标准 MCP 工具：支持启动任务、取消任务、发送消息等操作

## 安装

1. 克隆此仓库
2. 安装依赖：`npm install` 或 `pnpm install`
3. 构建插件：`npm run build` 或 `pnpm run build`
4. 在 VS Code 中安装插件：
   - 按 F5 启动调试会话，或
   - 使用 `code --install-extension bin/roo-code-mcp-0.0.1.vsix` 安装 VSIX 文件

## 使用方法

### 启动 MCP 服务器

MCP 服务器会在 VS Code 插件启动时自动启动。你也可以通过命令面板手动启动：

1. 打开 VS Code 命令面板（Ctrl+Shift+P 或 Cmd+Shift+P）
2. 输入 `Roo Code MCP: Start MCP Server`
3. 按回车执行命令

### 连接到 MCP 服务器

你可以使用提供的客户端示例连接到 MCP 服务器：

```bash
node examples/mcp-sse-client.js
```

或者，你可以使用自己的 MCP 客户端连接到服务器：

```javascript
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

const client = new Client(
    {
        name: 'My MCP Client',
        version: '0.0.1',
    },
    {
        capabilities: {},
    }
);

const transport = new SSEClientTransport(new URL('http://localhost:3000/mcp'));

async function main() {
    await client.connect(transport);
    console.log('Connected to MCP server');
    
    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);
    
    // Start a new task
    const result = await client.callTool('startTask', {
        prompt: 'Create a simple React component',
        newTab: true,
    });
    
    console.log('Task started:', result);
}

main().catch(console.error);
```

## 可用工具

MCP 服务器提供以下工具：

- `startTask`: 启动一个新的 Roo Code 任务
- `cancelTask`: 取消正在运行的任务
- `sendMessage`: 向当前任务发送消息
- `getWorkspaceInfo`: 获取当前工作区信息

## 配置

你可以通过 VS Code 设置配置 MCP 服务器：

1. 打开 VS Code 设置（Ctrl+, 或 Cmd+,）
2. 搜索 "Roo Code MCP"
3. 配置服务器选项

## 故障排除

如果你在连接到 MCP 服务器时遇到问题，请检查：

1. VS Code 输出面板中的 "Roo-Code" 输出通道，查看服务器日志
2. `logs` 目录中的 MCP 服务器日志文件
3. 确保端口 3000 未被其他应用程序占用

## 许可证

MIT
