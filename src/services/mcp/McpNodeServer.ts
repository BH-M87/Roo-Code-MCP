import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { McpServerManager, Logger } from "../../../server/src/server-manager"

/**
 * Manages the Node.js MCP server that runs alongside the extension
 */
export class McpNodeServer {
	private static instance: McpNodeServer | null = null
	private serverManager: McpServerManager | null = null
	private statusBarItem: vscode.StatusBarItem
	private extensionPath: string
	private outputChannel: vscode.OutputChannel

	private constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
		this.outputChannel = outputChannel
		this.extensionPath = context.extensionPath
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
		this.statusBarItem.text = "$(server) MCP: Starting..."
		this.statusBarItem.tooltip = "Roo Code MCP Server"
		this.statusBarItem.command = "roo-cline.restartMcpServer"
		this.statusBarItem.show()
		context.subscriptions.push(this.statusBarItem)
	}

	/**
	 * Get the singleton instance
	 * @param context The extension context
	 * @param outputChannel The output channel to log to
	 */
	public static getInstance(context: vscode.ExtensionContext, outputChannel?: vscode.OutputChannel): McpNodeServer {
		if (!McpNodeServer.instance) {
			// If no output channel is provided, create a new one
			if (!outputChannel) {
				outputChannel = vscode.window.createOutputChannel("Roo-Code-MCP-Server")
				context.subscriptions.push(outputChannel)
			}
			McpNodeServer.instance = new McpNodeServer(context, outputChannel)
		}
		return McpNodeServer.instance
	}

	/**
	 * Start the MCP server
	 */
	public async startServer(): Promise<void> {
		try {
			// Create a logger that uses the output channel
			const logger: Logger = {
				log: (message: string) => {
					this.outputChannel.appendLine(message)
				},
				error: (message: string) => {
					this.outputChannel.appendLine(`ERROR: ${message}`)
				},
			}

			// Create server manager with the logger
			this.serverManager = new McpServerManager(this.extensionPath, 3000, logger)

			// Update status
			this.statusBarItem.text = "$(server) MCP: Starting..."

			// Check if server files exist
			const serverPath = path.join(this.extensionPath, "server", "dist", "index.js")
			if (!fs.existsSync(serverPath)) {
				// Try to build the server
				this.statusBarItem.text = "$(server) MCP: Building..."
				try {
					await vscode.window.withProgress(
						{
							location: vscode.ProgressLocation.Notification,
							title: "Building MCP server...",
							cancellable: false,
						},
						async () => {
							const buildScript = path.join(this.extensionPath, "server", "build.sh")
							if (fs.existsSync(buildScript)) {
								// Make script executable
								fs.chmodSync(buildScript, "755")

								// Run build script
								const { spawn } = require("child_process")
								return new Promise<void>((resolve, reject) => {
									const process = spawn(buildScript, [], {
										cwd: path.join(this.extensionPath, "server"),
										shell: true,
									})

									// Log build output
									process.stdout?.on("data", (data: Buffer) => {
										this.outputChannel.appendLine(`Build: ${data.toString().trim()}`)
									})

									process.stderr?.on("data", (data: Buffer) => {
										this.outputChannel.appendLine(`Build Error: ${data.toString().trim()}`)
									})

									process.on("close", (code: number | null) => {
										if (code === 0) {
											this.outputChannel.appendLine("Build completed successfully")
											resolve()
										} else {
											this.outputChannel.appendLine(`Build failed with code ${code}`)
											reject(new Error(`Build script exited with code ${code}`))
										}
									})
								})
							} else {
								throw new Error(`Build script not found: ${buildScript}`)
							}
						},
					)
				} catch (buildError) {
					throw new Error(
						`Failed to build server: ${buildError instanceof Error ? buildError.message : String(buildError)}`,
					)
				}
			}

			// Start server
			await this.serverManager.startServer()

			// Update status
			this.statusBarItem.text = "$(server) MCP: Running"
			this.statusBarItem.tooltip = `Roo Code MCP Server - ${this.serverManager.getServerUrl()}`

			// Log success
			this.outputChannel.appendLine("MCP server started successfully")
			console.log("MCP server started successfully")
		} catch (error) {
			// Update status
			this.statusBarItem.text = "$(error) MCP: Failed"
			this.statusBarItem.tooltip = `Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`

			// Log error
			this.outputChannel.appendLine(
				`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
			)
			console.error("Failed to start MCP server:", error)

			// Show error message
			vscode.window.showErrorMessage(
				`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Stop the MCP server
	 */
	public async stopServer(): Promise<void> {
		if (!this.serverManager) {
			return
		}

		try {
			// Update status
			this.statusBarItem.text = "$(server) MCP: Stopping..."

			// Stop server
			await this.serverManager.stopServer()

			// Update status
			this.statusBarItem.text = "$(server) MCP: Stopped"

			// Log success
			this.outputChannel.appendLine("MCP server stopped successfully")
			console.log("MCP server stopped successfully")
		} catch (error) {
			// Update status
			this.statusBarItem.text = "$(error) MCP: Error"

			// Log error
			this.outputChannel.appendLine(
				`Failed to stop MCP server: ${error instanceof Error ? error.message : String(error)}`,
			)
			console.error("Failed to stop MCP server:", error)
		}
	}

	/**
	 * Restart the MCP server
	 */
	public async restartServer(): Promise<void> {
		await this.stopServer()
		await this.startServer()
	}

	/**
	 * Get the server URL
	 */
	public getServerUrl(): string | null {
		return this.serverManager?.getServerUrl() || null
	}

	/**
	 * Check if the server is running
	 */
	public isRunning(): boolean {
		return this.serverManager?.isRunning() || false
	}

	/**
	 * Dispose of resources
	 */
	public async dispose(): Promise<void> {
		await this.stopServer()
		this.statusBarItem.dispose()
	}
}
