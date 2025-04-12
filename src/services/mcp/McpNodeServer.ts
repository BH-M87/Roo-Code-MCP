import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { McpServerManager, Logger } from "../../../server/src/server-manager"
import { MessageType, parseMessage, stringifyMessage, CommunicationMessage } from "../../../server/src/communication"
import { RooCodeEventName } from "../../schemas"

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
					// Generate a unique request ID if not provided
					const requestId = message.requestId || Date.now().toString()

					// Execute the command and send the result back to the server
					this.executeCommand(message.command, message.args || [], requestId)
						.then((result) => {
							this.sendCommandResult(message.command, result, requestId)
						})
						.catch((error) => {
							this.sendCommandError(
								message.command,
								error instanceof Error ? error.message : String(error),
								requestId,
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
	 * @param requestId The request ID for tracking and streaming output
	 * @returns The command result
	 */
	private async executeCommand(command: string, args: any, requestId: string): Promise<any> {
		this.outputChannel.appendLine(`Executing command: ${command} with args: ${JSON.stringify(args)}`)

		// Create an output capture function to send streaming output to MCP client
		const captureOutput = (output: string) => {
			this.sendCommandOutput(command, output, requestId)
		}

		// 通用参数处理逻辑
		const executeWithArgs = async (fn: Function, args: any): Promise<any> => {
			// 如果参数是数组，使用展开运算符
			if (Array.isArray(args)) {
				this.outputChannel.appendLine(`Executing with spread array args: ${JSON.stringify(args)}`)
				captureOutput(`Executing with spread array args: ${JSON.stringify(args)}`)
				return await fn(...args)
			}
			// 如果参数是对象且不为null，直接传递对象
			else if (args !== null && typeof args === "object") {
				this.outputChannel.appendLine(`Executing with object args: ${JSON.stringify(args)}`)
				captureOutput(`Executing with object args: ${JSON.stringify(args)}`)
				return await fn(args)
			}
			// 如果参数是undefined或null，不传参数
			else if (args === undefined || args === null) {
				this.outputChannel.appendLine(`Executing with no args`)
				captureOutput(`Executing with no args`)
				return await fn()
			}
			// 其他情况（基本类型），直接传递值
			else {
				this.outputChannel.appendLine(`Executing with primitive arg: ${args}`)
				captureOutput(`Executing with primitive arg: ${args}`)
				return await fn(args)
			}
		}

		try {
			// 根据命令类型选择执行方式
			let result
			if (this.commandsMap[command]) {
				// 执行内部命令
				result = await executeWithArgs(this.commandsMap[command], args)
			} else if (command.startsWith("vscode.")) {
				// 执行VSCode命令
				const vsCommand = command.substring(7)
				result = await executeWithArgs(
					(...params: any[]) => vscode.commands.executeCommand(vsCommand, ...params),
					args,
				)
			} else {
				// 尝试执行其他VSCode命令
				result = await executeWithArgs(
					(...params: any[]) => vscode.commands.executeCommand(command, ...params),
					args,
				)
			}

			// Collect messages from the webview and wait for task completion
			if (command === "roo-cline.newTask" || command.startsWith("vscode.roo-cline.")) {
				// Get the RooCode API from the extension
				const extension = vscode.extensions.getExtension("RooVeterinaryInc.roo-cline")
				if (extension?.isActive && extension.exports) {
					const api = extension.exports

					// Create a promise that will resolve when the task is completed
					await new Promise<void>((resolve) => {
						let latestMessage: string = ""
						let taskId: string | null = null

						// Listen for messages
						const messageHandler = ({ taskId: msgTaskId, message }: any) => {
							if (!taskId) {
								taskId = msgTaskId
							}

							if (msgTaskId === taskId && message.text) {
								// Send streaming output for each message
								this.sendCommandOutput(command, message.text, requestId)
								latestMessage = message.text
							}
						}

						// Listen for task completion
						const completionHandler = (completedTaskId: string) => {
							if (taskId === completedTaskId) {
								// Task completed, clean up listeners and resolve
								api.off(RooCodeEventName.Message, messageHandler)
								api.off(RooCodeEventName.TaskCompleted, completionHandler)

								this.sendCommandResult(command, latestMessage, requestId)

								resolve()
							}
						}

						// Register event listeners
						api.on(RooCodeEventName.Message, messageHandler)
						api.on(RooCodeEventName.TaskCompleted, completionHandler)

						// Also listen for task aborted to clean up
						api.on(RooCodeEventName.TaskAborted, (abortedTaskId: string) => {
							if (taskId === abortedTaskId) {
								api.off(RooCodeEventName.Message, messageHandler)
								api.off(RooCodeEventName.TaskCompleted, completionHandler)

								this.sendCommandResult(command, latestMessage, requestId)

								resolve()
							}
						})
					})
				} else {
					// If we can't get the API, fall back to the original behavior
					const finalOutputMessage = `Command ${command} completed successfully.`
					this.sendCommandResult(command, finalOutputMessage, requestId)
				}
			} else {
				// For non-Roo-Code commands, use the original behavior
				const finalOutputMessage = `Command ${command} completed successfully.`
				this.sendCommandResult(command, finalOutputMessage, requestId)
			}

			// Return both the result and the output messages for the final result
			return result
		} catch (error) {
			// Send error in output stream
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.sendCommandResult(command, `Error executing command ${command}: ${errorMessage}`, requestId)
			throw error
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
	private sendCommandResult(command: string, result: any, requestId: string): void {
		if (!this.serverManager || !this.serverManager.isRunning()) {
			this.outputChannel.appendLine("Cannot send command result: server not running")
			return
		}

		// Format the result according to MCP client expectations
		// Include both the actual result and a formatted output for display
		let formattedResult = result

		// If the result is an object, ensure it has the expected format
		if (typeof result === "object" && result !== null) {
			// If it's already in the expected format, use it as is
			if (!("result" in result)) {
				// Otherwise, wrap it in the expected format
				formattedResult = {
					result: result,
					status: "success",
					command: command,
				}
			}
		} else {
			// For primitive types, wrap them in the expected format
			formattedResult = {
				result: result,
				status: "success",
				command: command,
			}
		}

		this.serverManager.sendMessageToServer(
			stringifyMessage({
				type: MessageType.COMMAND_RESULT,
				requestId,
				output: formattedResult,
			}),
		)

		this.outputChannel.appendLine(`Sent result for command: ${command}`)
	}

	/**
	 * Send a command error to the server
	 * @param command The command that failed
	 * @param error The error message
	 */
	private sendCommandError(command: string, error: string, requestId: string): void {
		if (!this.serverManager || !this.serverManager.isRunning()) {
			this.outputChannel.appendLine("Cannot send command error: server not running")
			return
		}

		// Format the error message for the client
		const errorMessage = `Error executing command ${command}: ${error}`

		this.serverManager.sendMessageToServer(
			stringifyMessage({
				type: MessageType.COMMAND_ERROR,
				requestId,
				error: errorMessage,
			}),
		)

		this.outputChannel.appendLine(`Sent error for command: ${command}: ${error}`)
	}

	/**
	 * Send command output to the server (streaming)
	 * @param command The command that is being executed
	 * @param output The output text
	 * @param requestId The request ID
	 * @param isComplete Whether this is the final output message
	 */
	private sendCommandOutput(command: string, output: string, requestId: string): void {
		if (!this.serverManager || !this.serverManager.isRunning()) {
			this.outputChannel.appendLine("Cannot send command output: server not running")
			return
		}

		this.serverManager.sendMessageToServer(
			stringifyMessage({
				type: MessageType.COMMAND_OUTPUT,
				requestId,
				output,
			}),
		)

		this.outputChannel.appendLine(`Sent output for command: ${command} (${output})`)
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
