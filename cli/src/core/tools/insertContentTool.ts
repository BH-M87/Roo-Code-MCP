import fs from 'fs-extra';
import path from 'path';
import { ToolHandler } from './types';

/**
 * 插入内容工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const insertContentTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const filePath = params.path;
  const content = params.content;
  const position = params.position || 'end'; // 'start', 'end', 'line:N'
  
  if (!filePath) {
    return 'Error: Missing required parameter "path"';
  }
  
  if (content === undefined) {
    return 'Error: Missing required parameter "content"';
  }
  
  try {
    // 解析文件路径
    const fullPath = path.resolve(cwd, filePath);
    
    if (verbose) {
      console.log(`Inserting content into file: ${fullPath}`);
      console.log(`Position: ${position}`);
    }
    
    // 检查文件是否存在
    if (!await fs.pathExists(fullPath)) {
      return `Error: File not found: ${filePath}`;
    }
    
    // 读取文件内容
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // 根据位置插入内容
    let newContent: string;
    
    if (position === 'start') {
      // 在文件开头插入
      newContent = content + '\n' + fileContent;
    } else if (position === 'end') {
      // 在文件末尾插入
      newContent = fileContent + '\n' + content;
    } else if (position.startsWith('line:')) {
      // 在指定行后插入
      const lineNumber = parseInt(position.substring(5), 10);
      
      if (isNaN(lineNumber) || lineNumber < 1 || lineNumber > lines.length + 1) {
        return `Error: Invalid line number: ${position.substring(5)}`;
      }
      
      // 在指定行后插入内容
      lines.splice(lineNumber, 0, content);
      newContent = lines.join('\n');
    } else {
      return `Error: Invalid position: ${position}`;
    }
    
    // 写入文件
    await fs.writeFile(fullPath, newContent, 'utf-8');
    
    return `Successfully inserted content into file: ${filePath}`;
  } catch (error) {
    console.error(`Error inserting content into file ${filePath}:`, error);
    return `Error inserting content into file ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
  }
};
