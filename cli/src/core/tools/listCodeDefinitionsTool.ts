import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { ToolHandler } from './types';

/**
 * 列出代码定义工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const listCodeDefinitionsTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const relDirPath = params.path || '.';

  try {
    // 解析目录路径
    const fullPath = path.resolve(cwd, relDirPath);
    
    if (verbose) {
      console.log(`Listing code definitions in directory: ${fullPath}`);
    }

    // 检查目录是否存在
    if (!await fs.pathExists(fullPath)) {
      return `Error: Directory not found: ${relDirPath}`;
    }

    // 检查是否是目录
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return `Error: Not a directory: ${relDirPath}`;
    }

    // 获取文件列表
    const files = await new Promise<string[]>((resolve, reject) => {
      glob('**/*.{js,ts,jsx,tsx,py,java,c,cpp,h,hpp,cs,go,rb,php}', {
        cwd: fullPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      }, (err, matches) => {
        if (err) {
          reject(err);
        } else {
          resolve(matches);
        }
      });
    });

    // 解析代码定义
    const definitions: Record<string, string[]> = {};
    
    for (const file of files) {
      const filePath = path.join(fullPath, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileExt = path.extname(file).toLowerCase();
      
      // 根据文件类型使用不同的正则表达式
      let definitionRegex: RegExp;
      
      switch (fileExt) {
        case '.js':
        case '.ts':
        case '.jsx':
        case '.tsx':
          // JavaScript/TypeScript 定义
          definitionRegex = /(?:export\s+)?(?:class|function|const|let|var|interface|enum|type)\s+([A-Za-z0-9_$]+)/g;
          break;
        case '.py':
          // Python 定义
          definitionRegex = /(?:class|def)\s+([A-Za-z0-9_]+)/g;
          break;
        case '.java':
          // Java 定义
          definitionRegex = /(?:class|interface|enum)\s+([A-Za-z0-9_]+)|(?:public|private|protected|static)?\s+(?:void|[A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s*\(/g;
          break;
        case '.c':
        case '.cpp':
        case '.h':
        case '.hpp':
          // C/C++ 定义
          definitionRegex = /(?:class|struct|enum)\s+([A-Za-z0-9_]+)|(?:void|[A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s*\(/g;
          break;
        case '.cs':
          // C# 定义
          definitionRegex = /(?:class|interface|enum|struct)\s+([A-Za-z0-9_]+)|(?:public|private|protected|internal|static)?\s+(?:void|[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*\(/g;
          break;
        case '.go':
          // Go 定义
          definitionRegex = /(?:func|type)\s+([A-Za-z0-9_]+)/g;
          break;
        case '.rb':
          // Ruby 定义
          definitionRegex = /(?:class|module|def)\s+([A-Za-z0-9_]+)/g;
          break;
        case '.php':
          // PHP 定义
          definitionRegex = /(?:class|interface|function)\s+([A-Za-z0-9_]+)/g;
          break;
        default:
          // 跳过不支持的文件类型
          continue;
      }
      
      // 查找定义
      let match;
      const fileDefinitions: string[] = [];
      
      while ((match = definitionRegex.exec(fileContent)) !== null) {
        // 获取定义名称（可能在第一个或第二个捕获组中）
        const name = match[1] || match[2];
        if (name && !fileDefinitions.includes(name)) {
          fileDefinitions.push(name);
        }
      }
      
      if (fileDefinitions.length > 0) {
        definitions[file] = fileDefinitions;
      }
    }
    
    // 构建结果
    let result = `Code definitions in ${relDirPath}:\n\n`;
    
    if (Object.keys(definitions).length === 0) {
      result += 'No code definitions found.';
    } else {
      for (const file in definitions) {
        result += `File: ${file}\n`;
        result += `Definitions: ${definitions[file].join(', ')}\n\n`;
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error listing code definitions in directory ${relDirPath}:`, error);
    return `Error listing code definitions in directory ${relDirPath}: ${error instanceof Error ? error.message : String(error)}`;
  }
};
