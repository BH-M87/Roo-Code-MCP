# Roo Code MCP Server

这个项目实现了一个 Model Context Protocol (MCP) 服务器，用于 Roo Code VSCode 扩展，允许外部客户端通过 MCP 协议控制 Roo Code。

## 功能特点

- 实现了一个 MCP 服务器，可以被外部客户端控制
- 支持 stdio 和 SSE 传输协议
- 提供用于启动任务、发送消息和获取工作区信息的工具
- 可通过 VS Code 命令进行配置

## 开始使用

### 前提条件

- 安装了 Roo Code 扩展的 VS Code
- 用于运行客户端示例的 Node.js

### 启动 MCP 服务器

1. 在 VS Code 中打开 Roo Code 扩展
2. 从命令面板 (Ctrl+Shift+P) 运行 "Roo Code MCP: Start MCP Server" 命令
3. 服务器将启动并准备接受连接

### 配置 MCP 服务器

1. 从命令面板运行 "Roo Code MCP: Configure MCP Server" 命令
2. 选择传输类型 (stdio 或 sse)
3. 重启服务器以应用更改

## 使用 MCP 服务器

外部客户端可以连接到 MCP 服务器并控制 Roo Code。服务器提供以下工具：

- `startTask`: 使用给定的提示启动新的 Roo Code 任务
- `cancelTask`: 取消正在运行的任务
- `sendMessage`: 向当前任务发送消息
- `getWorkspaceInfo`: 获取当前工作区的信息

## 示例客户端

在 `examples` 目录中提供了一个示例客户端。要运行它：

1. 在 VS Code 中启动 MCP 服务器
2. 如果需要，调整 `examples/mcp-client-example.js` 中的路径
3. 使用 Node.js 运行示例：

```bash
node examples/mcp-client-example.js
```

## 开发

### 项目结构

- `src/services/mcp/McpServer.ts`: 主要 MCP 服务器实现
- `src/services/mcp/McpServerInstance.ts`: MCP 服务器的单例管理器
- `examples/`: 示例客户端代码

### 构建

要构建项目：

```bash
npm run compile
```

## 许可证

该项目使用与 Roo Code 扩展相同的许可证。
