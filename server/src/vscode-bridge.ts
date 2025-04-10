import { server } from "./index"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { MessageType, stringifyMessage, parseMessage, CommunicationMessage } from "./communication"
import { Logger } from "./server-manager"

// Get the logger from index.ts
let logger: Logger = {
	log: (message: string) => console.log(message),
	error: (message: string) => console.error(message),
}

// Function to set the logger from outside
export function setLogger(newLogger: Logger): void {
	logger = newLogger
	logger.log("Logger set in vscode-bridge")
}

// This module acts as a bridge between the VSCode extension and the MCP server
// It allows the VSCode extension to register handlers for MCP tools

type ToolHandler = (args: any) => Promise<any>

// Store registered tool handlers
const toolHandlers: Record<string, ToolHandler> = {}

// Store command descriptions
const commandDescriptions: Record<string, string> = {}

// Store available commands
let availableCommands: { name: string; description: string }[] = []

/**
 * Register a handler for a tool
 * @param toolName The name of the tool
 * @param handler The handler function
 * @param description Optional description of the tool
 */
export function registerToolHandler(toolName: string, handler: ToolHandler, description?: string): void {
	toolHandlers[toolName] = handler
	if (description) {
		commandDescriptions[toolName] = description
	}
}

/**
 * Set available commands
 * @param commands List of available commands
 */
export function setAvailableCommands(commands: { name: string; description: string }[]): void {
	availableCommands = commands

	// Also register each command as a tool
	commands.forEach((command) => {
		if (!toolHandlers[command.name]) {
			registerToolHandler(
				command.name,
				async (args) => {
					// Execute the command through the process communication
					return await executeCommandViaProcess(command.name, args)
				},
				command.description,
			)
		}
	})
}

/**
 * Execute a command via the process communication
 * @param command The command to execute
 * @param args The command arguments
 * @returns The command result
 */
async function executeCommandViaProcess(command: string, args?: any[]): Promise<any> {
	return new Promise((resolve, reject) => {
		// Generate a unique request ID
		const requestId = Date.now().toString() + Math.random().toString().substring(2)

		// Create a timeout to reject the promise if no response is received
		const timeout = setTimeout(() => {
			reject(new Error(`Command execution timed out: ${command}`))
		}, 30000) // 30 second timeout

		// Set up a one-time message handler for this request
		const messageHandler = (message: CommunicationMessage) => {
			if (
				(message.type === MessageType.COMMAND_RESULT &&
					"requestId" in message &&
					message.requestId === requestId) ||
				(message.type === MessageType.COMMAND_ERROR &&
					"requestId" in message &&
					message.requestId === requestId)
			) {
				clearTimeout(timeout)
				process.removeListener("message", processMessageListener)

				if (message.type === MessageType.COMMAND_RESULT) {
					resolve(message.result)
				} else {
					reject(new Error(message.error))
				}
			}
		}

		// Create a listener that will parse the message and call the handler
		const processMessageListener = (message: any) => {
			if (typeof message === "string") {
				const parsedMessage = parseMessage(message)
				if (parsedMessage) {
					messageHandler(parsedMessage)
				}
			}
		}

		// Listen for the response
		process.on("message", processMessageListener)

		// Send the command execution request
		if (process.send) {
			process.send(
				stringifyMessage({
					type: MessageType.EXECUTE_COMMAND,
					command,
					args,
				}),
			)
		} else {
			clearTimeout(timeout)
			process.removeListener("message", processMessageListener)
			reject(new Error("Cannot communicate with VSCode extension: process.send is not available"))
		}
	})
}

/**
 * Initialize the bridge
 */
export function initializeBridge(): void {
	// Request available commands from the extension
	requestAvailableCommands()

	// Set up process message listener
	process.on("message", (message) => {
		if (typeof message === "string") {
			const parsedMessage = parseMessage(message)
			if (parsedMessage && parsedMessage.type === MessageType.COMMANDS_LIST) {
				setAvailableCommands(parsedMessage.commands)
			}
		}
	})

	// Override the ListToolsRequestSchema handler to list all available tools
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: availableCommands.map((command) => ({
				name: command.name,
				description: command.description,
				inputSchema: {
					type: "object",
					properties: {
						args: {
							type: "array",
							items: {
								type: ["string", "number", "boolean", "object", "array", "null"],
							},
							description: "Arguments to pass to the command",
						},
					},
				},
			})),
		}
	})

	// Override the CallToolRequestSchema handler to use our registered handlers
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args = {} } = request.params

		const handler = toolHandlers[name]
		if (!handler) {
			return {
				content: [
					{
						type: "text",
						text: `No handler registered for tool: ${name}`,
					},
				],
				isError: true,
			}
		}

		try {
			const result = await handler(args.args || [])

			return {
				content: [
					{
						type: "text",
						text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
					},
				],
			}
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
					},
				],
				isError: true,
			}
		}
	})
}

/**
 * Request available commands from the extension
 */
function requestAvailableCommands(): void {
	if (process.send) {
		process.send(
			stringifyMessage({
				type: MessageType.GET_COMMANDS,
			}),
		)
	}
}
