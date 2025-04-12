/**
 * Common test configurations
 */

import { ApiConfig } from "../../types"

/**
 * Control which API models are active for testing
 * This allows selectively enabling/disabling tests for specific providers
 */
export const activeModels: Array<"anthropic" | "openai"> = ["openai"]

/**
 * Mock API configurations for testing
 */
export const mockApiConfigs = {
	// Anthropic API configuration
	anthropic: {
		apiProvider: "anthropic",
		anthropicApiKey: "test-key",
		anthropicModelId: "test-model",
		id: "test-anthropic",
	} as ApiConfig,

	// OpenAI API configuration
	openai: {
		apiProvider: "openai",
		openAiApiKey: "",
		openAiBaseUrl: "",
		openAiModelId: "deepseek-v3",
		id: "test-openai",
	} as ApiConfig,
}

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
	// Anthropic API response
	anthropic: {
		text: "This is a test response from Anthropic",
		usage: {
			promptTokens: 10,
			completionTokens: 20,
			totalTokens: 30,
		},
	},

	// OpenAI API response
	openai: {
		text: "This is a test response from OpenAI",
		usage: {
			promptTokens: 15,
			completionTokens: 25,
			totalTokens: 40,
		},
	},
}

/**
 * Mock model information for testing
 */
export const mockModelInfo = {
	// Anthropic model info
	anthropic: {
		id: "test-model",
		provider: "anthropic",
	},

	// OpenAI model info
	openai: {
		id: "test-model",
		provider: "openai",
	},
}
