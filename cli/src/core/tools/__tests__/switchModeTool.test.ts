import { switchModeTool } from '../switchModeTool';

describe('Switch Mode Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if mode is missing', async () => {
    const result = await switchModeTool({
      toolUse: {
        name: 'switch_mode',
        params: {},
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "mode"');
  });

  it('should return instructions for switching to a specific mode', async () => {
    const result = await switchModeTool({
      toolUse: {
        name: 'switch_mode',
        params: {
          mode: 'code',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('To switch to code mode');
    expect(result).toContain('roo new "Your prompt" --mode code');
  });

  it('should log verbose information when verbose is true', async () => {
    // Spy on console.log
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await switchModeTool({
      toolUse: {
        name: 'switch_mode',
        params: {
          mode: 'ask',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(consoleSpy).toHaveBeenCalledWith('Switching to mode: ask');
    expect(result).toContain('To switch to ask mode');
    expect(result).toContain('roo new "Your prompt" --mode ask');

    // Restore console.log
    consoleSpy.mockRestore();
  });

  it('should handle errors during execution', async () => {
    // Mock console.error to throw an error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await switchModeTool({
      toolUse: {
        name: 'switch_mode',
        params: {
          mode: 'code',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Error switching to mode code:');
    expect(result).toContain('Unexpected error');

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
