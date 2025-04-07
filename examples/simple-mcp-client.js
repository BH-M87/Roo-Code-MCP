/**
 * Simple MCP Client Example
 * 
 * This is a minimal example to test connecting to the MCP server.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const path = require('path');

// Path to VS Code's CLI executable
const getVSCodePath = () => {
    switch (process.platform) {
        case 'darwin':
            return '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
        case 'win32':
            return path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd');
        case 'linux':
            return '/usr/bin/code';
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
};

async function main() {
    console.log('Starting Simple MCP Client Example');

    // Create a client
    const client = new Client(
        {
            name: 'Simple MCP Client Example',
            version: '0.0.1',
        },
        {
            capabilities: {},
        }
    );

    console.log('Creating transport to connect to MCP server');
    
    // First, ensure the MCP server is running
    console.log('Starting MCP server in VS Code...');
    const startServerProcess = spawn(getVSCodePath(), [
        '--no-sandbox',
        '--command', 'roo-cline.startMcpServer'
    ]);
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a direct transport to VS Code
    const transport = new StdioClientTransport({
        command: getVSCodePath(),
        args: ['--no-sandbox', '--stdio'],
        cwd: process.cwd(),
        env: process.env,
    });

    try {
        // Connect to the server
        console.log('Connecting to MCP server...');
        await client.connect(transport);
        console.log('Connected to MCP server');

        // List available tools
        console.log('Listing available tools...');
        const tools = await client.listTools();
        console.log('Available tools:', tools);

        // Wait for user input to exit
        console.log('Press Enter to exit...');
        await new Promise(resolve => process.stdin.once('data', resolve));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the connection
        console.log('Closing connection...');
        await transport.close();
    }
}

main().catch(console.error);
