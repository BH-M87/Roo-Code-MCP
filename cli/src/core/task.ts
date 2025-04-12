import { v4 as uuidv4 } from "uuid"
import { TaskConfig, TaskResult, ApiConfig, ToolCall } from "../types"
import { createApiHandler } from "../api"
import { getCurrentWorkingDirectory } from "../config/settings"
import { generateSystemPrompt } from "./prompts/system"
import { ToolExecutor } from "./tool-executor"
import { ContinuousExecutor } from "./continuous-executor"

/**
 * 工具响应类型
 */
export type ToolResponse = string | { text: string; images?: string[] }

/**
 * Handle a new task
 * @param params Task parameters
 * @returns Task result
 */
export async function handleNewTask(params: {
	prompt: string
	mode: string
	apiConfig: ApiConfig
	cwd?: string
	continuous?: boolean
	maxSteps?: number
	verbose?: boolean
}): Promise<TaskResult> {
	const { prompt, mode, apiConfig, cwd, continuous = false, maxSteps = 10, verbose = false } = params
	const taskId = uuidv4()
	const workingDir = getCurrentWorkingDirectory(cwd)

	console.log(`Starting new task (${taskId}) in ${mode} mode`)
	console.log(`Working directory: ${workingDir}`)
	console.log(`Prompt: ${prompt}`)
	console.log(`Continuous mode: ${continuous ? "enabled" : "disabled"}`)

	try {
		// 检查是否使用连续执行模式
		if (continuous) {
			// 创建连续执行器
			const executor = new ContinuousExecutor(apiConfig, mode, workingDir, maxSteps, verbose)

			// 执行任务
			return await executor.execute(prompt)
		} else {
			// 单步执行模式
			// Create API handler
			const apiHandler = createApiHandler(apiConfig)

			// 生成系统提示
			const systemPrompt = generateSystemPrompt(workingDir, mode)

			// 创建工具执行器
			const toolExecutor = new ToolExecutor(workingDir, verbose)

			// 发送请求到 API
			console.log(`Sending request to ${apiConfig.apiProvider} API...`)
			const response = await apiHandler.sendRequest(prompt, systemPrompt)

			// 检查是否有工具调用
			if (response.toolCalls && response.toolCalls.length > 0) {
				console.log(`Found ${response.toolCalls.length} tool call(s)`)

				// 执行工具调用
				const toolCall = response.toolCalls[0] // 只处理第一个工具调用
				console.log(`Executing tool: ${toolCall.name}`)

				const toolResult = await toolExecutor.execute(toolCall)
				console.log(`Tool execution completed`)

				// 构建带工具结果的输出
				const output = `${response.text}\n\nTool Result:\n${toolResult}`

				return {
					taskId,
					output,
					success: true,
				}
			} else {
				// 没有工具调用，直接返回文本
				return {
					taskId,
					output: response.text,
					success: true,
				}
			}
		}
	} catch (error) {
		console.error("Error executing task:", error)
		return {
			taskId,
			output: "",
			success: false,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

/**
 * Execute a task with the given configuration
 * @param config Task configuration
 * @param apiConfig API configuration
 * @param options Additional options
 * @returns Task result
 */
export async function executeTask(
	config: TaskConfig,
	apiConfig: ApiConfig,
	options?: {
		continuous?: boolean
		maxSteps?: number
		verbose?: boolean
	},
): Promise<TaskResult> {
	return handleNewTask({
		prompt: config.message,
		mode: config.mode,
		apiConfig,
		cwd: config.cwd,
		continuous: options?.continuous,
		maxSteps: options?.maxSteps,
		verbose: options?.verbose,
	})
}
