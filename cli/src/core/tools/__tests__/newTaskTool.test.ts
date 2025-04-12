import { newTaskTool, setApiConfig } from '../newTaskTool';
import { handleNewTask } from '../../task';

// Mock task module
jest.mock('../../task', () => ({
  handleNewTask: jest.fn(),
}));

describe('New Task Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if prompt is missing', async () => {
    const result = await newTaskTool({
      toolUse: {
        name: 'new_task',
        params: {},
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: Missing required parameter "prompt"');
  });

  it('should return an error if API configuration is not set', async () => {
    const result = await newTaskTool({
      toolUse: {
        name: 'new_task',
        params: {
          prompt: 'Test prompt',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error: API configuration not set');
  });

  it('should create a new task successfully', async () => {
    // Set API configuration
    const mockApiConfig = {
      apiProvider: 'openai',
      openAiApiKey: 'test-key',
      openAiModelId: 'test-model',
    };
    setApiConfig(mockApiConfig);

    // Mock handleNewTask to return a successful result
    (handleNewTask as jest.Mock).mockResolvedValue({
      taskId: 'test-task-id',
      output: 'Task completed successfully',
      success: true,
    });

    // Spy on console.log
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await newTaskTool({
      toolUse: {
        name: 'new_task',
        params: {
          prompt: 'Test prompt',
          mode: 'code',
        },
      },
      cwd: '/test/dir',
      verbose: true,
    });

    expect(result).toContain('Task completed successfully');
    expect(result).toContain('Output:');
    expect(result).toContain('Task completed successfully');
    
    expect(handleNewTask).toHaveBeenCalledWith({
      prompt: 'Test prompt',
      mode: 'code',
      apiConfig: mockApiConfig,
      cwd: '/test/dir',
      verbose: true,
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Creating new task with prompt: Test prompt');
    expect(consoleSpy).toHaveBeenCalledWith('Mode: code');

    // Restore console.log
    consoleSpy.mockRestore();
  });

  it('should handle task failure', async () => {
    // Set API configuration
    const mockApiConfig = {
      apiProvider: 'openai',
      openAiApiKey: 'test-key',
      openAiModelId: 'test-model',
    };
    setApiConfig(mockApiConfig);

    // Mock handleNewTask to return a failed result
    (handleNewTask as jest.Mock).mockResolvedValue({
      taskId: 'test-task-id',
      output: '',
      success: false,
      error: 'Task failed',
    });

    const result = await newTaskTool({
      toolUse: {
        name: 'new_task',
        params: {
          prompt: 'Test prompt',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Task failed: Task failed');
    
    expect(handleNewTask).toHaveBeenCalledWith({
      prompt: 'Test prompt',
      mode: 'code', // Default mode
      apiConfig: mockApiConfig,
      cwd: '/test/dir',
      verbose: false,
    });
  });

  it('should handle errors during execution', async () => {
    // Set API configuration
    const mockApiConfig = {
      apiProvider: 'openai',
      openAiApiKey: 'test-key',
      openAiModelId: 'test-model',
    };
    setApiConfig(mockApiConfig);

    // Mock handleNewTask to throw an error
    (handleNewTask as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await newTaskTool({
      toolUse: {
        name: 'new_task',
        params: {
          prompt: 'Test prompt',
        },
      },
      cwd: '/test/dir',
      verbose: false,
    });

    expect(result).toContain('Error creating new task:');
    expect(result).toContain('Unexpected error');
    
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
