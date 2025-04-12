/**
 * 工具管理器
 */

import { GlobalSettings } from "../../types"
import { ToolHandler, ToolRegistry, ToolUse, TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from "./types"
import { readFileTool, writeToFileTool, listFilesTool, executeCommandTool, searchFilesTool } from "./simplified"
import { browserActionTool } from "./browserActionTool"
import { listCodeDefinitionsTool } from "./listCodeDefinitionsTool"
import { switchModeTool } from "./switchModeTool"
import { newTaskTool } from "./newTaskTool"
import { diffFilesTool } from "./diffFilesTool"
import { insertContentTool } from "./insertContentTool"
import { useMcpTool, accessMcpResource } from "./mcpTool"
// 工具描述函数
const getReadFileDescription = (args: any) => `## read_file\nDescription: Read the contents of a file.`
const getWriteToFileDescription = (args: any) => `## write_to_file\nDescription: Write content to a file.`
const getListFilesDescription = (args: any) => `## list_files\nDescription: List files in a directory.`
const getExecuteCommandDescription = (args: any) =>
	`## execute_command\nDescription: Execute a command in the terminal.`
const getSearchFilesDescription = (args: any) =>
	`## search_files\nDescription: Search for files containing a specific pattern.`

/**
 * 工具注册表
 */
export const toolRegistry: ToolRegistry = {
	read_file: {
		handler: readFileTool,
		description: getReadFileDescription,
	},
	write_to_file: {
		handler: writeToFileTool,
		description: getWriteToFileDescription,
	},
	list_files: {
		handler: listFilesTool,
		description: getListFilesDescription,
	},
	execute_command: {
		handler: executeCommandTool,
		description: getExecuteCommandDescription,
	},
	search_files: {
		handler: searchFilesTool,
		description: getSearchFilesDescription,
	},
	browser_action: {
		handler: browserActionTool,
		description: (args) => `## browser_action\nDescription: Perform browser actions.`,
	},
	list_code_definition_names: {
		handler: listCodeDefinitionsTool,
		description: (args) => `## list_code_definition_names\nDescription: List code definitions in a directory.`,
	},
	switch_mode: {
		handler: switchModeTool,
		description: (args) => `## switch_mode\nDescription: Switch to a different mode.`,
	},
	new_task: {
		handler: newTaskTool,
		description: (args) => `## new_task\nDescription: Create a new task.`,
	},
	diff_files: {
		handler: diffFilesTool,
		description: (args) => `## diff_files\nDescription: Compare two files and show differences.`,
	},
	insert_content: {
		handler: insertContentTool,
		description: (args) => `## insert_content\nDescription: Insert content into a file at a specific position.`,
	},
	use_mcp_tool: {
		handler: useMcpTool,
		description: (args) => `## use_mcp_tool\nDescription: Use a tool provided by the MCP server.`,
	},
	access_mcp_resource: {
		handler: accessMcpResource,
		description: (args) => `## access_mcp_resource\nDescription: Access a resource from the MCP server.`,
	},
}

/**
 * 检查工具是否可用
 * @param toolName 工具名称
 * @param mode 当前模式
 * @param settings 全局设置
 * @returns 是否可用
 */
export function isToolAvailable(toolName: string, mode: string, settings: GlobalSettings): boolean {
	// 始终可用的工具
	if (ALWAYS_AVAILABLE_TOOLS.includes(toolName)) {
		return true
	}

	// 检查工具是否在注册表中
	if (!toolRegistry[toolName]) {
		return false
	}

	// 检查自定义模式的工具权限
	const customMode = settings.customModes?.find((m) => m.slug === mode)
	if (customMode) {
		// 检查工具组权限
		for (const group of customMode.groups) {
			if (typeof group === "string") {
				// 如果是字符串，直接检查工具组
				const toolGroup = TOOL_GROUPS[group as keyof typeof TOOL_GROUPS]
				if (toolGroup && toolGroup.tools.includes(toolName)) {
					return true
				}
			} else if (Array.isArray(group) && group.length === 2) {
				// 如果是数组，检查工具组和正则表达式
				const [groupName, _] = group
				const toolGroup = TOOL_GROUPS[groupName as keyof typeof TOOL_GROUPS]
				if (toolGroup && toolGroup.tools.includes(toolName)) {
					return true
				}
			}
		}
		return false
	}

	// 默认模式 (code, ask) 允许所有工具
	return true
}

/**
 * 执行工具
 * @param toolUse 工具使用
 * @param cwd 当前工作目录
 * @param verbose 是否详细输出
 * @returns 工具执行结果
 */
export async function executeTool(toolUse: ToolUse, cwd: string, verbose: boolean = false): Promise<string> {
	const { name } = toolUse

	// 检查工具是否存在
	if (!toolRegistry[name]) {
		return `Error: Tool '${name}' not found`
	}

	try {
		// 获取工具处理函数
		const handler = toolRegistry[name].handler

		// 执行工具
		if (verbose) {
			console.log(`Executing tool: ${name}`)
			console.log(`Parameters:`, toolUse.params)
		}

		const result = await handler({ toolUse, cwd, verbose })

		if (verbose) {
			console.log(`Tool execution completed`)
		}

		// 返回结果
		if (typeof result === "string") {
			return result
		} else {
			return result.text
		}
	} catch (error) {
		console.error(`Error executing tool ${name}:`, error)
		return `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
	}
}

/**
 * 获取工具描述
 * @param toolName 工具名称
 * @param cwd 当前工作目录
 * @returns 工具描述
 */
export function getToolDescription(toolName: string, cwd: string): string {
	if (!toolRegistry[toolName]) {
		return ""
	}

	return toolRegistry[toolName].description({
		cwd,
		supportsComputerUse: false,
		browserViewportSize: "900x600",
	})
}

/**
 * 获取所有可用工具的描述
 * @param mode 当前模式
 * @param settings 全局设置
 * @param cwd 当前工作目录
 * @returns 工具描述列表
 */
export function getAllToolDescriptions(mode: string, settings: GlobalSettings, cwd: string): Record<string, string> {
	const descriptions: Record<string, string> = {}

	for (const toolName in toolRegistry) {
		if (isToolAvailable(toolName, mode, settings)) {
			descriptions[toolName] = getToolDescription(toolName, cwd)
		}
	}

	return descriptions
}
