import { ToolArgs } from './types';

/**
 * 获取 write_to_file 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getWriteToFileDescription(args: ToolArgs): string {
  return `## write_to_file
Description: Write content to a file. If the file already exists, it will be overwritten.
Parameters:
- path: (required) The path to the file to write. This can be a relative path from the current working directory (${args.cwd}) or an absolute path.
- content: (required) The content to write to the file.
Usage:
<write_to_file>
<path>path/to/file.txt</path>
<content>
Content to write to the file.
This can be multiple lines.
</content>
</write_to_file>

Example: Writing to a file
<write_to_file>
<path>src/hello.js</path>
<content>
console.log('Hello, world!');
</content>
</write_to_file>`;
}
