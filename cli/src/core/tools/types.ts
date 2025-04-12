/**
 * CLI 工具类型定义
 */

import { ToolResponse } from "../task"

export { ToolResponse }

/**
 * 工具组类型
 */
export type ToolGroup = "read" | "edit" | "browser" | "command" | "mcp" | "modes"

/**
 * 工具组配置
 */
export interface ToolGroupConfig {
	tools: string[]
	alwaysAvailable?: boolean
}

/**
 * 工具参数名称
 */
export type ToolParamName =
	| "path"
	| "start_line"
	| "end_line"
	| "content"
	| "command"
	| "cwd"
	| "regex"
	| "file_pattern"
	| "action"
	| "url"
	| "coordinate"
	| "text"
	| "size"
	| "task"
	| "mode"
	| "prompt"

/**
 * 工具使用参数
 */
export interface ToolUseParams {
	[key: string]: string | undefined
}

/**
 * 工具使用定义
 */
export interface ToolUse {
	name: string
	params: ToolUseParams
	partial?: boolean
}

/**
 * 工具处理函数类型
 */
export type ToolHandler = (params: { toolUse: ToolUse; cwd: string; verbose: boolean }) => Promise<ToolResponse>

/**
 * 工具描述函数类型
 */
export type ToolDescription = (args: ToolArgs) => string

/**
 * 工具参数
 */
export interface ToolArgs {
	cwd: string
	supportsComputerUse: boolean
	browserViewportSize?: string
	toolOptions?: any
}

/**
 * 工具注册表
 */
export interface ToolRegistry {
	[toolName: string]: {
		handler: ToolHandler
		description: ToolDescription
	}
}

/**
 * 工具组映射
 */
export const TOOL_GROUPS: Record<ToolGroup, ToolGroupConfig> = {
	read: {
		tools: ["read_file", "search_files", "list_files", "list_code_definition_names"],
	},
	edit: {
		tools: ["write_to_file", "insert_content", "diff_files"],
	},
	browser: {
		tools: ["browser_action"],
	},
	command: {
		tools: ["execute_command"],
	},
	mcp: {
		tools: ["use_mcp_tool", "access_mcp_resource"],
	},
	modes: {
		tools: ["switch_mode", "new_task"],
		alwaysAvailable: true,
	},
}

/**
 * 始终可用的工具
 */
export const ALWAYS_AVAILABLE_TOOLS = ["ask_followup_question", "attempt_completion", "switch_mode", "new_task"]

/**
 * 工具显示名称
 */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
	execute_command: "run commands",
	read_file: "read files",
	fetch_instructions: "fetch instructions",
	write_to_file: "write files",
	search_files: "search files",
	list_files: "list files",
	list_code_definition_names: "list definitions",
	browser_action: "use a browser",
	use_mcp_tool: "use mcp tools",
	access_mcp_resource: "access mcp resources",
	ask_followup_question: "ask questions",
	attempt_completion: "complete tasks",
	switch_mode: "switch modes",
	new_task: "create new task",
	diff_files: "compare files",
	insert_content: "insert content",
}
