背景知识：

1. src/services/mcp/McpNodeServer.ts 中的 getCommandsMap 方法中有 RooCode 能调用的所有能力
2. src/services/mcp/McpNodeServer.ts 是控制mcp node server 的代码。
3. mcp server 在server 目录中

需求：

1. 完成一个 mcp server，这个 server 可以调用 getCommandsMap 中的所有方法，也就是，它可以控制 RooCode 已有的能力
2. getCommandsMap 中的所有方法，能够暴露给调用 mcp server 的 client，让它能够选择合适的方法来调用 RooCode
3. 这个 MCP Server 是从 child_process 中启动的，所以在 src/services/mcp/McpNodeServer.ts 中他能与 RooCode 进行通信
4. mcp server 基于 sse 的方式实现，要保证它能够被顺利的调用
