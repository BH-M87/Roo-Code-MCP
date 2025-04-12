import { diffFilesTool } from '../diffFilesTool';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';

// Mock fs-extra, path, and child_process
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('Diff Files Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if file1 is missing', async () => {
    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {},
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "file1"');
  });

  it('should return an error if file2 is missing', async () => {
    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "file2"');
  });

  it('should return an error if file1 does not exist', async () => {
    // Mock path.resolve to return a path
    (path.resolve as jest.Mock).mockReturnValue('/test/dir/file1.js');
    
    // Mock fs.pathExists to return false for file1
    (fs.pathExists as jest.Mock).mockImplementation((filePath) => {
      if (filePath === '/test/dir/file1.js') {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    });

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: File not found: file1.js');
  });

  it('should return an error if file2 does not exist', async () => {
    // Mock path.resolve to return paths
    (path.resolve as jest.Mock).mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });
    
    // Mock fs.pathExists to return true for file1 and false for file2
    (fs.pathExists as jest.Mock).mockImplementation((filePath) => {
      if (filePath === '/test/dir/file1.js') {
        return Promise.resolve(true);
      }
      if (filePath === '/test/dir/file2.js') {
        return Promise.resolve(false);
      }
      return Promise.resolve(false);
    });

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: File not found: file2.js');
  });

  it('should return an error if file1 is not a file', async () => {
    // Mock path.resolve to return paths
    (path.resolve as jest.Mock).mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });
    
    // Mock fs.pathExists to return true for both files
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats
    (fs.stat as jest.Mock).mockImplementation((filePath) => {
      if (filePath === '/test/dir/file1.js') {
        return Promise.resolve({
          isFile: () => false,
        });
      }
      return Promise.resolve({
        isFile: () => true,
      });
    });

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Not a file: file1.js');
  });

  it('should return an error if file2 is not a file', async () => {
    // Mock path.resolve to return paths
    (path.resolve as jest.Mock).mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });
    
    // Mock fs.pathExists to return true for both files
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats
    (fs.stat as jest.Mock).mockImplementation((filePath) => {
      if (filePath === '/test/dir/file1.js') {
        return Promise.resolve({
          isFile: () => true,
        });
      }
      if (filePath === '/test/dir/file2.js') {
        return Promise.resolve({
          isFile: () => false,
        });
      }
      return Promise.resolve({
        isFile: () => true,
      });
    });

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Not a file: file2.js');
  });

  it('should return a message if files are identical', async () => {
    // Mock path.resolve to return paths
    (path.resolve as jest.Mock).mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });
    
    // Mock fs.pathExists to return true for both files
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats for files
    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
    });
    
    // Mock exec to return empty stdout (files are identical)
    (exec as jest.Mock).mockImplementation((cmd, callback) => {
      callback(null, { stdout: '' });
      return { stdout: '' };
    });

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Files are identical: file1.js and file2.js');
    expect(exec).toHaveBeenCalledWith(
      'diff -u "/test/dir/file1.js" "/test/dir/file2.js"',
      expect.any(Function)
    );
  });

  it('should return diff output if files are different', async () => {
    // Mock path.resolve to return paths
    (path.resolve as jest.Mock).mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });
    
    // Mock fs.pathExists to return true for both files
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats for files
    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
    });
    
    // Mock exec to throw an error with stdout (files are different)
    (exec as jest.Mock).mockImplementation((cmd, callback) => {
      const error = new Error('Command failed') as Error & { stdout: string };
      error.stdout = '--- file1.js\n+++ file2.js\n@@ -1,3 +1,3 @@\n-const a = 1;\n+const a = 2;\n const b = 3;';
      callback(error, { stdout: error.stdout });
      return { stdout: error.stdout };
    });

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Diff between file1.js and file2.js:');
    expect(result).toContain('--- file1.js');
    expect(result).toContain('+++ file2.js');
    expect(result).toContain('-const a = 1;');
    expect(result).toContain('+const a = 2;');
  });

  it('should handle errors during execution', async () => {
    // Mock path.resolve to return paths
    (path.resolve as jest.Mock).mockImplementation((dir, file) => {
      return `${dir}/${file}`;
    });
    
    // Mock fs.pathExists to return true for both files
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.stat to return stats for files
    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
    });
    
    // Mock exec to throw an error without stdout property
    (exec as jest.Mock).mockImplementation((cmd, callback) => {
      callback(new Error('Unexpected error'), { stdout: '' });
      return { stdout: '' };
    });

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await diffFilesTool({
      toolUse: {
        name: 'diff_files',
        params: {
          file1: 'file1.js',
          file2: 'file2.js',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error comparing files file1.js and file2.js:');
    expect(result).toContain('Unexpected error');
    
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
