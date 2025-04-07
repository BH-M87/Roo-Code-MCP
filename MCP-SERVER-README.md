# Roo Code MCP Server

This project implements an MCP (Model Context Protocol) server for the Roo Code VSCode extension. It allows external MCP clients to control Roo Code functionality through a standardized protocol.

## Features

- Automatically starts an MCP server when the VSCode extension is activated
- Implements the MCP protocol using SSE (Server-Sent Events)
- Provides tools to interact with VSCode and Roo Code
- Allows external MCP clients to control Roo Code functionality

## Setup

1. Make the setup script executable:
   ```
   chmod +x setup.sh
   ```

2. Run the setup script:
   ```
   ./setup.sh
   ```

3. Open the project in VSCode and run the extension

## Development

### Prerequisites

- Node.js 20.x or later
- npm or pnpm (recommended)

### Project Structure

- `src/`: VSCode extension source code
  - `services/mcp/`: MCP integration with VSCode
- `server/`: MCP server implementation
  - `src/`: Server source code
  - `dist/`: Compiled server code

### Building

To build the extension and server:

```
npm run package
```

### Running

To run the extension in development mode:

1. Open the project in VSCode
2. Press F5 to start debugging

## MCP Server

The MCP server is implemented using:

- Express.js for the HTTP server
- @modelcontextprotocol/sdk for the MCP implementation
- SSE (Server-Sent Events) for the transport layer

### Available Tools

The server provides the following tools:

- `execute-command`: Execute a VSCode command
- `get-active-editor`: Get information about the active editor
- `get-workspace-folders`: Get information about workspace folders
- `get-file-content`: Get the content of a file
- `update-file-content`: Update the content of a file
- `create-file`: Create a new file
- `delete-file`: Delete a file

## Troubleshooting

If you encounter issues:

1. Check the VSCode output panel for error messages

2. If you get a "command 'roo-cline.restartMcpServer' not found" error:
   ```
   ./fix-command.sh
   ```
   Then restart VSCode

3. Run the fix-permissions script to fix permission issues:
   ```
   ./fix-permissions.sh
   ```

4. Rebuild the server:
   ```
   cd server && ./build.sh
   ```

## License

Same as the Roo Code extension.
