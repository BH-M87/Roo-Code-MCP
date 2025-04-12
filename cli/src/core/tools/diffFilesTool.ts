import fs from 'fs-extra';
import path from 'path';
import { ToolHandler } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 文件差异比较工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const diffFilesTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const file1 = params.file1;
  const file2 = params.file2;

  if (!file1) {
    return 'Error: Missing required parameter "file1"';
  }

  if (!file2) {
    return 'Error: Missing required parameter "file2"';
  }

  try {
    // 解析文件路径
    const fullPath1 = path.resolve(cwd, file1);
    const fullPath2 = path.resolve(cwd, file2);
    
    if (verbose) {
      console.log(`Comparing files: ${fullPath1} and ${fullPath2}`);
    }

    // 检查文件是否存在
    if (!await fs.pathExists(fullPath1)) {
      return `Error: File not found: ${file1}`;
    }

    if (!await fs.pathExists(fullPath2)) {
      return `Error: File not found: ${file2}`;
    }

    // 检查是否是文件
    const stats1 = await fs.stat(fullPath1);
    const stats2 = await fs.stat(fullPath2);
    
    if (!stats1.isFile()) {
      return `Error: Not a file: ${file1}`;
    }
    
    if (!stats2.isFile()) {
      return `Error: Not a file: ${file2}`;
    }

    // 使用 diff 命令比较文件
    try {
      const { stdout } = await execAsync(`diff -u "${fullPath1}" "${fullPath2}"`);
      
      if (!stdout) {
        return `Files are identical: ${file1} and ${file2}`;
      }
      
      return `Diff between ${file1} and ${file2}:\n\n${stdout}`;
    } catch (error) {
      // diff 命令在文件不同时会返回非零退出码，这不是错误
      if (error instanceof Error && 'stdout' in error) {
        const execError = error as Error & { stdout: string };
        return `Diff between ${file1} and ${file2}:\n\n${execError.stdout}`;
      }
      
      throw error;
    }
  } catch (error) {
    console.error(`Error comparing files ${file1} and ${file2}:`, error);
    return `Error comparing files ${file1} and ${file2}: ${error instanceof Error ? error.message : String(error)}`;
  }
};
