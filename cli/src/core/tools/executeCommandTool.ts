import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolHandler } from './types';

const execAsync = promisify(exec);

/**
 * 执行命令工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const executeCommandTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  let command = params.command;
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

    // 执行命令
    const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
    
    // 构建结果
    let result = `Command: ${command}\n`;
    result += `Working directory: ${workingDir}\n\n`;
    
    if (stdout) {
      result += `Output:\n\`\`\`\n${stdout}\n\`\`\`\n\n`;
    }
    
    if (stderr) {
      result += `Error output:\n\`\`\`\n${stderr}\n\`\`\`\n`;
    }
    
    return result;
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const execError = error as Error & { stderr: string; stdout: string };
      let result = `Command failed: ${command}\n\n`;
      
      if (execError.stdout) {
        result += `Output:\n\`\`\`\n${execError.stdout}\n\`\`\`\n\n`;
      }
      
      if (execError.stderr) {
        result += `Error output:\n\`\`\`\n${execError.stderr}\n\`\`\`\n`;
      }
      
      return result;
    }
    
    console.error(`Error executing command ${command}:`, error);
    return `Error executing command ${command}: ${error instanceof Error ? error.message : String(error)}`;
  }
};
