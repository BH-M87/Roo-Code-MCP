import { ToolArgs } from './types';

/**
 * 获取 list_files 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getListFilesDescription(args: ToolArgs): string {
  return `## list_files
Description: List files in a directory.
Parameters:
- path: (required) The path to the directory to list files from. This can be a relative path from the current working directory (${args.cwd}) or an absolute path.
- recursive: (optional) Whether to list files recursively (default: false).
Usage:
<list_files>
<path>path/to/directory</path>
<recursive>true</recursive>
</list_files>

Example: Listing files in a directory
<list_files>
<path>src</path>
</list_files>

Example: Listing files recursively
<list_files>
<path>src</path>
<recursive>true</recursive>
</list_files>`;
}
