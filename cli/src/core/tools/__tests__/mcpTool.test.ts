import { useMcpTool, accessMcpResource, setMcpServerUrl, getMcpServerUrl } from '../mcpTool';
import axios from 'axios';

// Mock axios
jest.mock('axios');

describe('MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset MCP server URL before each test
    setMcpServerUrl(null);
  });

  describe('useMcpTool', () => {
    it('should return an error if tool name is missing', async () => {
      const result = await useMcpTool({
        toolUse: {
          name: 'use_mcp_tool',
          params: {},
        },
        cwd: '/test/dir',
        verbose: false,
      });

      expect(result).toContain('Error: Missing required parameter "tool"');
    });

    it('should return an error if MCP server URL is not set', async () => {
      const result = await useMcpTool({
        toolUse: {
          name: 'use_mcp_tool',
          params: {
            tool: 'test-tool',
          },
        },
        cwd: '/test/dir',
        verbose: false,
      });

      expect(result).toContain('Error: MCP server URL not set');
    });

    it('should call MCP tool successfully', async () => {
      // Set MCP server URL
      setMcpServerUrl('http://localhost:3000');
      
      // Mock axios.post to return a successful response
      (axios.post as jest.Mock).mockResolvedValue({
        data: { result: 'Tool executed successfully' },
      });

      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await useMcpTool({
        toolUse: {
          name: 'use_mcp_tool',
          params: {
            tool: 'test-tool',
            params: '{"param1": "value1"}',
          },
        },
        cwd: '/test/dir',
        verbose: true,
      });

      expect(result).toContain('MCP tool test-tool executed successfully');
      expect(result).toContain('Tool executed successfully');
      
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/tools/test-tool',
        {
          params: { param1: 'value1' },
        }
      );
      
      expect(consoleSpy).toHaveBeenCalledWith('Using MCP tool: test-tool');
      expect(consoleSpy).toHaveBeenCalledWith('Parameters:', '{"param1": "value1"}');

      // Restore console.log
      consoleSpy.mockRestore();
    });

    it('should handle errors from MCP server', async () => {
      // Set MCP server URL
      setMcpServerUrl('http://localhost:3000');
      
      // Mock axios.post to throw an error with response data
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { error: 'Tool execution failed' },
      };
      (axios.post as jest.Mock).mockRejectedValue(axiosError);

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await useMcpTool({
        toolUse: {
          name: 'use_mcp_tool',
          params: {
            tool: 'test-tool',
          },
        },
        cwd: '/test/dir',
        verbose: false,
      });

      expect(result).toContain('Error using MCP tool test-tool:');
      expect(result).toContain('Tool execution failed');
      
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('accessMcpResource', () => {
    it('should return an error if path is missing', async () => {
      const result = await accessMcpResource({
        toolUse: {
          name: 'access_mcp_resource',
          params: {},
        },
        cwd: '/test/dir',
        verbose: false,
      });

      expect(result).toContain('Error: Missing required parameter "path"');
    });

    it('should return an error if MCP server URL is not set', async () => {
      const result = await accessMcpResource({
        toolUse: {
          name: 'access_mcp_resource',
          params: {
            path: 'test-resource',
          },
        },
        cwd: '/test/dir',
        verbose: false,
      });

      expect(result).toContain('Error: MCP server URL not set');
    });

    it('should access MCP resource successfully', async () => {
      // Set MCP server URL
      setMcpServerUrl('http://localhost:3000');
      
      // Mock axios.get to return a successful response
      (axios.get as jest.Mock).mockResolvedValue({
        data: { resource: 'Resource data' },
      });

      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await accessMcpResource({
        toolUse: {
          name: 'access_mcp_resource',
          params: {
            path: 'test-resource',
          },
        },
        cwd: '/test/dir',
        verbose: true,
      });

      expect(result).toContain('MCP resource test-resource accessed successfully');
      expect(result).toContain('Resource data');
      
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3000/resources/test-resource'
      );
      
      expect(consoleSpy).toHaveBeenCalledWith('Accessing MCP resource: test-resource');

      // Restore console.log
      consoleSpy.mockRestore();
    });

    it('should handle errors when accessing MCP resource', async () => {
      // Set MCP server URL
      setMcpServerUrl('http://localhost:3000');
      
      // Mock axios.get to throw an error with response data
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { error: 'Resource not found' },
      };
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await accessMcpResource({
        toolUse: {
          name: 'access_mcp_resource',
          params: {
            path: 'test-resource',
          },
        },
        cwd: '/test/dir',
        verbose: false,
      });

      expect(result).toContain('Error accessing MCP resource test-resource:');
      expect(result).toContain('Resource not found');
      
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('MCP Server URL Management', () => {
    it('should set and get MCP server URL', () => {
      // Initially null
      expect(getMcpServerUrl()).toBeNull();
      
      // Set URL
      setMcpServerUrl('http://localhost:3000');
      expect(getMcpServerUrl()).toBe('http://localhost:3000');
      
      // Reset URL
      setMcpServerUrl(null);
      expect(getMcpServerUrl()).toBeNull();
    });
  });
});
