import fs from 'fs-extra';
import path from 'path';

/**
 * Check if a file exists
 * @param filePath Path to the file
 * @returns True if the file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await fs.pathExists(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Read a file
 * @param filePath Path to the file
 * @returns File content or null if file doesn't exist
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    if (await fileExists(filePath)) {
      return await fs.readFile(filePath, 'utf-8');
    }
    return null;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Write to a file
 * @param filePath Path to the file
 * @param content Content to write
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    throw error;
  }
}

/**
 * List files in a directory
 * @param dirPath Path to the directory
 * @param pattern Optional glob pattern
 * @returns Array of file paths
 */
export async function listFiles(dirPath: string, pattern?: string): Promise<string[]> {
  try {
    if (!await fs.pathExists(dirPath)) {
      return [];
    }
    
    const files = await fs.readdir(dirPath);
    
    if (pattern) {
      const regex = new RegExp(pattern);
      return files.filter(file => regex.test(file)).map(file => path.join(dirPath, file));
    }
    
    return files.map(file => path.join(dirPath, file));
  } catch (error) {
    console.error(`Error listing files in ${dirPath}:`, error);
    return [];
  }
}
