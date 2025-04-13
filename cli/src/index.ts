#!/usr/bin/env node

import { Command } from "commander"
import dotenv from "dotenv"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import chalk from "chalk"

import {
	readTaskConfig,
	readProviderProfiles,
	readGlobalSettings,
	getMergedCustomModes,
	saveTaskConfig,
} from "./config/settings"
import { createServer } from "./server"
import { Provider } from "./core/provider"
import { handleNewTask } from "./core/task"
import { printMessage } from "./utils/terminal"
import { CommandOptions, TaskConfig, ApiConfig } from "./types"
import { McpServerManager } from "./mcp/server"
import { setApiConfig } from "./core/tools/newTaskTool"

// Load environment variables
dotenv.config()

const program = new Command()

program.name("roo").description("Roo CLI - Execute AI tasks from the command line").version("1.0.0")

// New task command
program
	.command("new [prompt]")
	.description("Create a new task")
	.option("-w, --workspace <path>", "Workspace directory for file operations (default: current directory)")
	.option("-m, --mode <mode>", "Mode to use (e.g., code, ask)")
	.option("-c, --config-file <path>", "Path to task configuration file")
	.option("-p, --provider-file <path>", "Path to provider profiles file")
	.option("-s, --settings-file <path>", "Path to global settings file")
	.option("-o, --modes-file <path>", "Path to custom modes file")
	.option("-v, --verbose", "Enable verbose output")
	.option("--continuous", "Enable continuous execution mode")
	.option("--max-steps <steps>", "Maximum number of steps for continuous mode", "10")
	.option("--api-provider <provider>", "API provider to use (anthropic, openai)")
	.option("--openai-api-key <key>", "OpenAI API key")
	.option("--openai-base-url <url>", "OpenAI API base URL")
	.option("--openai-model <model>", "OpenAI model ID")
	.option("--anthropic-api-key <key>", "Anthropic API key")
	.option("--anthropic-model <model>", "Anthropic model ID")
	.action(async (promptArg, options: CommandOptions) => {
		try {
			// Get prompt from argument or interactive input
			const prompt = promptArg || options.prompt

			if (!prompt) {
				printMessage("Error: Prompt is required", "error")
				process.exit(1)
			}

			// Load configuration
			const taskConfig = await loadTaskConfig(prompt, options)
			const providerProfiles = await readProviderProfiles(options.providerFile)
			const settings = await readGlobalSettings(options.settingsFile)
			await getMergedCustomModes(settings, options.modesFile)

			if (!providerProfiles) {
				printMessage("Error: Provider profiles not found", "error")
				process.exit(1)
			}

			if (!settings) {
				printMessage("Error: Global settings not found", "error")
				process.exit(1)
			}

			// Get API configuration from command line options or provider profiles
			let apiConfig = getApiConfigFromOptions(options)

			// If no API config from options, use the one from provider profiles
			if (!apiConfig) {
				const currentApiConfigName = providerProfiles.currentApiConfigName
				apiConfig = providerProfiles.apiConfigs[currentApiConfigName]

				if (!apiConfig) {
					printMessage(`Error: API configuration '${currentApiConfigName}' not found`, "error")
					process.exit(1)
				}
			}

			if (options.verbose) {
				printMessage(`Using API provider: ${apiConfig.apiProvider}`, "info")
				printMessage(`Using mode: ${taskConfig.mode}`, "info")
				printMessage(`Working directory: ${taskConfig.cwd || process.cwd()}`, "info")
			}

			// Execute task
			printMessage("Executing task...", "info")
			const result = await handleNewTask({
				prompt: taskConfig.message,
				mode: taskConfig.mode,
				apiConfig,
				cwd: taskConfig.cwd,
				continuous: options.continuous,
				maxSteps: options.maxSteps ? parseInt(options.maxSteps, 10) : undefined,
				verbose: options.verbose,
			})

			if (result.success) {
				printMessage("Task completed successfully", "success")
				console.log("\n" + result.output + "\n")
			} else {
				printMessage(`Task failed: ${result.error}`, "error")
			}
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

// Tool command
program
	.command("tool <name>")
	.description("Execute a tool")
	.option("-p, --params <json>", "Tool parameters in JSON format")
	.option("-c, --cwd <path>", "Working directory")
	.option("-v, --verbose", "Enable verbose output")
	.option("--provider-file <path>", "Path to provider profiles file")
	.option("--settings-file <path>", "Path to global settings file")
	.option("--modes-file <path>", "Path to custom modes file")
	.action(async (name, options) => {
		try {
			// Parse parameters
			let params = {}
			if (options.params) {
				try {
					params = JSON.parse(options.params)
				} catch (error) {
					printMessage(
						`Error parsing parameters: ${error instanceof Error ? error.message : String(error)}`,
						"error",
					)
					process.exit(1)
				}
			}

			// Load configuration
			const providerProfiles = await readProviderProfiles(options.providerFile)
			const settings = await readGlobalSettings(options.settingsFile)
			const customModes = await getMergedCustomModes(settings, options.modesFile)

			if (!providerProfiles) {
				printMessage("Error: Provider profiles not found", "error")
				process.exit(1)
			}

			if (!settings) {
				printMessage("Error: Global settings not found", "error")
				process.exit(1)
			}

			// Get API configuration
			const currentApiConfigName = providerProfiles.currentApiConfigName
			const apiConfig = providerProfiles.apiConfigs[currentApiConfigName]

			if (!apiConfig) {
				printMessage(`Error: API configuration '${currentApiConfigName}' not found`, "error")
				process.exit(1)
			}

			// Create provider
			const provider = new Provider(apiConfig, settings, customModes)

			// Create tool use object
			const toolUse = {
				name,
				params,
			}

			// Execute tool
			printMessage(`Executing tool: ${name}`, "info")
			const result = await provider.executeTool(toolUse, options.cwd, options.verbose)

			// Print result
			console.log("\n" + result + "\n")
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

// List tools command
program
	.command("tools")
	.description("List available tools")
	.option("-m, --mode <mode>", "Mode to use (e.g., code, ask)", "code")
	.option("-c, --cwd <path>", "Working directory")
	.option("-s, --settings-file <path>", "Path to global settings file")
	.option("-o, --modes-file <path>", "Path to custom modes file")
	.action(async (options) => {
		try {
			// Load configuration
			const settings = await readGlobalSettings(options.settingsFile)
			const customModes = await getMergedCustomModes(settings, options.modesFile)

			if (!settings) {
				printMessage("Error: Global settings not found", "error")
				process.exit(1)
			}

			// Create dummy provider (we only need it for tool descriptions)
			const dummyApiConfig = {
				apiProvider: "anthropic",
				anthropicApiKey: "dummy",
				anthropicModelId: "dummy",
				id: "dummy",
			}

			const provider = new Provider(dummyApiConfig, settings, customModes)
			provider.setCurrentMode(options.mode)

			// Get tool descriptions
			const toolDescriptions = provider.getAvailableToolDescriptions(options.cwd)

			// Print tool list
			printMessage(`Available tools in ${options.mode} mode:`, "info")
			console.log("")

			for (const [name, description] of Object.entries(toolDescriptions)) {
				printMessage(name, "success")
				console.log(description)
				console.log("")
			}
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

// MCP server commands
program
	.command("mcp-start")
	.description("Start the MCP server")
	.option("-p, --port <port>", "Port to listen on", "3000")
	.action(async (options) => {
		try {
			const port = parseInt(options.port, 10)
			const serverManager = new McpServerManager(port)

			printMessage(`Starting MCP server on port ${port}...`, "info")
			const success = await serverManager.start()

			if (success) {
				const status = serverManager.getStatus()
				printMessage(`MCP server started successfully at ${status.url}`, "success")
			} else {
				printMessage("Failed to start MCP server", "error")
				process.exit(1)
			}
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

program
	.command("mcp-stop")
	.description("Stop the MCP server")
	.action(async () => {
		try {
			const serverManager = new McpServerManager()

			printMessage("Stopping MCP server...", "info")
			const success = await serverManager.stop()

			if (success) {
				printMessage("MCP server stopped successfully", "success")
			} else {
				printMessage("Failed to stop MCP server", "error")
				process.exit(1)
			}
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

program
	.command("mcp-restart")
	.description("Restart the MCP server")
	.option("-p, --port <port>", "Port to listen on", "3000")
	.action(async (options) => {
		try {
			const port = parseInt(options.port, 10)
			const serverManager = new McpServerManager(port)

			printMessage(`Restarting MCP server on port ${port}...`, "info")
			const success = await serverManager.restart()

			if (success) {
				const status = serverManager.getStatus()
				printMessage(`MCP server restarted successfully at ${status.url}`, "success")
			} else {
				printMessage("Failed to restart MCP server", "error")
				process.exit(1)
			}
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

program
	.command("mcp-status")
	.description("Check the MCP server status")
	.action(async () => {
		try {
			const serverManager = new McpServerManager()
			const status = serverManager.getStatus()

			if (status.running) {
				printMessage(`MCP server is running at ${status.url}`, "success")
			} else {
				printMessage("MCP server is not running", "info")
			}
		} catch (error) {
			printMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

// Start server command
program
	.command("server")
	.description("Start the Roo server")
	.option("-p, --port <port>", "Port to listen on", "3000")
	.option("-c, --provider-file <path>", "Path to provider profiles file")
	.option("-s, --settings-file <path>", "Path to global settings file")
	.option("-m, --modes-file <path>", "Path to custom modes file")
	.action(async (options) => {
		try {
			const port = parseInt(options.port, 10)

			printMessage(`Starting Roo server on port ${port}...`, "info")

			const server = await createServer(port, options.providerFile, options.settingsFile, options.modesFile)

			await server.start()

			printMessage(`Server is running at http://localhost:${port}`, "success")
			printMessage("Press Ctrl+C to stop the server", "info")

			// Handle graceful shutdown
			process.on("SIGINT", async () => {
				printMessage("Shutting down server...", "info")
				await server.stop()
				printMessage("Server stopped", "success")
				process.exit(0)
			})
		} catch (error) {
			printMessage(`Error starting server: ${error instanceof Error ? error.message : String(error)}`, "error")
			process.exit(1)
		}
	})

/**
 * Load task configuration from file or create from options
 * @param prompt User prompt
 * @param options Command options
 * @returns Task configuration
 */
async function loadTaskConfig(prompt: string, options: CommandOptions): Promise<TaskConfig> {
	// Try to load from file if specified
	if (options.configFile) {
		const config = await readTaskConfig(options.configFile)
		if (config) {
			// Override with command line options if provided
			return {
				...config,
				message: prompt || config.message,
				mode: options.mode || config.mode,
				cwd: options.workspace || config.cwd || process.cwd(),
			}
		}
	}

	// Create new config
	const config: TaskConfig = {
		mode: options.mode || "code",
		message: prompt,
		cwd: options.workspace || process.cwd(),
	}

	// Save config to file if not loaded from file
	if (!options.configFile) {
		await saveTaskConfig(config)
	}

	return config
}

// Parse command line arguments
program.parse()

// If no arguments, show help
if (process.argv.length <= 2) {
	program.help()
}

/**
 * Get API configuration from command line options
 * @param options Command options
 * @returns API configuration or undefined if not provided
 */
function getApiConfigFromOptions(options: CommandOptions): ApiConfig | undefined {
	// Check if any API-specific options are provided
	const hasApiOptions =
		options.apiProvider ||
		options.openaiApiKey ||
		options.openaiBaseUrl ||
		options.openaiModel ||
		options.anthropicApiKey ||
		options.anthropicModel

	if (!hasApiOptions) {
		return undefined
	}

	// Determine API provider
	const apiProvider =
		options.apiProvider || (options.openaiApiKey ? "openai" : options.anthropicApiKey ? "anthropic" : undefined)

	if (!apiProvider) {
		return undefined
	}

	// Create API configuration based on provider
	switch (apiProvider) {
		case "openai":
			return {
				apiProvider: "openai",
				openAiApiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
				openAiBaseUrl: options.openaiBaseUrl || process.env.OPENAI_BASE_URL,
				openAiModelId: options.openaiModel || process.env.OPENAI_MODEL_ID || "gpt-4",
				id: "cli-openai",
			}
		case "anthropic":
			return {
				apiProvider: "anthropic",
				anthropicApiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
				anthropicModelId:
					options.anthropicModel || process.env.ANTHROPIC_MODEL_ID || "claude-3-5-sonnet-20241022",
				id: "cli-anthropic",
			}
		default:
			return undefined
	}
}
