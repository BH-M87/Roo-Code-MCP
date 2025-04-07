/**
 * MCP Node Server Manager
 * 
 * This class manages the standalone Node.js MCP server process.
 * It starts the server when the VS Code extension activates and
 * stops it when the extension deactivates.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import { getPortPromise } from 'portfinder';

export class McpNodeServer {
    private static instance: McpNodeServer | null = null;
    private serverProcess: ChildProcess | null = null;
    private port: number = 0;
    private outputChannel: vscode.OutputChannel;
    private isStarting: boolean = false;
    private isReady: boolean = false;
    private startPromise: Promise<number> | null = null;

    private constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Get the singleton instance of the MCP Node Server
     */
    public static getInstance(outputChannel: vscode.OutputChannel): McpNodeServer {
        if (!McpNodeServer.instance) {
            McpNodeServer.instance = new McpNodeServer(outputChannel);
        }
        return McpNodeServer.instance;
    }

    /**
     * Start the MCP Node Server
     * @returns A promise that resolves to the port number the server is running on
     */
    public async start(): Promise<number> {
        // If the server is already starting, return the existing promise
        if (this.isStarting && this.startPromise) {
            return this.startPromise;
        }

        // If the server is already running, return the port
        if (this.isReady && this.serverProcess && this.port) {
            return this.port;
        }

        this.isStarting = true;
        this.startPromise = this.startServer();
        return this.startPromise;
    }

    /**
     * Get the URL of the MCP server
     * @returns The URL of the MCP server, or null if the server is not running
     */
    public getUrl(): string | null {
        if (!this.isReady || !this.port) {
            return null;
        }
        return `http://localhost:${this.port}/mcp`;
    }

    /**
     * Check if the MCP server is ready
     * @returns True if the server is ready, false otherwise
     */
    public isServerReady(): boolean {
        return this.isReady;
    }

    /**
     * Stop the MCP Node Server
     */
    public async stop(): Promise<void> {
        if (this.serverProcess) {
            this.log('Stopping MCP Node Server...');
            
            // Send SIGTERM to the server process
            this.serverProcess.kill('SIGTERM');
            
            // Wait for the process to exit
            await new Promise<void>((resolve) => {
                if (!this.serverProcess) {
                    resolve();
                    return;
                }
                
                this.serverProcess.on('exit', () => {
                    this.log('MCP Node Server stopped');
                    resolve();
                });
                
                // Force kill after 5 seconds if the process doesn't exit
                setTimeout(() => {
                    if (this.serverProcess) {
                        this.log('Force killing MCP Node Server...');
                        this.serverProcess.kill('SIGKILL');
                        resolve();
                    }
                }, 5000);
            });
            
            this.serverProcess = null;
            this.isReady = false;
            this.isStarting = false;
            this.startPromise = null;
        }
    }

    /**
     * Start the MCP Node Server process
     * @returns A promise that resolves to the port number the server is running on
     */
    private async startServer(): Promise<number> {
        try {
            // Find an available port
            this.port = await getPortPromise({ port: 3000 });
            this.log(`Starting MCP Node Server on port ${this.port}...`);
            
            // Get the path to the server script
            const serverScriptPath = path.join(__dirname, '../../../src/server/mcp-server.js');
            
            // Check if the server script exists
            if (!fs.existsSync(serverScriptPath)) {
                throw new Error(`Server script not found at ${serverScriptPath}`);
            }
            
            // Start the server process
            this.serverProcess = spawn('node', [serverScriptPath, this.port.toString()], {
                stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
                detached: false,
            });
            
            // Handle server output
            if (this.serverProcess.stdout) {
                this.serverProcess.stdout.on('data', (data) => {
                    this.log(`[MCP Server] ${data.toString().trim()}`);
                });
            }
            
            if (this.serverProcess.stderr) {
                this.serverProcess.stderr.on('data', (data) => {
                    this.log(`[MCP Server Error] ${data.toString().trim()}`, true);
                });
            }
            
            // Handle server exit
            this.serverProcess.on('exit', (code, signal) => {
                this.log(`MCP Node Server exited with code ${code} and signal ${signal}`);
                this.serverProcess = null;
                this.isReady = false;
                this.isStarting = false;
                this.startPromise = null;
            });
            
            // Handle server error
            this.serverProcess.on('error', (error) => {
                this.log(`MCP Node Server error: ${error.message}`, true);
                this.serverProcess = null;
                this.isReady = false;
                this.isStarting = false;
                this.startPromise = null;
            });
            
            // Wait for the server to be ready
            await new Promise<void>((resolve, reject) => {
                if (!this.serverProcess) {
                    reject(new Error('Server process not started'));
                    return;
                }
                
                // Listen for the 'ready' message from the server
                this.serverProcess.on('message', (message) => {
                    if (message === 'ready') {
                        this.log('MCP Node Server is ready');
                        this.isReady = true;
                        resolve();
                    }
                });
                
                // Set a timeout in case the server doesn't start
                const timeout = setTimeout(() => {
                    // Check if the server is running by making a request to the health endpoint
                    fetch(`http://localhost:${this.port}/health`)
                        .then(response => {
                            if (response.ok) {
                                this.log('MCP Node Server is ready (detected via health check)');
                                this.isReady = true;
                                resolve();
                            } else {
                                reject(new Error(`Server health check failed with status ${response.status}`));
                            }
                        })
                        .catch(error => {
                            reject(new Error(`Server health check failed: ${error.message}`));
                        });
                }, 5000);
                
                // Clear the timeout if the server exits
                this.serverProcess.on('exit', () => {
                    clearTimeout(timeout);
                    reject(new Error('Server process exited before becoming ready'));
                });
            });
            
            this.isStarting = false;
            return this.port;
        } catch (error) {
            this.isStarting = false;
            this.log(`Failed to start MCP Node Server: ${error instanceof Error ? error.message : String(error)}`, true);
            throw error;
        }
    }

    /**
     * Log a message to the output channel
     * @param message The message to log
     * @param isError Whether the message is an error
     */
    private log(message: string, isError: boolean = false): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [McpNodeServer] ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (isError) {
            console.error(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}
