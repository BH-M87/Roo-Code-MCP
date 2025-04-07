/**
 * Roo Code MCP SSE Client Example
 *
 * This is a simple example of how to use the MCP client to interact with Roo Code
 * using the SSE transport.
 *
 * To run this example:
 * 1. Make sure Roo Code extension is running in VS Code
 * 2. The MCP server should start automatically with the extension
 * 3. Run this script with Node.js
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create a log file for debugging
const logFile = path.join(os.tmpdir(), `roo-code-mcp-sse-client-${Date.now()}.log`);

// Log function to both console and file
function log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    if (isError) {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
    
    fs.appendFileSync(logFile, `${logMessage}\n`);
}

async function main() {
    log('Starting Roo Code MCP SSE Client Example');
    log(`Log file: ${logFile}`);

    // Create a client
    const client = new Client(
        {
            name: 'Roo Code MCP SSE Client Example',
            version: '0.0.1',
        },
        {
            capabilities: {},
        }
    );

    // The URL of the MCP server (default port is 3000)
    const mcpServerUrl = 'http://localhost:3000/mcp';
    
    log(`Creating SSE transport to connect to MCP server at ${mcpServerUrl}`);
    
    // Create an SSE transport
    const transport = new SSEClientTransport(new URL(mcpServerUrl));

    try {
        // Connect to the server
        log('Connecting to MCP server...');
        await client.connect(transport);
        log('Connected to Roo Code MCP server');

        // List available tools
        log('Listing available tools...');
        const tools = await client.listTools();
        log(`Available tools: ${JSON.stringify(tools, null, 2)}`);

        // Start a new task
        log('Starting a new task...');
        const result = await client.callTool('startTask', {
            prompt: 'Create a simple React component that displays a counter with increment and decrement buttons',
            newTab: true,
        });

        log(`Task started: ${JSON.stringify(result, null, 2)}`);

        // Wait for user input to exit
        log('Press Enter to exit...');
        await new Promise(resolve => process.stdin.once('data', resolve));
    } catch (error) {
        log(`Error: ${error instanceof Error ? error.stack : String(error)}`, true);
    } finally {
        // Close the connection
        log('Closing connection...');
        try {
            await transport.close();
            log('Connection closed successfully');
        } catch (closeError) {
            log(`Error closing connection: ${closeError instanceof Error ? closeError.message : String(closeError)}`, true);
        }
    }
}

main().catch(error => {
    log(`Unhandled error in main: ${error instanceof Error ? error.stack : String(error)}`, true);
});
