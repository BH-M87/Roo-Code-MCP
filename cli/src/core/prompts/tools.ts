import { getAllToolDescriptions } from '../tools';
import { GlobalSettings } from '../../types';

/**
 * 获取工具描述
 * @param mode 模式
 * @param cwd 当前工作目录
 * @returns 工具描述
 */
export function getToolDescriptions(mode: string, cwd: string): string {
  // 创建一个空的设置对象
  const settings: GlobalSettings = {
    autoApprovalEnabled: true,
    alwaysAllowReadOnly: true,
    alwaysAllowWrite: true,
    alwaysAllowExecute: true,
    customModes: [],
  };

  // 获取所有可用工具的描述
  const toolDescriptions = getAllToolDescriptions(mode, settings, cwd);

  // 将工具描述转换为字符串
  let result = '# AVAILABLE TOOLS\n\n';
  
  for (const [name, description] of Object.entries(toolDescriptions)) {
    result += `${description}\n\n`;
  }

  return result;
}
