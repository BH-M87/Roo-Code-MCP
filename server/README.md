# Roo Code MCP Server

This is an MCP (Model Context Protocol) server for the Roo Code VSCode extension. It allows external MCP clients to control Roo Code functionality.

## Features

- Implements the MCP protocol using SSE (Server-Sent Events)
- Provides tools to interact with VSCode and Roo Code
- Starts automatically when the Roo Code extension is activated

## Development

### Prerequisites

- Node.js 20.x or later
- npm (recommended) or npm

### Setup

1. Install dependencies:

    ```
    npm install
    ```

2. Install type declarations:

    ```
    ./install-types.sh
    ```

3. Build the server:
    ```
    npm run build
    ```

### Running the server

The server is automatically started by the Roo Code extension. However, you can also run it manually for testing:

```bash
npm run start
```

The server runs on port 5201 by default. You can access it at http://localhost:5201 when it's running.

## Tools

The server provides the following tools:

- `execute-command`: Execute a VSCode command
- `get-active-editor`: Get information about the active editor
- `get-workspace-folders`: Get information about workspace folders
- `get-file-content`: Get the content of a file
- `update-file-content`: Update the content of a file
- `create-file`: Create a new file
- `delete-file`: Delete a file

## Architecture

The server is built using:

- Express.js for the HTTP server
- @modelcontextprotocol/sdk for the MCP implementation
- SSE (Server-Sent Events) for the transport layer

## License

Same as the Roo Code extension.
