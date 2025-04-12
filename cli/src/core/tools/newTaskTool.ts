import { ToolHandler } from './types';
import { v4 as uuidv4 } from 'uuid';
import { handleNewTask } from '../task';
import { createApiHandler } from '../../api';
import { ApiConfig } from '../../types';

// 存储 API 配置的全局变量
let globalApiConfig: ApiConfig | null = null;

/**
 * 设置 API 配置
 * @param apiConfig API 配置
 */
export function setApiConfig(apiConfig: ApiConfig): void {
  globalApiConfig = apiConfig;
}

/**
 * 新任务工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const newTaskTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const prompt = params.prompt;
  const mode = params.mode || 'code';

  if (!prompt) {
    return 'Error: Missing required parameter "prompt"';
  }

  if (!globalApiConfig) {
    return 'Error: API configuration not set. Please restart the CLI.';
  }

  try {
    if (verbose) {
      console.log(`Creating new task with prompt: ${prompt}`);
      console.log(`Mode: ${mode}`);
    }

    // 创建新任务
    const result = await handleNewTask({
      prompt,
      mode,
      apiConfig: globalApiConfig,
      cwd,
      verbose,
    });

    // 返回结果
    if (result.success) {
      return `Task completed successfully.\n\nOutput:\n${result.output}`;
    } else {
      return `Task failed: ${result.error || 'Unknown error'}`;
    }
  } catch (error) {
    console.error(`Error creating new task:`, error);
    return `Error creating new task: ${error instanceof Error ? error.message : String(error)}`;
  }
};
