import { McpServerManager } from '../server';
import { setMcpServerUrl, getMcpServerUrl } from '../../core/tools/mcpTool';
import { isPortInUse, killProcessOnPort } from '../../utils/network';
import express from 'express';

// Mock dependencies
jest.mock('../../core/tools/mcpTool', () => ({
  setMcpServerUrl: jest.fn(),
  getMcpServerUrl: jest.fn(),
}));

jest.mock('../../utils/network', () => ({
  isPortInUse: jest.fn(),
  killProcessOnPort: jest.fn(),
}));

jest.mock('express', () => {
  const mockExpress = jest.fn(() => ({
    use: jest.fn(),
    get: jest.fn(),
    listen: jest.fn().mockReturnValue({
      close: jest.fn(),
    }),
  }));
  mockExpress.json = jest.fn();
  return mockExpress;
});

jest.mock('../../utils/console', () => ({
  printMessage: jest.fn(),
}));

describe('MCP Server Manager', () => {
  let serverManager: McpServerManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    serverManager = new McpServerManager(3000);
  });

  describe('start', () => {
    it('should start the server successfully', async () => {
      // Mock isPortInUse to return false (port is available)
      (isPortInUse as jest.Mock).mockResolvedValue(false);
      
      // Mock express app
      const mockApp = express();
      const mockServer = mockApp.listen(3000);
      
      // Call start method
      const result = await serverManager.start();
      
      // Verify result
      expect(result).toBe(true);
      expect(express).toHaveBeenCalled();
      expect(mockApp.use).toHaveBeenCalled();
      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
      expect(setMcpServerUrl).toHaveBeenCalledWith('http://localhost:3000');
    });

    it('should kill existing process if port is in use', async () => {
      // Mock isPortInUse to return true (port is in use)
      (isPortInUse as jest.Mock).mockResolvedValue(true);
      
      // Mock killProcessOnPort to succeed
      (killProcessOnPort as jest.Mock).mockResolvedValue(true);
      
      // Mock express app
      const mockApp = express();
      const mockServer = mockApp.listen(3000);
      
      // Call start method
      const result = await serverManager.start();
      
      // Verify result
      expect(result).toBe(true);
      expect(isPortInUse).toHaveBeenCalledWith(3000);
      expect(killProcessOnPort).toHaveBeenCalledWith(3000);
      expect(express).toHaveBeenCalled();
      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it('should return true if server is already running', async () => {
      // Start server first
      (isPortInUse as jest.Mock).mockResolvedValue(false);
      await serverManager.start();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Try to start again
      const result = await serverManager.start();
      
      // Verify result
      expect(result).toBe(true);
      expect(express).not.toHaveBeenCalled(); // Should not create a new server
    });

    it('should handle errors during server start', async () => {
      // Mock express.listen to throw an error
      const mockApp = express();
      (mockApp.listen as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to start server');
      });
      
      // Call start method
      const result = await serverManager.start();
      
      // Verify result
      expect(result).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop the server successfully', async () => {
      // Start server first
      (isPortInUse as jest.Mock).mockResolvedValue(false);
      await serverManager.start();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Call stop method
      const result = await serverManager.stop();
      
      // Verify result
      expect(result).toBe(true);
      expect(setMcpServerUrl).toHaveBeenCalledWith(null);
    });

    it('should return true if server is not running', async () => {
      // Call stop method without starting the server
      const result = await serverManager.stop();
      
      // Verify result
      expect(result).toBe(true);
      expect(setMcpServerUrl).not.toHaveBeenCalled();
    });

    it('should handle errors during server stop', async () => {
      // Start server first
      (isPortInUse as jest.Mock).mockResolvedValue(false);
      await serverManager.start();
      
      // Mock server.close to throw an error
      const mockApp = express();
      const mockServer = mockApp.listen(3000);
      (mockServer.close as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to stop server');
      });
      
      // Call stop method
      const result = await serverManager.stop();
      
      // Verify result
      expect(result).toBe(false);
    });
  });

  describe('restart', () => {
    it('should restart the server successfully', async () => {
      // Mock stop and start methods
      jest.spyOn(serverManager, 'stop').mockResolvedValue(true);
      jest.spyOn(serverManager, 'start').mockResolvedValue(true);
      
      // Call restart method
      const result = await serverManager.restart();
      
      // Verify result
      expect(result).toBe(true);
      expect(serverManager.stop).toHaveBeenCalled();
      expect(serverManager.start).toHaveBeenCalled();
    });

    it('should return false if stop fails', async () => {
      // Mock stop to fail and start to succeed
      jest.spyOn(serverManager, 'stop').mockResolvedValue(false);
      jest.spyOn(serverManager, 'start').mockResolvedValue(true);
      
      // Call restart method
      const result = await serverManager.restart();
      
      // Verify result
      expect(result).toBe(false);
      expect(serverManager.stop).toHaveBeenCalled();
      expect(serverManager.start).not.toHaveBeenCalled();
    });

    it('should return false if start fails', async () => {
      // Mock stop to succeed and start to fail
      jest.spyOn(serverManager, 'stop').mockResolvedValue(true);
      jest.spyOn(serverManager, 'start').mockResolvedValue(false);
      
      // Call restart method
      const result = await serverManager.restart();
      
      // Verify result
      expect(result).toBe(false);
      expect(serverManager.stop).toHaveBeenCalled();
      expect(serverManager.start).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return correct status when server is running', async () => {
      // Start server first
      (isPortInUse as jest.Mock).mockResolvedValue(false);
      await serverManager.start();
      
      // Call getStatus method
      const status = serverManager.getStatus();
      
      // Verify result
      expect(status).toEqual({
        running: true,
        port: 3000,
        url: 'http://localhost:3000',
      });
    });

    it('should return correct status when server is not running', async () => {
      // Call getStatus method without starting the server
      const status = serverManager.getStatus();
      
      // Verify result
      expect(status).toEqual({
        running: false,
        port: 3000,
        url: null,
      });
    });
  });
});
