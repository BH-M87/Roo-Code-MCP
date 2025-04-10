import { ChildProcess, fork } from "child_process"
import * as path from "path"
import * as fs from "fs"

// Define a logger interface to allow for different logging implementations
export interface Logger {
	log(message: string): void
	error(message: string): void
}

// Define a message handler type
export type MessageHandler = (message: string) => void

/**
 * Manager for the MCP server process
 */
export class McpServerManager {
	private serverProcess: ChildProcess | null = null
	private serverPort: number
	private serverUrl: string
	private extensionPath: string
	private logger: Logger
	private messageHandler: MessageHandler | null = null

	/**
	 * Create a new server manager
	 * @param extensionPath The path to the extension
	 * @param port The port to run the server on
	 */
	constructor(extensionPath: string, port: number = 3000, logger?: Logger) {
		this.extensionPath = extensionPath
		this.serverPort = port
		this.serverUrl = `http://localhost:${port}`

		// Use provided logger or create a default console logger
		this.logger = logger || {
			log: (message: string) => console.log(message),
			error: (message: string) => console.error(message),
		}
	}

	/**
	 * Start the server
	 * @returns A promise that resolves when the server is started
	 */
	async startServer(): Promise<void> {
		if (this.serverProcess) {
			this.logger.log("Server already running")
			return
		}

		return new Promise<void>((resolve, reject) => {
			const serverPath = path.join(this.extensionPath, "server", "dist", "index.js")

			// Check if the server file exists
			if (!fs.existsSync(serverPath)) {
				return reject(new Error(`Server file not found: ${serverPath}`))
			}

			// Import the server module to set the logger
			try {
				// Try to import the server module to set the logger
				const serverModule = require(serverPath)
				if (typeof serverModule.setLogger === "function") {
					serverModule.setLogger(this.logger)
					this.logger.log("Logger set in server module")
				}
			} catch (error) {
				this.logger.error(
					`Failed to import server module: ${error instanceof Error ? error.message : String(error)}`,
				)
			}

			// Start the server process with IPC for communication
			// Use fork instead of spawn to enable IPC
			this.serverProcess = fork(serverPath, [], {
				env: {
					...process.env,
					PORT: this.serverPort.toString(),
				},
				// Enable stdio and IPC
				stdio: ["pipe", "pipe", "pipe", "ipc"],
			})

			// Handle server output
			this.serverProcess.stdout?.on("data", (data) => {
				const message = `MCP Server: ${data.toString().trim()}`
				this.logger.log(message)
			})

			this.serverProcess.stderr?.on("data", (data) => {
				const message = `MCP Server Error: ${data.toString().trim()}`
				this.logger.error(message)
			})

			// Handle server exit
			this.serverProcess.on("exit", (code, signal) => {
				this.logger.log(`MCP Server exited with code ${code} and signal ${signal}`)
				this.serverProcess = null
			})

			// Handle server error
			this.serverProcess.on("error", (error) => {
				this.logger.error(`Failed to start MCP Server: ${error.message}`)
				this.serverProcess = null
				reject(error)
			})

			// If a message handler is set, set it up for the new process
			if (this.messageHandler) {
				this.setMessageHandler(this.messageHandler)
			}

			// Wait for the server to start
			setTimeout(() => {
				// Check if the server is still running
				if (this.serverProcess) {
					this.logger.log(`MCP Server started successfully on ${this.serverUrl}`)
					resolve()
				} else {
					this.logger.error("Server failed to start")
					reject(new Error("Server failed to start"))
				}
			}, 1000)
		})
	}

	/**
	 * Stop the server
	 */
	async stopServer(): Promise<void> {
		if (!this.serverProcess) {
			this.logger.log("No server process to stop")
			return
		}

		return new Promise<void>((resolve) => {
			if (!this.serverProcess) {
				resolve()
				return
			}

			// Log stopping server
			this.logger.log("Stopping MCP server...")

			// Kill the server process
			this.serverProcess.kill()

			// Wait for the process to exit
			this.serverProcess.on("exit", () => {
				this.logger.log("MCP server stopped gracefully")
				this.serverProcess = null
				resolve()
			})

			// Force kill after timeout
			setTimeout(() => {
				if (this.serverProcess) {
					this.logger.log("Force killing MCP server after timeout")
					this.serverProcess.kill("SIGKILL")
					this.serverProcess = null
					resolve()
				}
			}, 5000)
		})
	}

	/**
	 * Get the server URL
	 * @returns The server URL
	 */
	getServerUrl(): string {
		return this.serverUrl
	}

	/**
	 * Check if the server is running
	 * @returns True if the server is running
	 */
	isRunning(): boolean {
		return this.serverProcess !== null
	}

	/**
	 * Set a handler for messages from the server
	 * @param handler The message handler
	 */
	setMessageHandler(handler: MessageHandler): void {
		this.messageHandler = handler
		this.logger.log("Message handler set")

		// Set up message handling for the server process
		if (this.serverProcess) {
			// Set up IPC message handling
			this.serverProcess.on("message", (message: any) => {
				if (typeof message === "string" && this.messageHandler) {
					try {
						this.messageHandler(message)
					} catch (error) {
						this.logger.error(
							`Error handling IPC message: ${error instanceof Error ? error.message : String(error)}`,
						)
					}
				}
			})

			// Also keep stdout handling for backward compatibility and logging
			this.serverProcess.stdout?.on("data", (data: Buffer) => {
				const message = data.toString().trim()
				if (message.startsWith("{") && this.messageHandler) {
					try {
						this.messageHandler(message)
					} catch (error) {
						this.logger.error(
							`Error handling stdout message: ${error instanceof Error ? error.message : String(error)}`,
						)
					}
				}
			})
		}
	}

	/**
	 * Send a message to the server
	 * @param message The message to send
	 */
	sendMessageToServer(message: string): void {
		if (!this.serverProcess) {
			this.logger.error("Cannot send message: server not running")
			return
		}

		try {
			// Use IPC to send messages to the child process
			if (this.serverProcess.send) {
				this.serverProcess.send(message)
				this.logger.log("Message sent to server via IPC")
			} else {
				this.logger.error("Cannot send message: IPC channel not available")
			}
		} catch (error) {
			this.logger.error(
				`Error sending message to server: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
