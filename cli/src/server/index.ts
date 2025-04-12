import express from "express"
import { Provider } from "../core/provider"
import { TaskConfig, ApiConfig, GlobalSettings, CustomMode, TaskResult } from "../types"
import { readProviderProfiles, readGlobalSettings, getMergedCustomModes } from "../config/settings"

/**
 * Server class that manages the Express server
 */
export class Server {
	private app: express.Application
	private provider: Provider
	private port: number
	private server: any

	constructor(provider: Provider, port: number = 3000) {
		this.app = express()
		this.provider = provider
		this.port = port

		// Configure Express
		this.app.use(express.json())

		// Set up routes
		this.setupRoutes()
	}

	/**
	 * Set up the server routes
	 */
	private setupRoutes(): void {
		// Health check endpoint
		this.app.get("/health", (req, res) => {
			res.status(200).json({ status: "ok" })
		})

		// Execute a task
		this.app.post("/api/task", async (req, res) => {
			try {
				const { prompt, mode, cwd } = req.body

				if (!prompt) {
					return res.status(400).json({ error: "Prompt is required" })
				}

				const result = await this.provider.executeTask(prompt, mode, cwd)
				res.status(200).json(result)
			} catch (error) {
				console.error("Error executing task:", error)
				res.status(500).json({
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		})

		// Get current configuration
		this.app.get("/api/config", (req, res) => {
			res.status(200).json({
				apiConfig: this.provider.getApiConfig(),
				settings: this.provider.getSettings(),
				customModes: this.provider.getCustomModes(),
				currentMode: this.provider.getCurrentMode(),
			})
		})

		// Update API configuration
		this.app.post("/api/config/api", (req, res) => {
			try {
				const config = req.body

				// Validate required fields based on provider
				if (config.apiProvider === "openai" && !config.openAiApiKey) {
					return res.status(400).json({ error: "OpenAI API key is required" })
				}

				if (config.apiProvider === "anthropic" && !config.anthropicApiKey) {
					return res.status(400).json({ error: "Anthropic API key is required" })
				}

				this.provider.setApiConfig(config)
				res.status(200).json({ success: true })
			} catch (error) {
				res.status(500).json({
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		})

		// Update global settings
		this.app.post("/api/config/settings", (req, res) => {
			try {
				const settings = req.body
				this.provider.setSettings(settings)
				res.status(200).json({ success: true })
			} catch (error) {
				res.status(500).json({
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		})

		// Update custom modes
		this.app.post("/api/config/modes", (req, res) => {
			try {
				const modes = req.body
				this.provider.setCustomModes(modes)
				res.status(200).json({ success: true })
			} catch (error) {
				res.status(500).json({
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		})

		// Set current mode
		this.app.post("/api/config/mode", (req, res) => {
			try {
				const { mode } = req.body
				this.provider.setCurrentMode(mode)
				res.status(200).json({ success: true })
			} catch (error) {
				res.status(500).json({
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		})
	}

	/**
	 * Start the server
	 * @returns Promise that resolves when the server is started
	 */
	start(): Promise<void> {
		return new Promise((resolve) => {
			this.server = this.app.listen(this.port, () => {
				console.log(`Server running on http://localhost:${this.port}`)
				resolve()
			})
		})
	}

	/**
	 * Stop the server
	 * @returns Promise that resolves when the server is stopped
	 */
	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.server) {
				this.server.close((err: Error) => {
					if (err) {
						reject(err)
					} else {
						resolve()
					}
				})
			} else {
				resolve()
			}
		})
	}
}

/**
 * Create a server with default configuration
 * @param port Server port
 * @param providerFile Path to provider profiles file
 * @param settingsFile Path to global settings file
 * @param modesFile Path to custom modes file
 * @returns Server instance
 */
export async function createServer(
	port: number = 3000,
	providerFile?: string,
	settingsFile?: string,
	modesFile?: string,
): Promise<Server> {
	// Load configuration
	const providerProfiles = await readProviderProfiles(providerFile)
	const settings = await readGlobalSettings(settingsFile)
	const customModes = await getMergedCustomModes(settings, modesFile)

	if (!providerProfiles) {
		throw new Error("Provider profiles not found")
	}

	if (!settings) {
		throw new Error("Global settings not found")
	}

	// Get current API configuration
	const currentApiConfigName = providerProfiles.currentApiConfigName
	const apiConfig = providerProfiles.apiConfigs[currentApiConfigName]

	if (!apiConfig) {
		throw new Error(`API configuration '${currentApiConfigName}' not found`)
	}

	// Create provider
	const provider = new Provider(apiConfig, settings, customModes)

	// Create server
	return new Server(provider, port)
}
