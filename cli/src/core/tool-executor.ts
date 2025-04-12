import { ToolCall } from '../types';
import { executeTool } from './tools';
import { ToolUse } from './tools/types';

/**
 * 工具执行器
 */
export class ToolExecutor {
  private cwd: string;
  private verbose: boolean;

  /**
   * 构造函数
   * @param cwd 当前工作目录
   * @param verbose 是否详细输出
   */
  constructor(cwd: string, verbose: boolean = false) {
    this.cwd = cwd;
    this.verbose = verbose;
  }

  /**
   * 执行工具调用
   * @param toolCall 工具调用
   * @returns 工具执行结果
   */
  async execute(toolCall: ToolCall): Promise<string> {
    const { name, params } = toolCall;
    
    if (this.verbose) {
      console.log(`Executing tool: ${name}`);
      console.log(`Parameters:`, params);
    }
    
    // 创建工具使用对象
    const toolUse: ToolUse = {
      name,
      params,
    };
    
    // 执行工具
    return executeTool(toolUse, this.cwd, this.verbose);
  }
}
