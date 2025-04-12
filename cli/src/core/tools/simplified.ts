/**
 * 简化版工具实现
 */

import fs from "fs-extra";
import path from "path";
import { ToolResponse } from "../task";

/**
 * 工具使用参数
 */
export interface ToolUseParams {
  [key: string]: string | undefined;
}

/**
 * 工具使用定义
 */
export interface ToolUse {
  name: string;
  params: ToolUseParams;
  partial?: boolean;
}

/**
 * 工具处理函数类型
 */
export type ToolHandler = (
  params: {
    toolUse: ToolUse;
    cwd: string;
    verbose: boolean;
  }
) => Promise<ToolResponse>;

/**
 * 读取文件工具
 */
export const readFileTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const relPath = params.path;

  if (!relPath) {
    return 'Error: Missing required parameter "path"';
  }

  try {
    // 解析文件路径
    const fullPath = path.resolve(cwd, relPath);
    
    if (verbose) {
      console.log(`Reading file: ${fullPath}`);
    }

    // 检查文件是否存在
    if (!await fs.pathExists(fullPath)) {
      return `Error: File not found: ${relPath}`;
    }

    // 读取文件内容
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    
    // 构建结果
    let result = `File: ${relPath}\n\n`;
    result += '```\n' + fileContent + '\n```';
    
    return result;
  } catch (error) {
    console.error(`Error reading file ${relPath}:`, error);
    return `Error reading file ${relPath}: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * 写入文件工具
 */
export const writeToFileTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const relPath = params.path;
  const content = params.content;

  if (!relPath) {
    return 'Error: Missing required parameter "path"';
  }

  if (content === undefined) {
    return 'Error: Missing required parameter "content"';
  }

  try {
    // 解析文件路径
    const fullPath = path.resolve(cwd, relPath);
    
    if (verbose) {
      console.log(`Writing to file: ${fullPath}`);
    }

    // 确保目录存在
    await fs.ensureDir(path.dirname(fullPath));

    // 写入文件内容
    await fs.writeFile(fullPath, content, 'utf-8');

    return `Successfully wrote to file: ${relPath}`;
  } catch (error) {
    console.error(`Error writing to file ${relPath}:`, error);
    return `Error writing to file ${relPath}: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * 执行命令工具
 */
export const executeCommandTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const command = params.command;
  const customCwd = params.cwd;

  if (!command) {
    return 'Error: Missing required parameter "command"';
  }

  try {
    // 解析工作目录
    const workingDir = customCwd ? customCwd : cwd;
    
    if (verbose) {
      console.log(`Executing command: ${command}`);
      console.log(`Working directory: ${workingDir}`);
    }

    // 在实际实现中，这里会执行命令
    // 但为了简化，我们只返回一个模拟结果
    return `Command: ${command}\nWorking directory: ${workingDir}\n\nOutput: (Command execution simulated)`;
  } catch (error) {
    console.error(`Error executing command ${command}:`, error);
    return `Error executing command ${command}: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * 列出文件工具
 */
export const listFilesTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const relDirPath = params.path;
  const recursive = params.recursive === 'true';

  if (!relDirPath) {
    return 'Error: Missing required parameter "path"';
  }

  try {
    // 解析目录路径
    const fullPath = path.resolve(cwd, relDirPath);
    
    if (verbose) {
      console.log(`Listing files in directory: ${fullPath}`);
      console.log(`Recursive: ${recursive}`);
    }

    // 检查目录是否存在
    if (!await fs.pathExists(fullPath)) {
      return `Error: Directory not found: ${relDirPath}`;
    }

    // 检查是否是目录
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return `Error: Not a directory: ${relDirPath}`;
    }

    // 列出文件（简化版，不使用 glob）
    const files = await fs.readdir(fullPath);
    
    // 构建结果
    let result = `Directory: ${relDirPath}\n`;
    result += `Total items: ${files.length}\n\n`;
    
    // 添加文件列表
    result += 'Files and directories:\n';
    for (const file of files) {
      result += `- ${file}\n`;
    }
    
    return result;
  } catch (error) {
    console.error(`Error listing files in directory ${relDirPath}:`, error);
    return `Error listing files in directory ${relDirPath}: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * 搜索文件工具
 */
export const searchFilesTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const relDirPath = params.path;
  const regex = params.regex;
  const filePattern = params.file_pattern;

  if (!relDirPath) {
    return 'Error: Missing required parameter "path"';
  }

  if (!regex) {
    return 'Error: Missing required parameter "regex"';
  }

  try {
    // 解析目录路径
    const fullPath = path.resolve(cwd, relDirPath);
    
    if (verbose) {
      console.log(`Searching files in directory: ${fullPath}`);
      console.log(`Regex: ${regex}`);
      console.log(`File pattern: ${filePattern || '*'}`);
    }

    // 检查目录是否存在
    if (!await fs.pathExists(fullPath)) {
      return `Error: Directory not found: ${relDirPath}`;
    }

    // 检查是否是目录
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return `Error: Not a directory: ${relDirPath}`;
    }

    // 编译正则表达式
    let regexObj: RegExp;
    try {
      regexObj = new RegExp(regex, 'g');
    } catch (error) {
      return `Error: Invalid regular expression: ${regex}`;
    }

    // 在实际实现中，这里会搜索文件
    // 但为了简化，我们只返回一个模拟结果
    return `Search results for "${regex}" in ${relDirPath} (pattern: ${filePattern || '*'})\n\nSearch operation simulated. No actual search was performed.`;
  } catch (error) {
    console.error(`Error searching files in directory ${relDirPath}:`, error);
    return `Error searching files in directory ${relDirPath}: ${error instanceof Error ? error.message : String(error)}`;
  }
};
