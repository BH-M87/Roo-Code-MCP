import { getToolDescriptions } from './tools';
import { getToolUseSection } from './sections/tool-use';
import { getToolUseGuidelinesSection } from './sections/tool-use-guidelines';
import { getCapabilitiesSection } from './sections/capabilities';
import { getRulesSection } from './sections/rules';

/**
 * 生成系统提示
 * @param cwd 当前工作目录
 * @param mode 模式
 * @param customInstructions 自定义指令
 * @returns 系统提示
 */
export function generateSystemPrompt(
  cwd: string,
  mode: string = 'code',
  customInstructions?: string
): string {
  // 获取角色定义
  const roleDefinition = getRoleDefinition(mode);

  // 构建系统提示
  const systemPrompt = `${roleDefinition}

${getToolUseSection()}

${getToolDescriptions(mode, cwd)}

${getToolUseGuidelinesSection()}

${getCapabilitiesSection(cwd)}

${getRulesSection(cwd)}

${customInstructions ? `\n${customInstructions}` : ''}`;

  return systemPrompt;
}

/**
 * 获取角色定义
 * @param mode 模式
 * @returns 角色定义
 */
function getRoleDefinition(mode: string): string {
  switch (mode) {
    case 'code':
      return `You are Roo, an AI coding assistant with expertise in software development. Your goal is to help users with coding tasks, debugging, and providing explanations about code.`;
    case 'ask':
      return `You are Roo, an AI assistant focused on answering questions and providing information. Your goal is to help users by providing accurate, helpful, and concise responses to their queries.`;
    default:
      return `You are Roo, an AI assistant with expertise in software development. Your goal is to help users with their tasks by providing accurate, helpful, and concise responses.`;
  }
}
