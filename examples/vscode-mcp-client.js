/**
 * VS Code MCP Client
 * 
 * This script attempts to connect to the MCP server using the VS Code extension API.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a log file for debugging
const logFile = path.join(os.tmpdir(), `roo-code-vscode-mcp-${Date.now()}.log`);

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

log('Starting VS Code MCP Client');
log(`Log file: ${logFile}`);

// First, ensure the MCP server is running
log('Starting MCP server in VS Code...');
const startServerProcess = spawn(getVSCodePath(), [
    '--no-sandbox',
    '--command', 'roo-cline.startMcpServer'
]);

startServerProcess.stdout.on('data', (data) => {
    log(`[Start Server stdout] ${data.toString().trim()}`);
});

startServerProcess.stderr.on('data', (data) => {
    log(`[Start Server stderr] ${data.toString().trim()}`);
});

// Wait for the server to start
setTimeout(() => {
    log('Attempting to connect to MCP server...');
    
    // Create a temporary JavaScript file that will be executed in VS Code
    const tempScriptPath = path.join(os.tmpdir(), `roo-code-mcp-script-${Date.now()}.js`);
    
    // This script will be executed in VS Code and will try to access the MCP server
    const scriptContent = `
        const vscode = require('vscode');
        
        async function testMcpServer() {
            try {
                // Try to execute the MCP server command
                await vscode.commands.executeCommand('roo-cline.startMcpServer');
                console.log('MCP server command executed successfully');
                
                // Try to access the MCP server API if available
                const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-code-mcp');
                
                if (extension) {
                    console.log('Roo Code MCP extension found');
                    
                    if (extension.isActive) {
                        console.log('Extension is active');
                        
                        // Try to access the extension's exports
                        const api = extension.exports;
                        console.log('Extension API:', api);
                    } else {
                        console.log('Extension is not active');
                        await extension.activate();
                        console.log('Extension activated');
                    }
                } else {
                    console.log('Roo Code MCP extension not found');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
        
        testMcpServer();
    `;
    
    fs.writeFileSync(tempScriptPath, scriptContent);
    log(`Created temporary script at ${tempScriptPath}`);
    
    // Execute the script in VS Code
    log('Executing script in VS Code...');
    const executeProcess = spawn(getVSCodePath(), [
        '--no-sandbox',
        '--extensionDevelopmentPath=.',
        '--execute', tempScriptPath
    ]);
    
    executeProcess.stdout.on('data', (data) => {
        log(`[Execute stdout] ${data.toString().trim()}`);
    });
    
    executeProcess.stderr.on('data', (data) => {
        log(`[Execute stderr] ${data.toString().trim()}`);
    });
    
    executeProcess.on('close', (code) => {
        log(`Execute process exited with code ${code}`);
        
        // Clean up the temporary script
        try {
            fs.unlinkSync(tempScriptPath);
            log(`Removed temporary script ${tempScriptPath}`);
        } catch (error) {
            log(`Error removing temporary script: ${error.message}`, true);
        }
    });
}, 2000); // Wait 2 seconds for the server to start

// Keep the process running for a while
setTimeout(() => {
    log('Timeout reached, exiting...');
    process.exit(0);
}, 15000); // Wait 15 seconds
