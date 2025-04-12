import { insertContentTool } from '../insertContentTool';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra and path
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
}));

describe('Insert Content Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if path is missing', async () => {
    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          content: 'Test content',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "path"');
  });

  it('should return an error if content is missing', async () => {
    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "content"');
  });

  it('should return an error if file does not exist', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return false
    (fs.pathExists as jest.Mock).mockResolvedValue(false);

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'Test content',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: File not found: file.js');
  });

  it('should insert content at the start of a file', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readFile to return file content
    (fs.readFile as jest.Mock).mockResolvedValue('Original content');
    
    // Mock fs.writeFile to do nothing
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'New content',
          position: 'start',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Successfully inserted content into file: file.js');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/test/dir/file.js',
      'New content\nOriginal content',
      'utf-8'
    );
  });

  it('should insert content at the end of a file by default', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readFile to return file content
    (fs.readFile as jest.Mock).mockResolvedValue('Original content');
    
    // Mock fs.writeFile to do nothing
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'New content',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Successfully inserted content into file: file.js');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/test/dir/file.js',
      'Original content\nNew content',
      'utf-8'
    );
  });

  it('should insert content at a specific line', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readFile to return file content with multiple lines
    (fs.readFile as jest.Mock).mockResolvedValue('Line 1\nLine 2\nLine 3');
    
    // Mock fs.writeFile to do nothing
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'New line',
          position: 'line:2',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Successfully inserted content into file: file.js');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/test/dir/file.js',
      'Line 1\nLine 2\nNew line\nLine 3',
      'utf-8'
    );
  });

  it('should return an error for invalid line number', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readFile to return file content with multiple lines
    (fs.readFile as jest.Mock).mockResolvedValue('Line 1\nLine 2\nLine 3');

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'New line',
          position: 'line:10', // Line number out of range
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Invalid line number: 10');
  });

  it('should return an error for invalid position', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readFile to return file content
    (fs.readFile as jest.Mock).mockResolvedValue('Original content');

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'New content',
          position: 'invalid',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Invalid position: invalid');
  });

  it('should handle errors during file operations', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readFile to throw an error
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('Failed to read file'));

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await insertContentTool({
      toolUse: {
        name: 'insert_content',
        params: {
          path: 'file.js',
          content: 'New content',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error inserting content into file file.js:');
    expect(result).toContain('Failed to read file');
    
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
