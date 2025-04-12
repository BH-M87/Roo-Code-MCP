import { browserActionTool } from '../browserActionTool';
import { exec } from 'child_process';
import * as os from 'os';

// Mock child_process and os
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('os', () => ({
  platform: jest.fn(),
}));

describe('Browser Action Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if action is missing', async () => {
    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {},
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "action"');
  });

  it('should return an error if url is missing for open action', async () => {
    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {
          action: 'open',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "url" for action "open"');
  });

  it('should return an error for unsupported actions', async () => {
    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {
          action: 'unsupported_action',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Unsupported action "unsupported_action"');
  });

  it('should return an error for screenshot action', async () => {
    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {
          action: 'screenshot',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Screenshot action is not supported in CLI mode');
  });

  it('should open a browser on macOS', async () => {
    // Mock os.platform to return 'darwin'
    (os.platform as jest.Mock).mockReturnValue('darwin');
    
    // Mock exec to resolve successfully
    (exec as jest.Mock).mockImplementation((cmd, callback) => {
      callback(null, { stdout: '', stderr: '' });
      return { stdout: '', stderr: '' };
    });

    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {
          action: 'open',
          url: 'https://example.com',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Successfully opened browser with URL: https://example.com');
    expect(exec).toHaveBeenCalledWith(
      'open "https://example.com"',
      expect.any(Function)
    );
  });

  it('should open a browser on Windows', async () => {
    // Mock os.platform to return 'win32'
    (os.platform as jest.Mock).mockReturnValue('win32');
    
    // Mock exec to resolve successfully
    (exec as jest.Mock).mockImplementation((cmd, callback) => {
      callback(null, { stdout: '', stderr: '' });
      return { stdout: '', stderr: '' };
    });

    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {
          action: 'open',
          url: 'https://example.com',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Successfully opened browser with URL: https://example.com');
    expect(exec).toHaveBeenCalledWith(
      'start "https://example.com"',
      expect.any(Function)
    );
  });

  it('should handle errors when opening browser', async () => {
    // Mock os.platform to return 'darwin'
    (os.platform as jest.Mock).mockReturnValue('darwin');
    
    // Mock exec to reject with an error
    (exec as jest.Mock).mockImplementation((cmd, callback) => {
      callback(new Error('Failed to open browser'), { stdout: '', stderr: '' });
      return { stdout: '', stderr: '' };
    });

    const result = await browserActionTool({
      toolUse: {
        name: 'browser_action',
        params: {
          action: 'open',
          url: 'https://example.com',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error executing browser action open');
    expect(result).toContain('Failed to open browser');
  });
});
