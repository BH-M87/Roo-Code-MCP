// Communication protocol between VSCode extension and MCP server

/**
 * Message types for communication between VSCode extension and MCP server
 */
export enum MessageType {
	// From server to extension
	EXECUTE_COMMAND = "execute_command",
	GET_COMMANDS = "get_commands",

	// From extension to server
	COMMAND_RESULT = "command_result",
	COMMAND_ERROR = "command_error",
	COMMAND_OUTPUT = "command_output",
	COMMANDS_LIST = "commands_list",
}

/**
 * Base message interface
 */
export interface Message {
	type: MessageType
}

/**
 * Message to execute a command
 */
export interface ExecuteCommandMessage extends Message {
	type: MessageType.EXECUTE_COMMAND
	command: string
	args?: any[]
	requestId?: string
}

type Output =
	| string
	| {
			output: string
			status: string
			command: string
			timestamp: string
	  }

/**
 * Message with command execution result
 */
export interface CommandResultMessage extends Message {
	type: MessageType.COMMAND_RESULT
	requestId: string
	output: Output
}

/**
 * Message with command execution error
 */
export interface CommandErrorMessage extends Message {
	type: MessageType.COMMAND_ERROR
	requestId: string
	error: string
}

/**
 * Message with command execution output (streaming)
 */
export interface CommandOutputMessage extends Message {
	type: MessageType.COMMAND_OUTPUT
	requestId: string
	output: Output
}

/**
 * Message to get available commands
 */
export interface GetCommandsMessage extends Message {
	type: MessageType.GET_COMMANDS
}

/**
 * Message with available commands
 */
export interface CommandsListMessage extends Message {
	type: MessageType.COMMANDS_LIST
	commands: {
		name: string
		description: string
	}[]
}

/**
 * Union type of all message types
 */
export type CommunicationMessage =
	| ExecuteCommandMessage
	| CommandResultMessage
	| CommandErrorMessage
	| CommandOutputMessage
	| GetCommandsMessage
	| CommandsListMessage

/**
 * Parse a message from a string
 * @param message The message string
 * @returns The parsed message or null if invalid
 */
export function parseMessage(message: string): CommunicationMessage | null {
	try {
		return JSON.parse(message) as CommunicationMessage
	} catch (error) {
		console.error("Failed to parse message:", error)
		return null
	}
}

/**
 * Stringify a message to send
 * @param message The message to stringify
 * @returns The stringified message
 */
export function stringifyMessage(message: CommunicationMessage): string {
	return JSON.stringify(message)
}
