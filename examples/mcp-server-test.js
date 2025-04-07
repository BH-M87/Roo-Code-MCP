/**
 * Simple MCP Server Test
 * 
 * This script tests if the MCP server is running correctly in VS Code.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a log file for debugging
const logFile = path.join(os.tmpdir(), `roo-code-mcp-test-${Date.now()}.log`);

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

// Start the test
log('Starting MCP server test...');
log(`Log file: ${logFile}`);

// First, ensure the MCP server is running
log('Starting MCP server in VS Code...');
const startServerProcess = spawn(getVSCodePath(), [
    '--no-sandbox',
    '--command', 'roo-cline.startMcpServer'
]);

startServerProcess.stdout.on('data', (data) => {
    log(`[VS Code stdout] ${data.toString().trim()}`);
});

startServerProcess.stderr.on('data', (data) => {
    log(`[VS Code stderr] ${data.toString().trim()}`);
});

startServerProcess.on('close', (code) => {
    log(`VS Code process exited with code ${code}`);
    log('Test completed. Check the log file for details.');
});

// Keep the process running for a while to collect logs
setTimeout(() => {
    log('Test timeout reached, exiting...');
    process.exit(0);
}, 10000); // Wait 10 seconds
