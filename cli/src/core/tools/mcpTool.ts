import { ToolHandler } from "./types"
import axios from "axios"

// MCP 服务器配置
let mcpServerUrl: string | null = null

/**
 * 设置 MCP 服务器 URL
 * @param url MCP 服务器 URL
 */
export function setMcpServerUrl(url: string | null): void {
	mcpServerUrl = url
}

/**
 * 获取 MCP 服务器 URL
 * @returns MCP 服务器 URL
 */
export function getMcpServerUrl(): string | null {
	return mcpServerUrl
}

/**
 * 使用 MCP 工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const useMcpTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
	const { params } = toolUse
	const toolName = params.tool
	const toolParams = params.params

	if (!toolName) {
		return 'Error: Missing required parameter "tool"'
	}

	if (!mcpServerUrl) {
		return "Error: MCP server URL not set. Please start the MCP server first."
	}

	try {
		if (verbose) {
			console.log(`Using MCP tool: ${toolName}`)
			console.log(`Parameters:`, toolParams)
		}

		// 调用 MCP 工具
		const response = await axios.post(`${mcpServerUrl}/tools/${toolName}`, {
			params: toolParams ? JSON.parse(toolParams) : {},
		})

		return `MCP tool ${toolName} executed successfully.\n\nResult:\n${JSON.stringify(response.data, null, 2)}`
	} catch (error) {
		console.error(`Error using MCP tool ${toolName}:`, error)

		if (axios.isAxiosError(error) && error.response) {
			return `Error using MCP tool ${toolName}: ${error.response.data.error || error.message}`
		}

		return `Error using MCP tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`
	}
}

/**
 * 访问 MCP 资源
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const accessMcpResource: ToolHandler = async ({ toolUse, cwd, verbose }) => {
	const { params } = toolUse
	const resourcePath = params.path

	if (!resourcePath) {
		return 'Error: Missing required parameter "path"'
	}

	if (!mcpServerUrl) {
		return "Error: MCP server URL not set. Please start the MCP server first."
	}

	try {
		if (verbose) {
			console.log(`Accessing MCP resource: ${resourcePath}`)
		}

		// 访问 MCP 资源
		const response = await axios.get(`${mcpServerUrl}/resources/${resourcePath}`)

		return `MCP resource ${resourcePath} accessed successfully.\n\nResult:\n${JSON.stringify(response.data, null, 2)}`
	} catch (error) {
		console.error(`Error accessing MCP resource ${resourcePath}:`, error)

		if (axios.isAxiosError(error) && error.response) {
			return `Error accessing MCP resource ${resourcePath}: ${error.response.data.error || error.message}`
		}

		return `Error accessing MCP resource ${resourcePath}: ${error instanceof Error ? error.message : String(error)}`
	}
}
