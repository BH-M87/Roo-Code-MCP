import { ChildProcess, spawn } from "child_process"
import * as path from "path"
import * as fs from "fs"

// Define a logger interface to allow for different logging implementations
export interface Logger {
	log(message: string): void
	error(message: string): void
}

/**
 * Manager for the MCP server process
 */
export class McpServerManager {
	private serverProcess: ChildProcess | null = null
	private serverPort: number
	private serverUrl: string
	private extensionPath: string
	private logger: Logger

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

			// Start the server process
			this.serverProcess = spawn("node", [serverPath], {
				env: {
					...process.env,
					PORT: this.serverPort.toString(),
				},
				stdio: ["ignore", "pipe", "pipe"],
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
}
