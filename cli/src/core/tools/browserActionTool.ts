import { ToolHandler } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * 浏览器动作工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const browserActionTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const action = params.action;
  const url = params.url;

  if (!action) {
    return 'Error: Missing required parameter "action"';
  }

  try {
    if (verbose) {
      console.log(`Executing browser action: ${action}`);
    }

    switch (action) {
      case 'open':
        if (!url) {
          return 'Error: Missing required parameter "url" for action "open"';
        }
        
        // 打开浏览器
        await openBrowser(url);
        return `Successfully opened browser with URL: ${url}`;
      
      case 'screenshot':
        return 'Error: Screenshot action is not supported in CLI mode';
      
      default:
        return `Error: Unsupported action "${action}"`;
    }
  } catch (error) {
    console.error(`Error executing browser action ${action}:`, error);
    return `Error executing browser action ${action}: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * 打开浏览器
 * @param url URL
 */
async function openBrowser(url: string): Promise<void> {
  const platform = os.platform();
  
  try {
    switch (platform) {
      case 'darwin':
        await execAsync(`open "${url}"`);
        break;
      case 'win32':
        await execAsync(`start "${url}"`);
        break;
      case 'linux':
        await execAsync(`xdg-open "${url}"`);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    throw new Error(`Failed to open browser: ${error instanceof Error ? error.message : String(error)}`);
  }
}
