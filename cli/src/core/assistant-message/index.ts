/**
 * 助手消息类型定义
 */

export type AssistantMessageContent = TextContent | ToolUse;

export { parseAssistantMessage } from './parse-assistant-message';

/**
 * 文本内容
 */
export interface TextContent {
  type: 'text';
  content: string;
  partial: boolean;
}

/**
 * 工具名称列表
 */
export const toolUseNames = [
  'execute_command',
  'read_file',
  'write_to_file',
  'search_files',
  'list_files',
  'list_code_definition_names',
] as const;

/**
 * 工具名称类型
 */
export type ToolUseName = (typeof toolUseNames)[number];

/**
 * 工具参数名称列表
 */
export const toolParamNames = [
  'command',
  'path',
  'content',
  'start_line',
  'end_line',
  'regex',
  'file_pattern',
  'recursive',
  'cwd',
] as const;

/**
 * 工具参数名称类型
 */
export type ToolParamName = (typeof toolParamNames)[number];

/**
 * 工具使用
 */
export interface ToolUse {
  type: 'tool_use';
  name: ToolUseName;
  params: Partial<Record<ToolParamName, string>>;
  partial: boolean;
}

/**
 * 执行命令工具使用
 */
export interface ExecuteCommandToolUse extends ToolUse {
  name: 'execute_command';
  params: Partial<Pick<Record<ToolParamName, string>, 'command' | 'cwd'>>;
}

/**
 * 读取文件工具使用
 */
export interface ReadFileToolUse extends ToolUse {
  name: 'read_file';
  params: Partial<Pick<Record<ToolParamName, string>, 'path' | 'start_line' | 'end_line'>>;
}

/**
 * 写入文件工具使用
 */
export interface WriteToFileToolUse extends ToolUse {
  name: 'write_to_file';
  params: Partial<Pick<Record<ToolParamName, string>, 'path' | 'content'>>;
}

/**
 * 搜索文件工具使用
 */
export interface SearchFilesToolUse extends ToolUse {
  name: 'search_files';
  params: Partial<Pick<Record<ToolParamName, string>, 'path' | 'regex' | 'file_pattern'>>;
}

/**
 * 列出文件工具使用
 */
export interface ListFilesToolUse extends ToolUse {
  name: 'list_files';
  params: Partial<Pick<Record<ToolParamName, string>, 'path' | 'recursive'>>;
}

/**
 * 列出代码定义名称工具使用
 */
export interface ListCodeDefinitionNamesToolUse extends ToolUse {
  name: 'list_code_definition_names';
  params: Partial<Pick<Record<ToolParamName, string>, 'path'>>;
}
