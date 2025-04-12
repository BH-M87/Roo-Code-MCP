import { ApiConfig, ApiResponse, ToolCall } from "../types"
import Anthropic from "@anthropic-ai/sdk"
import { TextBlock } from "@anthropic-ai/sdk/resources/index.mjs"
import axios from "axios"
import { parseAssistantMessage } from "../core/assistant-message"
import { Message, MessageRole } from "../core/session"

/**
 * Base class for API handlers
 */
export abstract class ApiHandler {
	protected config: ApiConfig

	constructor(config: ApiConfig) {
		this.config = config
	}

	/**
	 * Get information about the model
	 */
	abstract getModel(): { id: string; provider: string }

	/**
	 * Send a request to the API
	 * @param prompt The prompt to send
	 * @param systemPrompt Optional system prompt
	 * @param messages Optional message history
	 */
	abstract sendRequest(prompt: string, systemPrompt?: string, messages?: Message[]): Promise<ApiResponse>
}

/**
 * Anthropic API handler
 */
export class AnthropicHandler extends ApiHandler {
	private client: Anthropic

	constructor(config: ApiConfig) {
		super(config)
		if (!config.anthropicApiKey) {
			throw new Error("Anthropic API key is required")
		}
		this.client = new Anthropic({
			apiKey: config.anthropicApiKey,
		})
	}

	getModel() {
		return {
			id: this.config.anthropicModelId || "claude-3-5-sonnet-20241022",
			provider: "anthropic",
		}
	}

	async sendRequest(prompt: string, systemPrompt?: string, messages?: Message[]): Promise<ApiResponse> {
		try {
			// 准备请求参数
			const params: any = {
				model: this.getModel().id,
				max_tokens: 4000,
				messages: [],
			}

			// 添加历史消息
			if (messages && messages.length > 0) {
				// 过滤掉系统消息，因为我们会单独设置
				const filteredMessages = messages.filter((msg) => msg.role !== MessageRole.SYSTEM)

				// 将消息转换为 Anthropic 格式
				for (const msg of filteredMessages) {
					let role: "user" | "assistant"

					switch (msg.role) {
						case MessageRole.USER:
							role = "user"
							break
						case MessageRole.ASSISTANT:
							role = "assistant"
							break
						case MessageRole.TOOL:
							// 工具消息作为用户消息发送
							role = "user"
							break
						default:
							continue // 跳过其他类型的消息
					}

					params.messages.push({
						role,
						content: msg.content,
					})
				}
			}

			// 如果没有历史消息或最后一条不是用户消息，添加当前用户消息
			if (params.messages.length === 0 || params.messages[params.messages.length - 1].role !== "user") {
				params.messages.push({
					role: "user",
					content: prompt,
				})
			}

			// 添加系统提示
			if (systemPrompt) {
				params.system = systemPrompt
			}

			const response = await this.client.messages.create(params)

			// 获取文本内容
			const text = (response.content[0] as TextBlock)?.text || ""

			// 解析工具调用
			const toolCalls: ToolCall[] = []
			const parsedContent = parseAssistantMessage(text)

			for (const content of parsedContent) {
				if (content.type === "tool_use" && !content.partial) {
					toolCalls.push({
						name: content.name,
						params: content.params as Record<string, string>,
					})
				}
			}

			return {
				text,
				usage: {
					promptTokens: response.usage.input_tokens,
					completionTokens: response.usage.output_tokens,
					totalTokens: response.usage.input_tokens + response.usage.output_tokens,
				},
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			}
		} catch (error) {
			console.error("Error calling Anthropic API:", error)
			throw error
		}
	}
}

/**
 * OpenAI API handler
 */
export class OpenAiHandler extends ApiHandler {
	private baseUrl: string

	constructor(config: ApiConfig) {
		super(config)
		if (!config.openAiApiKey) {
			throw new Error("OpenAI API key is required")
		}
		this.baseUrl = config.openAiBaseUrl || "https://api.openai.com/v1"
		console.log(`OpenAI API configured with base URL: ${this.baseUrl}`)
	}

	getModel() {
		return {
			id: this.config.openAiModelId || "gpt-4",
			provider: "openai",
		}
	}

	async sendRequest(prompt: string, systemPrompt?: string, messages?: Message[]): Promise<ApiResponse> {
		try {
			const modelId = this.getModel().id
			const maxTokens = this.config.openAiCustomModelInfo?.maxTokens || 4000

			console.log(`Sending request to OpenAI API (${this.baseUrl})`)
			console.log(`Using model: ${modelId}`)

			// 准备消息
			const apiMessages = []

			// 添加系统提示
			if (systemPrompt) {
				apiMessages.push({
					role: "system",
					content: systemPrompt,
				})
			}

			// 添加历史消息
			if (messages && messages.length > 0) {
				// 过滤掉系统消息，因为我们会单独设置
				const filteredMessages = messages.filter((msg) => msg.role !== MessageRole.SYSTEM)

				// 将消息转换为 OpenAI 格式
				for (const msg of filteredMessages) {
					let role: "user" | "assistant" | "system"

					switch (msg.role) {
						case MessageRole.USER:
							role = "user"
							break
						case MessageRole.ASSISTANT:
							role = "assistant"
							break
						case MessageRole.TOOL:
							// 工具消息作为用户消息发送
							role = "user"
							break
						default:
							continue // 跳过其他类型的消息
					}

					apiMessages.push({
						role,
						content: msg.content,
					})
				}
			}

			// 如果没有历史消息或最后一条不是用户消息，添加当前用户消息
			if (apiMessages.length === 0 || apiMessages[apiMessages.length - 1].role !== "user") {
				apiMessages.push({
					role: "user",
					content: prompt,
				})
			}

			const response = await axios.post(
				`${this.baseUrl}/chat/completions`,
				{
					model: modelId,
					messages: apiMessages,
					max_tokens: maxTokens > 0 ? maxTokens : undefined,
				},
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.config.openAiApiKey}`,
					},
				},
			)

			// 获取文本内容
			const text = response.data.choices[0].message.content || ""

			// 解析工具调用
			const toolCalls: ToolCall[] = []
			const parsedContent = parseAssistantMessage(text)

			for (const content of parsedContent) {
				if (content.type === "tool_use" && !content.partial) {
					toolCalls.push({
						name: content.name,
						params: content.params as Record<string, string>,
					})
				}
			}

			return {
				text,
				usage: {
					promptTokens: response.data.usage.prompt_tokens,
					completionTokens: response.data.usage.completion_tokens,
					totalTokens: response.data.usage.total_tokens,
				},
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			}
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				console.error(`OpenAI API error (${error.response.status}):`, error.response.data)
			} else {
				console.error("Error calling OpenAI API:", error)
			}
			throw error
		}
	}
}

/**
 * Factory function to create an API handler based on configuration
 * @param config API configuration
 * @returns API handler instance
 */
export function createApiHandler(config: ApiConfig): ApiHandler {
	switch (config.apiProvider) {
		case "anthropic":
			return new AnthropicHandler(config)
		case "openai":
			return new OpenAiHandler(config)
		default:
			throw new Error(`Unsupported API provider: ${config.apiProvider}`)
	}
}
