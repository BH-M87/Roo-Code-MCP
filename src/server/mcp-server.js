/**
 * Standalone MCP Server
 * 
 * This is a standalone Node.js server that hosts an MCP server using SSE transport.
 * It's designed to be started by the VS Code extension and provide MCP services
 * to external clients.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');

// Create a log file for debugging
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, `mcp-server-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

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

// Get port from command line arguments or use default
const port = process.argv[2] || 3000;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const httpServer = http.createServer(app);

// Add a simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('MCP Server is running');
});

// Create the MCP server
const mcpServer = new Server(
    {
        name: 'Roo Code MCP Server',
        version: '0.0.1',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register MCP tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    log('Received tools/list request');
    return {
        tools: [
            {
                name: 'startTask',
                description: 'Start a new Roo Code task with the given prompt',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'The prompt to send to Roo Code' },
                        newTab: { type: 'boolean', description: 'Whether to open in a new tab' },
                        model: { type: 'string', description: 'The model to use' },
                        images: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Base64 encoded images to include',
                        },
                    },
                    required: ['prompt'],
                },
            },
            {
                name: 'cancelTask',
                description: 'Cancel a running Roo Code task',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'string', description: 'The ID of the task to cancel' },
                    },
                    required: ['taskId'],
                },
            },
            {
                name: 'sendMessage',
                description: 'Send a message to the current Roo Code task',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The message to send' },
                        images: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Base64 encoded images to include',
                        },
                    },
                    required: ['message'],
                },
            },
            {
                name: 'getWorkspaceInfo',
                description: 'Get information about the current workspace',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});

// Handle tool execution
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log(`Received tools/call request for tool: ${name}`);
    
    switch (name) {
        case 'startTask': {
            try {
                // In a real implementation, this would communicate with the VS Code extension
                // For now, we'll just return a mock response
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task started with prompt: ${args.prompt}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error starting task: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        
        case 'cancelTask': {
            try {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Task ${args.taskId} cancelled`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error cancelling task: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        
        case 'sendMessage': {
            try {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Message sent: ${args.message}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        
        case 'getWorkspaceInfo': {
            try {
                const workspaceInfo = [
                    {
                        name: 'Current Workspace',
                        path: process.cwd(),
                    },
                ];
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(workspaceInfo, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error getting workspace info: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        
        default:
            return {
                content: [
                    {
                        type: 'text',
                        text: `Unknown tool: ${name}`,
                    },
                ],
                isError: true,
            };
    }
});

// Create SSE transport
app.get('/mcp', (req, res) => {
    log('New SSE connection established');
    
    // Create SSE transport with the response object
    const transport = new SSEServerTransport(res);
    
    // Connect the server to the transport
    mcpServer.connect(transport).catch((error) => {
        log(`Error connecting MCP Server to transport: ${error.message}`, true);
    });
    
    // Handle client disconnect
    req.on('close', () => {
        log('SSE connection closed');
        transport.close().catch((error) => {
            log(`Error closing transport: ${error.message}`, true);
        });
    });
});

// Start the server
httpServer.listen(port, () => {
    log(`MCP Server started on port ${port}`);
    log(`Log file: ${logFile}`);
    
    // Signal to the parent process that the server is ready
    if (process.send) {
        process.send('ready');
    }
});

// Handle process signals
process.on('SIGINT', () => {
    log('Received SIGINT, shutting down...');
    httpServer.close(() => {
        log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down...');
    httpServer.close(() => {
        log('HTTP server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.stack}`, true);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled promise rejection: ${reason}`, true);
});
