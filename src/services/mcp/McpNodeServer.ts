import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { McpServerManager, Logger } from "../../../server/src/server-manager"
import { MessageType, parseMessage, stringifyMessage, CommunicationMessage } from "../../../server/src/communication"

/**
 * Manages the Node.js MCP server that runs alongside the extension
 */
export class McpNodeServer {
	private static instance: McpNodeServer | null = null
	private serverManager: McpServerManager | null = null
	private statusBarItem: vscode.StatusBarItem
	private extensionPath: string
	private outputChannel: vscode.OutputChannel
	private commandsMap: Record<string, (...args: any[]) => any> = {}

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
	 * Set the commands map
	 * @param commandsMap The commands map
	 */
	public setCommandsMap(commandsMap: Record<string, (...args: any[]) => any>): void {
		this.commandsMap = commandsMap
		this.outputChannel.appendLine(`Registered ${Object.keys(commandsMap).length} commands with MCP server`)
	}

	/**
	 * Handle messages from the MCP server
	 * @param message The message from the server
	 */
	private handleServerMessage(message: CommunicationMessage): void {
		this.outputChannel.appendLine(`Received message from server: ${message.type}`)

		switch (message.type) {
			case MessageType.GET_COMMANDS:
				// Send the list of available commands to the server
				this.sendCommandsList()
				break

			case MessageType.EXECUTE_COMMAND:
				if ("command" in message) {
					// Execute the command and send the result back to the server
					this.executeCommand(message.command, message.args || [])
						.then((result) => {
							this.sendCommandResult(message.command, result)
						})
						.catch((error) => {
							this.sendCommandError(
								message.command,
								error instanceof Error ? error.message : String(error),
							)
						})
				}
				break

			default:
				this.outputChannel.appendLine(`Unknown message type: ${message.type}`)
		}
	}

	/**
	 * Execute a command
	 * @param command The command to execute
	 * @param args The command arguments (can be array, object, or primitive value)
	 * @returns The command result
	 */
	private async executeCommand(command: string, args: any): Promise<any> {
		this.outputChannel.appendLine(`Executing command: ${command} with args: ${JSON.stringify(args)}`)

		// 通用参数处理逻辑
		const executeWithArgs = async (fn: Function, args: any): Promise<any> => {
			// 如果参数是数组，使用展开运算符
			if (Array.isArray(args)) {
				this.outputChannel.appendLine(`Executing with spread array args: ${JSON.stringify(args)}`)
				return await fn(...args)
			}
			// 如果参数是对象且不为null，直接传递对象
			else if (args !== null && typeof args === "object") {
				this.outputChannel.appendLine(`Executing with object args: ${JSON.stringify(args)}`)
				return await fn(args)
			}
			// 如果参数是undefined或null，不传参数
			else if (args === undefined || args === null) {
				this.outputChannel.appendLine(`Executing with no args`)
				return await fn()
			}
			// 其他情况（基本类型），直接传递值
			else {
				this.outputChannel.appendLine(`Executing with primitive arg: ${args}`)
				return await fn(args)
			}
		}

		// 根据命令类型选择执行方式
		if (this.commandsMap[command]) {
			// 执行内部命令
			return await executeWithArgs(this.commandsMap[command], args)
		} else if (command.startsWith("vscode.")) {
			// 执行VSCode命令
			const vsCommand = command.substring(7)
			return await executeWithArgs(
				(...params: any[]) => vscode.commands.executeCommand(vsCommand, ...params),
				args,
			)
		} else {
			// 尝试执行其他VSCode命令
			return await executeWithArgs((...params: any[]) => vscode.commands.executeCommand(command, ...params), args)
		}
	}

	/**
	 * Send the list of available commands to the server
	 */
	private sendCommandsList(): void {
		if (!this.serverManager || !this.serverManager.isRunning()) {
			this.outputChannel.appendLine("Cannot send commands list: server not running")
			return
		}

		const commands = Object.keys(this.commandsMap).map((name) => ({
			name,
			description: `Execute the ${name} command`,
		}))

		// Add VSCode commands
		commands.push({
			name: "vscode.executeCommand",
			description: "Execute a VSCode command",
		})

		this.serverManager.sendMessageToServer(
			stringifyMessage({
				type: MessageType.COMMANDS_LIST,
				commands,
			}),
		)

		this.outputChannel.appendLine(`Sent ${commands.length} commands to server`)
	}

	/**
	 * Send a command result to the server
	 * @param command The command that was executed
	 * @param result The command result
	 */
	private sendCommandResult(command: string, result: any): void {
		if (!this.serverManager || !this.serverManager.isRunning()) {
			this.outputChannel.appendLine("Cannot send command result: server not running")
			return
		}

		this.serverManager.sendMessageToServer(
			stringifyMessage({
				type: MessageType.COMMAND_RESULT,
				requestId: Date.now().toString(),
				result,
			}),
		)

		this.outputChannel.appendLine(`Sent result for command: ${command}`)
	}

	/**
	 * Send a command error to the server
	 * @param command The command that failed
	 * @param error The error message
	 */
	private sendCommandError(command: string, error: string): void {
		if (!this.serverManager || !this.serverManager.isRunning()) {
			this.outputChannel.appendLine("Cannot send command error: server not running")
			return
		}

		this.serverManager.sendMessageToServer(
			stringifyMessage({
				type: MessageType.COMMAND_ERROR,
				requestId: Date.now().toString(),
				error,
			}),
		)

		this.outputChannel.appendLine(`Sent error for command: ${command}: ${error}`)
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
			this.serverManager = new McpServerManager(this.extensionPath, 5201, logger)

			// Set up message handler
			this.serverManager.setMessageHandler((message: string) => {
				try {
					const parsedMessage = parseMessage(message)
					if (parsedMessage) {
						this.handleServerMessage(parsedMessage)
					}
				} catch (error) {
					this.outputChannel.appendLine(
						`Error parsing message from server: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			})

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
