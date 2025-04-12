import { ToolArgs } from './types';

/**
 * 获取 read_file 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getReadFileDescription(args: ToolArgs): string {
  return `## read_file
Description: Read the contents of a file.
Parameters:
- path: (required) The path to the file to read. This can be a relative path from the current working directory (${args.cwd}) or an absolute path.
- start_line: (optional) The line number to start reading from (1-indexed). If not provided, the file will be read from the beginning.
- end_line: (optional) The line number to end reading at (1-indexed). If not provided, the file will be read until the end.
Usage:
<read_file>
<path>path/to/file.txt</path>
<start_line>10</start_line>
<end_line>20</end_line>
</read_file>

Example: Reading an entire file
<read_file>
<path>src/index.js</path>
</read_file>

Example: Reading a specific range of lines
<read_file>
<path>src/index.js</path>
<start_line>10</start_line>
<end_line>20</end_line>
</read_file>`;
}
