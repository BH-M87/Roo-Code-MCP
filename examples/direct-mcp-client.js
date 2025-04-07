/**
 * Direct MCP Client
 * 
 * This script attempts to connect directly to the MCP server using a socket.
 */

const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Create a log file for debugging
const logFile = path.join(os.tmpdir(), `roo-code-direct-mcp-${Date.now()}.log`);

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

log('Starting Direct MCP Client');
log(`Log file: ${logFile}`);

// Try to find a socket file in the temp directory
const tempDir = os.tmpdir();
log(`Searching for MCP socket files in ${tempDir}`);

fs.readdir(tempDir, (err, files) => {
    if (err) {
        log(`Error reading temp directory: ${err.message}`, true);
        return;
    }
    
    // Look for files that might be MCP sockets
    const socketFiles = files.filter(file => file.includes('mcp') || file.includes('roo'));
    
    log(`Found ${socketFiles.length} potential socket files: ${socketFiles.join(', ')}`);
    
    if (socketFiles.length === 0) {
        log('No potential socket files found. Make sure the MCP server is running.', true);
        return;
    }
    
    // Try to connect to each socket file
    socketFiles.forEach(socketFile => {
        const socketPath = path.join(tempDir, socketFile);
        log(`Trying to connect to socket: ${socketPath}`);
        
        const client = net.createConnection({ path: socketPath }, () => {
            log(`Connected to socket: ${socketPath}`);
            
            // Send a simple message
            client.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list'
            }) + '\n');
            
            log('Sent tools/list request');
        });
        
        client.on('data', (data) => {
            log(`Received data: ${data.toString()}`);
            client.end();
        });
        
        client.on('error', (err) => {
            log(`Error connecting to socket ${socketPath}: ${err.message}`, true);
        });
        
        client.on('end', () => {
            log(`Disconnected from socket: ${socketPath}`);
        });
    });
});

// Keep the process running for a while
setTimeout(() => {
    log('Timeout reached, exiting...');
    process.exit(0);
}, 10000); // Wait 10 seconds
