import { isPortInUse, killProcessOnPort } from '../network';
import { exec } from 'child_process';
import * as os from 'os';

// Mock child_process and os
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('os', () => ({
  platform: jest.fn(),
}));

describe('Network Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPortInUse', () => {
    it('should check if port is in use on macOS', async () => {
      // Mock os.platform to return 'darwin'
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      // Mock exec to return a process ID (port is in use)
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: '12345' });
        return { stdout: '12345' };
      });

      const result = await isPortInUse(3000);
      
      expect(result).toBe(true);
      expect(os.platform).toHaveBeenCalled();
      expect(exec).toHaveBeenCalledWith('lsof -i:3000 -t', expect.any(Function));
    });

    it('should check if port is in use on Windows', async () => {
      // Mock os.platform to return 'win32'
      (os.platform as jest.Mock).mockReturnValue('win32');
      
      // Mock exec to return a process (port is in use)
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345' });
        return { stdout: 'TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345' };
      });

      const result = await isPortInUse(3000);
      
      expect(result).toBe(true);
      expect(os.platform).toHaveBeenCalled();
      expect(exec).toHaveBeenCalledWith('netstat -ano | findstr :3000', expect.any(Function));
    });

    it('should return false if port is not in use', async () => {
      // Mock os.platform to return 'darwin'
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      // Mock exec to return empty stdout (port is not in use)
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: '' });
        return { stdout: '' };
      });

      const result = await isPortInUse(3000);
      
      expect(result).toBe(false);
    });

    it('should return false if exec command fails', async () => {
      // Mock os.platform to return 'darwin'
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      // Mock exec to throw an error
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(new Error('Command failed'), { stdout: '' });
        return { stdout: '' };
      });

      const result = await isPortInUse(3000);
      
      expect(result).toBe(false);
    });

    it('should throw an error for unsupported platforms', async () => {
      // Mock os.platform to return an unsupported platform
      (os.platform as jest.Mock).mockReturnValue('unsupported');
      
      await expect(isPortInUse(3000)).rejects.toThrow('Unsupported platform: unsupported');
    });
  });

  describe('killProcessOnPort', () => {
    it('should kill process on macOS', async () => {
      // Mock os.platform to return 'darwin'
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      // Mock exec to return a process ID and then success
      (exec as jest.Mock).mockImplementationOnce((cmd, callback) => {
        callback(null, { stdout: '12345' });
        return { stdout: '12345' };
      }).mockImplementationOnce((cmd, callback) => {
        callback(null, { stdout: '' });
        return { stdout: '' };
      });

      const result = await killProcessOnPort(3000);
      
      expect(result).toBe(true);
      expect(os.platform).toHaveBeenCalled();
      expect(exec).toHaveBeenCalledWith('lsof -i:3000 -t', expect.any(Function));
      expect(exec).toHaveBeenCalledWith('kill -9 12345', expect.any(Function));
    });

    it('should kill process on Windows', async () => {
      // Mock os.platform to return 'win32'
      (os.platform as jest.Mock).mockReturnValue('win32');
      
      // Mock exec to return a process and then success
      (exec as jest.Mock).mockImplementationOnce((cmd, callback) => {
        callback(null, { stdout: 'TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345' });
        return { stdout: 'TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345' };
      }).mockImplementationOnce((cmd, callback) => {
        callback(null, { stdout: '' });
        return { stdout: '' };
      });

      const result = await killProcessOnPort(3000);
      
      expect(result).toBe(true);
      expect(os.platform).toHaveBeenCalled();
      expect(exec).toHaveBeenCalledWith('netstat -ano | findstr :3000', expect.any(Function));
      expect(exec).toHaveBeenCalledWith('taskkill /F /PID 12345', expect.any(Function));
    });

    it('should return false if no process is found', async () => {
      // Mock os.platform to return 'darwin'
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      // Mock exec to return empty stdout (no process found)
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: '' });
        return { stdout: '' };
      });

      const result = await killProcessOnPort(3000);
      
      expect(result).toBe(false);
    });

    it('should handle errors during process killing', async () => {
      // Mock os.platform to return 'darwin'
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      // Mock exec to return a process ID and then fail
      (exec as jest.Mock).mockImplementationOnce((cmd, callback) => {
        callback(null, { stdout: '12345' });
        return { stdout: '12345' };
      }).mockImplementationOnce((cmd, callback) => {
        callback(new Error('Failed to kill process'), { stdout: '' });
        return { stdout: '' };
      });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await killProcessOnPort(3000);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should throw an error for unsupported platforms', async () => {
      // Mock os.platform to return an unsupported platform
      (os.platform as jest.Mock).mockReturnValue('unsupported');
      
      await expect(killProcessOnPort(3000)).rejects.toThrow('Unsupported platform: unsupported');
    });
  });
});
