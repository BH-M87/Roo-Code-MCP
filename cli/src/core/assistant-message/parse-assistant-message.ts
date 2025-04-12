import {
  AssistantMessageContent,
  TextContent,
  ToolUse,
  ToolParamName,
  toolParamNames,
  toolUseNames,
  ToolUseName,
} from './index';

/**
 * 解析助手消息
 * @param assistantMessage 助手消息
 * @returns 解析后的消息内容
 */
export function parseAssistantMessage(assistantMessage: string): AssistantMessageContent[] {
  let contentBlocks: AssistantMessageContent[] = [];
  let currentTextContent: TextContent | undefined = undefined;
  let currentTextContentStartIndex = 0;
  let currentToolUse: ToolUse | undefined = undefined;
  let currentToolUseStartIndex = 0;
  let currentParamName: ToolParamName | undefined = undefined;
  let currentParamValueStartIndex = 0;
  let accumulator = '';

  for (let i = 0; i < assistantMessage.length; i++) {
    const char = assistantMessage[i];
    accumulator += char;

    // 如果有当前工具使用和参数名称
    if (currentToolUse && currentParamName) {
      const currentParamValue = accumulator.slice(currentParamValueStartIndex);
      const paramClosingTag = `</${currentParamName}>`;
      if (currentParamValue.endsWith(paramClosingTag)) {
        // 参数值结束
        currentToolUse.params[currentParamName] = currentParamValue.slice(0, -paramClosingTag.length).trim();
        currentParamName = undefined;
        continue;
      } else {
        // 参数值正在累积
        continue;
      }
    }

    // 没有当前参数名称

    if (currentToolUse) {
      const currentToolValue = accumulator.slice(currentToolUseStartIndex);
      const toolUseClosingTag = `</${currentToolUse.name}>`;
      if (currentToolValue.endsWith(toolUseClosingTag)) {
        // 工具使用结束
        currentToolUse.partial = false;
        contentBlocks.push(currentToolUse);
        currentToolUse = undefined;
        continue;
      } else {
        const possibleParamOpeningTags = toolParamNames.map((name) => `<${name}>`);
        for (const paramOpeningTag of possibleParamOpeningTags) {
          if (accumulator.endsWith(paramOpeningTag)) {
            // 新参数开始
            currentParamName = paramOpeningTag.slice(1, -1) as ToolParamName;
            currentParamValueStartIndex = accumulator.length;
            break;
          }
        }

        // 没有当前参数，也没有开始新参数

        // 特殊情况：write_to_file 的文件内容可能包含结束标签
        const contentParamName: ToolParamName = 'content';
        if (currentToolUse.name === 'write_to_file' && accumulator.endsWith(`</${contentParamName}>`)) {
          const toolContent = accumulator.slice(currentToolUseStartIndex);
          const contentStartTag = `<${contentParamName}>`;
          const contentEndTag = `</${contentParamName}>`;
          const contentStartIndex = toolContent.indexOf(contentStartTag) + contentStartTag.length;
          const contentEndIndex = toolContent.lastIndexOf(contentEndTag);
          if (contentStartIndex !== -1 && contentEndIndex !== -1 && contentEndIndex > contentStartIndex) {
            currentToolUse.params[contentParamName] = toolContent
              .slice(contentStartIndex, contentEndIndex)
              .trim();
          }
        }

        // 工具值正在累积
        continue;
      }
    }

    // 没有当前工具使用

    let didStartToolUse = false;
    const possibleToolUseOpeningTags = toolUseNames.map((name) => `<${name}>`);
    for (const toolUseOpeningTag of possibleToolUseOpeningTags) {
      if (accumulator.endsWith(toolUseOpeningTag)) {
        // 新工具使用开始
        currentToolUse = {
          type: 'tool_use',
          name: toolUseOpeningTag.slice(1, -1) as ToolUseName,
          params: {},
          partial: true,
        };
        currentToolUseStartIndex = accumulator.length;
        // 当前文本内容结束
        if (currentTextContent) {
          currentTextContent.partial = false;
          // 从文本末尾删除部分累积的工具使用标签
          currentTextContent.content = currentTextContent.content
            .slice(0, -toolUseOpeningTag.slice(0, -1).length)
            .trim();
          contentBlocks.push(currentTextContent);
          currentTextContent = undefined;
        }

        didStartToolUse = true;
        break;
      }
    }

    if (!didStartToolUse) {
      // 没有工具使用，所以必须是文本
      if (currentTextContent === undefined) {
        currentTextContentStartIndex = i;
      }
      currentTextContent = {
        type: 'text',
        content: accumulator.slice(currentTextContentStartIndex).trim(),
        partial: true,
      };
    }
  }

  if (currentToolUse) {
    // 流没有完成工具调用，添加为部分
    if (currentParamName) {
      // 工具调用有一个未完成的参数
      currentToolUse.params[currentParamName] = accumulator.slice(currentParamValueStartIndex).trim();
    }
    contentBlocks.push(currentToolUse);
  }

  // 注意：检查 currentToolUse 或 currentTextContent 都无所谓，因为同一时间只有一个会被定义
  if (currentTextContent) {
    // 流没有完成文本内容，添加为部分
    contentBlocks.push(currentTextContent);
  }

  return contentBlocks;
}
