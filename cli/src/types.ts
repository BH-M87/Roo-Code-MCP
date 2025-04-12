// Common types used across the CLI application

export interface TaskConfig {
	mode: string
	message: string
	cwd?: string
}

export interface ProviderProfile {
	currentApiConfigName: string
	apiConfigs: Record<string, ApiConfig>
	migrations?: Record<string, boolean>
}

export interface ApiConfig {
	apiProvider: string
	openAiBaseUrl?: string
	openAiApiKey?: string
	openAiModelId?: string
	openAiCustomModelInfo?: {
		maxTokens: number
		contextWindow: number
		supportsImages: boolean
		supportsPromptCache: boolean
		inputPrice: number
		outputPrice: number
	}
	anthropicApiKey?: string
	anthropicModelId?: string
	id?: string
}

export interface GlobalSettings {
	lastShownAnnouncementId?: string
	autoApprovalEnabled?: boolean
	alwaysAllowReadOnly?: boolean
	alwaysAllowReadOnlyOutsideWorkspace?: boolean
	alwaysAllowWrite?: boolean
	alwaysAllowWriteOutsideWorkspace?: boolean
	alwaysAllowBrowser?: boolean
	alwaysApproveResubmit?: boolean
	alwaysAllowMcp?: boolean
	alwaysAllowModeSwitch?: boolean
	alwaysAllowSubtasks?: boolean
	alwaysAllowExecute?: boolean
	allowedCommands?: string[]
	browserToolEnabled?: boolean
	ttsEnabled?: boolean
	ttsSpeed?: number
	soundEnabled?: boolean
	soundVolume?: number
	language?: string
	telemetrySetting?: string
	customModes?: CustomMode[]
}

export interface CustomMode {
	slug: string
	name: string
	roleDefinition: string
	customInstructions?: string
	groups: (string | [string, { fileRegex: string; description: string }])[]
	source: string
}

export interface TaskResult {
	taskId: string
	output: string
	success: boolean
	error?: string
}

export interface ApiResponse {
	text: string
	usage?: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	toolCalls?: ToolCall[]
}

export interface ToolCall {
	name: string
	params: Record<string, string>
}

export interface CommandOptions {
	prompt?: string
	mode?: string
	workspace?: string
	configFile?: string
	providerFile?: string
	settingsFile?: string
	modesFile?: string
	verbose?: boolean
	continuous?: boolean
	maxSteps?: string
	apiProvider?: string
	openaiApiKey?: string
	openaiBaseUrl?: string
	openaiModel?: string
	anthropicApiKey?: string
	anthropicModel?: string
}
