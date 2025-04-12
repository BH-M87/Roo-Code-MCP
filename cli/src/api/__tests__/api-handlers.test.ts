import axios from "axios"
import { AnthropicHandler, OpenAiHandler, createApiHandler } from "../index"
import { mockApiConfigs, mockApiResponses, activeModels } from "../../core/__tests__/test-config"

// Mock axios
jest.mock("axios")
const mockAxios = axios as jest.Mocked<typeof axios>

// Mock Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => {
	return {
		default: jest.fn().mockImplementation(() => ({
			messages: {
				create: jest.fn().mockResolvedValue({
					content: [{ text: mockApiResponses.anthropic.text }],
					usage: {
						input_tokens: mockApiResponses.anthropic.usage?.promptTokens,
						output_tokens: mockApiResponses.anthropic.usage?.completionTokens,
					},
				}),
			},
		})),
	}
})

describe("API Handlers", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	;(activeModels.includes("anthropic") ? describe : describe.skip)("AnthropicHandler", () => {
		it("should initialize with the correct configuration", () => {
			const handler = new AnthropicHandler(mockApiConfigs.anthropic)
			expect(handler.getModel()).toEqual({
				id: mockApiConfigs.anthropic.anthropicModelId,
				provider: "anthropic",
			})
		})

		it("should send a request and return the response", async () => {
			const handler = new AnthropicHandler(mockApiConfigs.anthropic)
			const response = await handler.sendRequest("Test prompt")

			expect(response).toEqual(mockApiResponses.anthropic)
		})

		it("should throw an error if API key is missing", () => {
			expect(() => {
				new AnthropicHandler({ apiProvider: "anthropic" })
			}).toThrow("Anthropic API key is required")
		})
	})

	;(activeModels.includes("openai") ? describe : describe.skip)("OpenAiHandler", () => {
		beforeEach(() => {
			mockAxios.post.mockResolvedValue({
				data: {
					choices: [{ message: { content: mockApiResponses.openai.text } }],
					usage: {
						prompt_tokens: mockApiResponses.openai.usage?.promptTokens,
						completion_tokens: mockApiResponses.openai.usage?.completionTokens,
						total_tokens: mockApiResponses.openai.usage?.totalTokens,
					},
				},
			})
		})

		it("should initialize with the correct configuration", () => {
			const handler = new OpenAiHandler(mockApiConfigs.openai)
			expect(handler.getModel()).toEqual({
				id: mockApiConfigs.openai.openAiModelId,
				provider: "openai",
			})
		})

		it("should send a request and return the response", async () => {
			const handler = new OpenAiHandler(mockApiConfigs.openai)
			const response = await handler.sendRequest("Test prompt")

			expect(response).toEqual(mockApiResponses.openai)
			expect(mockAxios.post).toHaveBeenCalledWith(
				`${mockApiConfigs.openai.openAiBaseUrl}/chat/completions`,
				expect.objectContaining({
					model: mockApiConfigs.openai.openAiModelId,
					messages: [{ role: "user", content: "Test prompt" }],
				}),
				expect.objectContaining({
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${mockApiConfigs.openai.openAiApiKey}`,
					},
				}),
			)
		})

		it("should use the default base URL if not provided", async () => {
			const configWithoutBaseUrl = {
				...mockApiConfigs.openai,
				openAiBaseUrl: undefined,
			}

			const handler = new OpenAiHandler(configWithoutBaseUrl)
			await handler.sendRequest("Test prompt")

			expect(mockAxios.post).toHaveBeenCalledWith(
				"https://api.openai.com/v1/chat/completions",
				expect.any(Object),
				expect.any(Object),
			)
		})

		it("should throw an error if API key is missing", () => {
			expect(() => {
				new OpenAiHandler({ apiProvider: "openai" })
			}).toThrow("OpenAI API key is required")
		})
	})

	describe("createApiHandler", () => {
		;(activeModels.includes("anthropic") ? it : it.skip)(
			"should create an AnthropicHandler for anthropic provider",
			() => {
				const handler = createApiHandler(mockApiConfigs.anthropic)
				expect(handler).toBeInstanceOf(AnthropicHandler)
			},
		)

		;(activeModels.includes("openai") ? it : it.skip)("should create an OpenAiHandler for openai provider", () => {
			const handler = createApiHandler(mockApiConfigs.openai)
			expect(handler).toBeInstanceOf(OpenAiHandler)
		})

		it("should throw an error for unsupported provider", () => {
			expect(() => {
				createApiHandler({ apiProvider: "unsupported" })
			}).toThrow("Unsupported API provider: unsupported")
		})
	})
})
