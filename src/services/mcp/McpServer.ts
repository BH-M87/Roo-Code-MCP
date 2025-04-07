import * as vscode from "vscode"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
// z is used indirectly in the JSON schema definitions
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

import { ClineProvider } from "../../core/webview/ClineProvider"
import { API } from "../../exports/api"

// Define interfaces for tool arguments
interface StartTaskArgs {
	prompt: string
	newTab?: boolean
	model?: string
	images?: string[]
}

interface CancelTaskArgs {
	taskId: string
}

interface SendMessageArgs {
	message: string
	images?: string[]
}

// Union type for all tool arguments
type ToolArgs = StartTaskArgs | CancelTaskArgs | SendMessageArgs | Record<string, never>

/**
 * MCP Server implementation for Roo Code
 * This allows external clients to control Roo Code via the MCP protocol
 */
export class McpServer {
	private server: Server
	private transport: StdioServerTransport | SSEServerTransport
	private disposables: vscode.Disposable[] = []
	private isDisposed: boolean = false
	private api: API

	constructor(
		provider: ClineProvider,
		private readonly outputChannel: vscode.OutputChannel,
		transportType: "stdio" | "sse" = "stdio",
	) {
		// Create the MCP server
		this.server = new Server(
			{
				name: "Roo Code MCP Server",
				version: provider.context.extension?.packageJSON?.version ?? "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		)

		// Set up the API instance
		this.api = new API(outputChannel, provider)

		// Register tools
		this.registerTools()

		// Create the transport
		if (transportType === "stdio") {
			this.transport = new StdioServerTransport()
		} else {
			// For SSE transport, we would need to provide proper configuration
			// This is a placeholder - in a real implementation, you would need to configure
			// the SSE transport with proper HTTP server integration
			// The SSE transport constructor requires a response object in a real implementation
			// For now, we're using any to bypass the type check
			// this.transport = new SSEServerTransport()
			// only support StdioServerTransport for now
			this.transport = new StdioServerTransport()
		}

		// Connect the server to the transport
		this.initializeServer()
	}

	/**
	 * Initialize the server and connect to the transport
	 */
	private async initializeServer() {
		try {
			// Connect the server to the transport
			await this.server.connect(this.transport)
			this.outputChannel.appendLine(`MCP Server connected via ${this.transport.constructor.name}`)
		} catch (error) {
			this.outputChannel.appendLine(
				`Error connecting MCP Server: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Register MCP tools that can be called by clients
	 */
	private registerTools() {
		// Define available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: [
					{
						name: "startTask",
						description: "Start a new Roo Code task with the given prompt",
						inputSchema: {
							type: "object",
							properties: {
								prompt: { type: "string", description: "The prompt to send to Roo Code" },
								newTab: { type: "boolean", description: "Whether to open in a new tab" },
								model: { type: "string", description: "The model to use" },
								images: {
									type: "array",
									items: { type: "string" },
									description: "Base64 encoded images to include",
								},
							},
							required: ["prompt"],
						},
					},
					{
						name: "cancelTask",
						description: "Cancel a running Roo Code task",
						inputSchema: {
							type: "object",
							properties: {
								taskId: { type: "string", description: "The ID of the task to cancel" },
							},
							required: ["taskId"],
						},
					},
					{
						name: "sendMessage",
						description: "Send a message to the current Roo Code task",
						inputSchema: {
							type: "object",
							properties: {
								message: { type: "string", description: "The message to send" },
								images: {
									type: "array",
									items: { type: "string" },
									description: "Base64 encoded images to include",
								},
							},
							required: ["message"],
						},
					},
					{
						name: "getWorkspaceInfo",
						description: "Get information about the current workspace",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
				],
			}
		})

		// Handle tool execution
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: _args } = request.params
			const args = (_args as ToolArgs) || {}

			switch (name) {
				case "startTask": {
					try {
						const startTaskArgs = args as StartTaskArgs
						const configuration = {
							model: startTaskArgs.model || "default",
							// Add other configuration options as needed
						}

						const taskId = await this.api.startNewTask({
							configuration: configuration as any, // Type casting to avoid type issues
							text: startTaskArgs.prompt,
							images: startTaskArgs.images || [],
							newTab: !!startTaskArgs.newTab,
						})

						return {
							content: [
								{
									type: "text",
									text: `Task started with ID: ${taskId}`,
								},
							],
						}
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: `Error starting task: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
							isError: true,
						}
					}
				}

				case "cancelTask": {
					try {
						const cancelTaskArgs = args as CancelTaskArgs
						await this.api.cancelTask(cancelTaskArgs.taskId)
						return {
							content: [
								{
									type: "text",
									text: `Task ${(args as CancelTaskArgs).taskId} canceled`,
								},
							],
						}
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: `Error canceling task: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
							isError: true,
						}
					}
				}

				case "sendMessage": {
					try {
						const sendMessageArgs = args as SendMessageArgs
						await this.api.sendMessage(sendMessageArgs.message, sendMessageArgs.images)
						return {
							content: [
								{
									type: "text",
									text: "Message sent",
								},
							],
						}
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
							isError: true,
						}
					}
				}

				case "getWorkspaceInfo": {
					try {
						const workspaceFolders = vscode.workspace.workspaceFolders || []
						const workspaceInfo = workspaceFolders.map((folder) => ({
							name: folder.name,
							path: folder.uri.fsPath,
						}))

						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(workspaceInfo, null, 2),
								},
							],
						}
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: `Error getting workspace info: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
							isError: true,
						}
					}
				}

				default:
					return {
						content: [
							{
								type: "text",
								text: `Unknown tool: ${name}`,
							},
						],
						isError: true,
					}
			}
		})
	}

	/**
	 * Dispose of the server and clean up resources
	 */
	public async dispose() {
		if (this.isDisposed) {
			return
		}

		this.isDisposed = true

		// Dispose of all disposables
		for (const disposable of this.disposables) {
			disposable.dispose()
		}

		try {
			// Close the transport
			await this.transport.close()
			this.outputChannel.appendLine("MCP Server transport closed")
		} catch (error) {
			this.outputChannel.appendLine(
				`Error closing MCP Server transport: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
