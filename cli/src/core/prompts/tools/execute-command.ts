import { ToolArgs } from './types';

/**
 * 获取 execute_command 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getExecuteCommandDescription(args: ToolArgs): string {
  return `## execute_command
Description: Execute a command in the terminal.
Parameters:
- command: (required) The command to execute.
- cwd: (optional) The working directory to execute the command in. If not provided, the current working directory (${args.cwd}) will be used.
Usage:
<execute_command>
<command>command to execute</command>
<cwd>path/to/working/directory</cwd>
</execute_command>

Example: Executing a command
<execute_command>
<command>ls -la</command>
</execute_command>

Example: Executing a command in a specific directory
<execute_command>
<command>npm install</command>
<cwd>path/to/project</cwd>
</execute_command>`;
}
