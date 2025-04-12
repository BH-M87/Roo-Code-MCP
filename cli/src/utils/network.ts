import { exec } from "child_process"
import { promisify } from "util"
import * as os from "os"

const execAsync = promisify(exec)

/**
 * 检查端口是否被占用
 * @param port 端口号
 * @returns 是否被占用
 */
export async function isPortInUse(port: number): Promise<boolean> {
	try {
		const platform = os.platform()
		let command: string

		switch (platform) {
			case "win32":
				command = `netstat -ano | findstr :${port}`
				break
			case "darwin":
			case "linux":
				command = `lsof -i:${port} -t`
				break
			default:
				throw new Error(`Unsupported platform: ${platform}`)
		}

		const { stdout } = await execAsync(command)
		return stdout.trim().length > 0
	} catch (error) {
		// 如果命令执行失败，通常意味着端口未被使用
		return false
	}
}

/**
 * 终止占用端口的进程
 * @param port 端口号
 * @returns 是否成功终止
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
	try {
		const platform = os.platform()
		let pid: string | null = null

		// 获取进程 ID
		switch (platform) {
			case "win32": {
				const { stdout } = await execAsync(`netstat -ano | findstr :${port}`)
				const lines = stdout.trim().split("\n")
				if (lines.length > 0) {
					const lastLine = lines[0]
					const parts = lastLine.trim().split(/\s+/)
					pid = parts[parts.length - 1]
				}
				break
			}
			case "darwin":
			case "linux": {
				const { stdout } = await execAsync(`lsof -i:${port} -t`)
				pid = stdout.trim().split("\n")[0]
				break
			}
			default:
				throw new Error(`Unsupported platform: ${platform}`)
		}

		if (!pid) {
			return false
		}

		// 终止进程
		switch (platform) {
			case "win32":
				await execAsync(`taskkill /F /PID ${pid}`)
				break
			case "darwin":
			case "linux":
				await execAsync(`kill -9 ${pid}`)
				break
		}

		return true
	} catch (error) {
		console.error("Error killing process:", error)
		return false
	}
}
