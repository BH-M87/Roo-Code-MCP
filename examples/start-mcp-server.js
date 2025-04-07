/**
 * Start MCP Server
 * 
 * This script starts the MCP server in VS Code.
 */

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

console.log('Starting MCP server in VS Code...');
const vscode = spawn(getVSCodePath(), [
    '--no-sandbox',
    '--command', 'roo-cline.startMcpServer'
]);

vscode.stdout.on('data', (data) => {
    console.log(`[VS Code stdout] ${data.toString().trim()}`);
});

vscode.stderr.on('data', (data) => {
    console.error(`[VS Code stderr] ${data.toString().trim()}`);
});

vscode.on('close', (code) => {
    console.log(`VS Code process exited with code ${code}`);
});

// Keep the process running for a while
setTimeout(() => {
    console.log('Timeout reached, exiting...');
    process.exit(0);
}, 5000); // Wait 5 seconds
