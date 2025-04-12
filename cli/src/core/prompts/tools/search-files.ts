import { ToolArgs } from './types';

/**
 * 获取 search_files 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getSearchFilesDescription(args: ToolArgs): string {
  return `## search_files
Description: Search for files containing a specific pattern.
Parameters:
- path: (required) The path to the directory to search in. This can be a relative path from the current working directory (${args.cwd}) or an absolute path.
- regex: (required) The regular expression pattern to search for.
- file_pattern: (optional) A glob pattern to filter files to search in (e.g., "*.js").
Usage:
<search_files>
<path>path/to/directory</path>
<regex>pattern to search for</regex>
<file_pattern>*.js</file_pattern>
</search_files>

Example: Searching for a pattern in all files
<search_files>
<path>src</path>
<regex>function\\s+main</regex>
</search_files>

Example: Searching for a pattern in specific files
<search_files>
<path>src</path>
<regex>import\\s+React</regex>
<file_pattern>*.jsx</file_pattern>
</search_files>`;
}
