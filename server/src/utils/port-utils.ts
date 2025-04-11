import * as net from "net"
import { exec } from "child_process"

/**
 * Check if a port is in use
 * @param port The port to check
 * @returns A promise that resolves to true if the port is in use, false otherwise
 */
export async function isPortInUse(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer()
		server.once("error", (err: any) => {
			if (err.code === "EADDRINUSE") {
				resolve(true)
			} else {
				resolve(false)
			}
		})
		server.once("listening", () => {
			server.close()
			resolve(false)
		})
		server.listen(port)
	})
}

/**
 * Find and kill process using a specific port (platform specific)
 * @param port The port to free up
 * @param logger Optional logger for logging messages
 * @returns A promise that resolves when the process is killed
 */
export async function killProcessOnPort(
	port: number,
	logger?: { log: (message: string) => void; error: (message: string) => void }
): Promise<void> {
	return new Promise((resolve) => {
		let command = ""

		// Different commands based on platform
		if (process.platform === "win32") {
			// Windows
			command = `FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') DO TaskKill /PID %P /F`
		} else {
			// macOS/Linux
			command = `lsof -i :${port} -t | xargs kill -9`
		}

		exec(command, (error) => {
			if (error) {
				if (logger) {
					logger.error(`Failed to kill process on port ${port}: ${error.message}`)
				} else {
					console.error(`Failed to kill process on port ${port}: ${error.message}`)
				}
				// Don't reject as the process might not exist
			}
			
			if (logger) {
				logger.log(`Attempted to kill process on port ${port}`)
			} else {
				console.log(`Attempted to kill process on port ${port}`)
			}
			
			// Give a small delay to ensure the port is released
			setTimeout(resolve, 500)
		})
	})
}
