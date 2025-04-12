import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Execute a command and return the output
 * @param command Command to execute
 * @param cwd Working directory
 * @returns Command output
 */
export async function executeCommand(command: string, cwd?: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stderr) {
      console.error(chalk.yellow(`Command stderr: ${stderr}`));
    }
    return stdout;
  } catch (error) {
    console.error(chalk.red(`Error executing command: ${command}`), error);
    throw error;
  }
}

/**
 * Execute a command interactively
 * @param command Command to execute
 * @param cwd Working directory
 * @returns Promise that resolves when the command completes
 */
export function executeInteractiveCommand(command: string, cwd?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const process = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Print a message to the console
 * @param message Message to print
 * @param type Message type
 */
export function printMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  switch (type) {
    case 'info':
      console.log(chalk.blue(message));
      break;
    case 'success':
      console.log(chalk.green(message));
      break;
    case 'warning':
      console.log(chalk.yellow(message));
      break;
    case 'error':
      console.error(chalk.red(message));
      break;
  }
}
