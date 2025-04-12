import { EventEmitter } from "events"
import { ApiConfig, GlobalSettings, CustomMode, TaskResult } from "../types"
import { executeTask } from "./task"
import { executeTool, isToolAvailable, getAllToolDescriptions } from "./tools"
import { ToolUse } from "./tools/types"

/**
 * Provider class that manages task execution and configuration
 */
export class Provider extends EventEmitter {
	private apiConfig: ApiConfig
	private settings: GlobalSettings
	private customModes: CustomMode[]
	private currentMode: string
	private activeTaskId: string | null = null

	constructor(apiConfig: ApiConfig, settings: GlobalSettings, customModes: CustomMode[] = []) {
		super()
		this.apiConfig = apiConfig
		this.settings = settings
		this.customModes = customModes
		this.currentMode = "code" // Default mode
	}

	/**
	 * Get the current API configuration
	 */
	getApiConfig(): ApiConfig {
		return this.apiConfig
	}

	/**
	 * Set the API configuration
	 * @param config New API configuration
	 */
	setApiConfig(config: ApiConfig): void {
		this.apiConfig = config
	}

	/**
	 * Get the current global settings
	 */
	getSettings(): GlobalSettings {
		return this.settings
	}

	/**
	 * Set the global settings
	 * @param settings New global settings
	 */
	setSettings(settings: GlobalSettings): void {
		this.settings = settings
	}

	/**
	 * Get the custom modes
	 */
	getCustomModes(): CustomMode[] {
		return this.customModes
	}

	/**
	 * Set the custom modes
	 * @param modes New custom modes
	 */
	setCustomModes(modes: CustomMode[]): void {
		this.customModes = modes
	}

	/**
	 * Get the current mode
	 */
	getCurrentMode(): string {
		return this.currentMode
	}

	/**
	 * Set the current mode
	 * @param mode New mode
	 */
	setCurrentMode(mode: string): void {
		// Verify the mode exists
		const modeExists = this.customModes.some((m) => m.slug === mode) || mode === "code" || mode === "ask"
		if (!modeExists) {
			throw new Error(`Invalid mode: ${mode}`)
		}
		this.currentMode = mode
	}

	/**
	 * Get a mode by its slug
	 * @param slug Mode slug
	 * @returns Mode or undefined if not found
	 */
	getModeBySlug(slug: string): CustomMode | undefined {
		return this.customModes.find((mode) => mode.slug === slug)
	}

	/**
	 * Execute a task with the given prompt
	 * @param prompt User prompt
	 * @param mode Optional mode to use (defaults to current mode)
	 * @param cwd Optional working directory
	 * @returns Task result
	 */
	async executeTask(prompt: string, mode?: string, cwd?: string): Promise<TaskResult> {
		const taskMode = mode || this.currentMode

		// Emit task started event
		this.emit("taskStarted", { prompt, mode: taskMode })

		const result = await executeTask(
			{
				message: prompt,
				mode: taskMode,
				cwd,
			},
			this.apiConfig,
		)

		// Store the active task ID
		this.activeTaskId = result.taskId

		// Emit task completed event
		this.emit("taskCompleted", result)

		return result
	}

	/**
	 * Get the active task ID
	 */
	getActiveTaskId(): string | null {
		return this.activeTaskId
	}

	/**
	 * 执行工具
	 * @param toolUse 工具使用
	 * @param cwd 工作目录
	 * @param verbose 是否详细输出
	 * @returns 工具执行结果
	 */
	async executeTool(toolUse: ToolUse, cwd?: string, verbose: boolean = false): Promise<string> {
		const { name } = toolUse

		// 检查工具是否可用
		if (!isToolAvailable(name, this.currentMode, this.settings)) {
			return `Error: Tool '${name}' is not available in ${this.currentMode} mode`
		}

		// 执行工具
		return executeTool(toolUse, cwd || process.cwd(), verbose)
	}

	/**
	 * 获取所有可用工具的描述
	 * @param cwd 工作目录
	 * @returns 工具描述
	 */
	getAvailableToolDescriptions(cwd?: string): Record<string, string> {
		return getAllToolDescriptions(this.currentMode, this.settings, cwd || process.cwd())
	}
}
