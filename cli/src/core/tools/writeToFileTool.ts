import fs from 'fs-extra';
import path from 'path';
import { ToolHandler } from './types';

/**
 * 写入文件工具
 * @param params 工具参数
 * @returns 工具执行结果
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
