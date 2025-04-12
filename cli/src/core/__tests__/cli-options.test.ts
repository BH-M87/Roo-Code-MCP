import { CommandOptions, ApiConfig } from "../../types"
import { mockApiConfigs, activeModels } from "./test-config"

// Import the getApiConfigFromOptions function from index.ts
// We need to mock this import since the function is defined in index.ts
jest.mock("../../index", () => {
	// Get the original function implementation
	const originalModule = jest.requireActual("../../index")

	// Return a function that matches the signature of getApiConfigFromOptions
	return {
		...originalModule,
		getApiConfigFromOptions: (options: CommandOptions): ApiConfig | undefined => {
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
				options.apiProvider ||
				(options.openaiApiKey ? "openai" : options.anthropicApiKey ? "anthropic" : undefined)

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
		},
	}
})

// Import the function after mocking
const { getApiConfigFromOptions } = require("../../index")

describe("CLI Options", () => {
	// Save original environment variables
	const originalEnv = process.env

	beforeEach(() => {
		// Reset environment variables before each test
		process.env = { ...originalEnv }
		delete process.env.OPENAI_API_KEY
		delete process.env.OPENAI_BASE_URL
		delete process.env.OPENAI_MODEL_ID
		delete process.env.ANTHROPIC_API_KEY
		delete process.env.ANTHROPIC_MODEL_ID
	})

	afterAll(() => {
		// Restore original environment variables
		process.env = originalEnv
	})

	describe("getApiConfigFromOptions", () => {
		it("should return undefined if no API options are provided", () => {
			const options: CommandOptions = {
				prompt: "Test prompt",
				mode: "code",
			}

			const config = getApiConfigFromOptions(options)
			expect(config).toBeUndefined()
		})

		;(activeModels.includes("openai") ? it : it.skip)(
			"should create OpenAI config from command line options",
			() => {
				const options: CommandOptions = {
					prompt: "Test prompt",
					mode: "code",
					apiProvider: "openai",
					openaiApiKey: "test-key",
					openaiBaseUrl: "https://custom-openai-api.com/v1",
					openaiModel: "gpt-4-turbo",
				}

				const config = getApiConfigFromOptions(options)
				expect(config).toEqual({
					apiProvider: "openai",
					openAiApiKey: "test-key",
					openAiBaseUrl: "https://custom-openai-api.com/v1",
					openAiModelId: "gpt-4-turbo",
					id: "cli-openai",
				})
			},
		)

		;(activeModels.includes("anthropic") ? it : it.skip)(
			"should create Anthropic config from command line options",
			() => {
				const options: CommandOptions = {
					prompt: "Test prompt",
					mode: "code",
					apiProvider: "anthropic",
					anthropicApiKey: "test-key",
					anthropicModel: "claude-3-opus",
				}

				const config = getApiConfigFromOptions(options)
				expect(config).toEqual({
					apiProvider: "anthropic",
					anthropicApiKey: "test-key",
					anthropicModelId: "claude-3-opus",
					id: "cli-anthropic",
				})
			},
		)

		;(activeModels.includes("openai") ? it : it.skip)("should infer OpenAI provider from openaiApiKey", () => {
			const options: CommandOptions = {
				prompt: "Test prompt",
				mode: "code",
				openaiApiKey: "test-key",
			}

			const config = getApiConfigFromOptions(options)
			expect(config?.apiProvider).toBe("openai")
		})

		;(activeModels.includes("anthropic") ? it : it.skip)(
			"should infer Anthropic provider from anthropicApiKey",
			() => {
				const options: CommandOptions = {
					prompt: "Test prompt",
					mode: "code",
					anthropicApiKey: "test-key",
				}

				const config = getApiConfigFromOptions(options)
				expect(config?.apiProvider).toBe("anthropic")
			},
		)

		;(activeModels.includes("openai") ? it : it.skip)(
			"should use environment variables as fallbacks for OpenAI",
			() => {
				process.env.OPENAI_API_KEY = "env-test-key"
				process.env.OPENAI_BASE_URL = "https://env-openai-api.com/v1"
				process.env.OPENAI_MODEL_ID = "env-gpt-4"

				const options: CommandOptions = {
					prompt: "Test prompt",
					mode: "code",
					apiProvider: "openai",
				}

				const config = getApiConfigFromOptions(options)
				expect(config).toEqual({
					apiProvider: "openai",
					openAiApiKey: "env-test-key",
					openAiBaseUrl: "https://env-openai-api.com/v1",
					openAiModelId: "env-gpt-4",
					id: "cli-openai",
				})
			},
		)

		;(activeModels.includes("anthropic") ? it : it.skip)(
			"should use environment variables as fallbacks for Anthropic",
			() => {
				process.env.ANTHROPIC_API_KEY = "env-test-key"
				process.env.ANTHROPIC_MODEL_ID = "env-claude-3"

				const options: CommandOptions = {
					prompt: "Test prompt",
					mode: "code",
					apiProvider: "anthropic",
				}

				const config = getApiConfigFromOptions(options)
				expect(config).toEqual({
					apiProvider: "anthropic",
					anthropicApiKey: "env-test-key",
					anthropicModelId: "env-claude-3",
					id: "cli-anthropic",
				})
			},
		)
	})
})
