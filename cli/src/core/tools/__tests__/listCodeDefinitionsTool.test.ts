import { listCodeDefinitionsTool } from '../listCodeDefinitionsTool';
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';

// Mock fs-extra, path, and glob
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn(),
  extname: jest.fn(),
}));

jest.mock('glob', () => jest.fn());

describe('List Code Definitions Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if directory does not exist', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/src');
    
    // Mock fs.pathExists to return false
    (fs.pathExists as jest.Mock).mockResolvedValue(false);

    const result = await listCodeDefinitionsTool({
      toolUse: {
        name: 'list_code_definition_names',
        params: {
          path: 'src',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Directory not found: src');
    expect(path.resolve).toHaveBeenCalledWith('/test/dir', 'src');
    expect(fs.pathExists).toHaveBeenCalledWith('/test/dir/src');
  });

  it('should return an error if path is not a directory', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file.js');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats for a file
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => false,
    });

    const result = await listCodeDefinitionsTool({
      toolUse: {
        name: 'list_code_definition_names',
        params: {
          path: 'file.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Not a directory: file.js');
    expect(path.resolve).toHaveBeenCalledWith('/test/dir', 'file.js');
    expect(fs.pathExists).toHaveBeenCalledWith('/test/dir/file.js');
    expect(fs.stat).toHaveBeenCalledWith('/test/dir/file.js');
  });

  it('should find JavaScript/TypeScript definitions', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/src');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats for a directory
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => true,
    });
    
    // Mock glob to return a list of files
    (glob as jest.Mock).mockImplementation((pattern, options, callback) => {
      callback(null, ['file1.js', 'file2.ts']);
    });
    
    // Mock path.join to return file paths
    (path.join as jest.Mock).mockImplementation((dir, file) => `${dir}/${file}`);
    
    // Mock path.extname to return file extensions
    (path.extname as jest.Mock).mockImplementation((file) => {
      if (file.endsWith('.js')) return '.js';
      if (file.endsWith('.ts')) return '.ts';
      return '';
    });
    
    // Mock fs.readFile to return file contents
    (fs.readFile as jest.Mock).mockImplementation((filePath) => {
      if (filePath === '/test/dir/src/file1.js') {
        return Promise.resolve('class MyClass { constructor() {} }\nfunction myFunction() {}');
      }
      if (filePath === '/test/dir/src/file2.ts') {
        return Promise.resolve('interface MyInterface {}\nexport const myConst = 42;');
      }
      return Promise.resolve('');
    });

    const result = await listCodeDefinitionsTool({
      toolUse: {
        name: 'list_code_definition_names',
        params: {
          path: 'src',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Code definitions in src:');
    expect(result).toContain('File: file1.js');
    expect(result).toContain('Definitions: MyClass, myFunction');
    expect(result).toContain('File: file2.ts');
    expect(result).toContain('Definitions: MyInterface, myConst');
  });

  it('should handle errors during file processing', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/src');
    
    // Mock fs.pathExists to return true
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats for a directory
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => true,
    });
    
    // Mock glob to throw an error
    (glob as jest.Mock).mockImplementation((pattern, options, callback) => {
      callback(new Error('Failed to read directory'), null);
    });

    const result = await listCodeDefinitionsTool({
      toolUse: {
        name: 'list_code_definition_names',
        params: {
          path: 'src',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error listing code definitions in directory src:');
    expect(result).toContain('Failed to read directory');
  });
});
