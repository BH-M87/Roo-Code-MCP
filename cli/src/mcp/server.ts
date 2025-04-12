import express from "express"
import { Server } from "http"
import { ChildProcess, spawn } from "child_process"
import { EventEmitter } from "events"
import { setMcpServerUrl } from "../core/tools/mcpTool"
import { printMessage } from "../utils/terminal"
import { isPortInUse, killProcessOnPort } from "../utils/network"

/**
 * MCP 服务器管理器
 */
export class McpServerManager extends EventEmitter {
	private server: Server | null = null
	private process: ChildProcess | null = null
	private port: number = 3000
	private isRunning: boolean = false

	/**
	 * 构造函数
	 * @param port 端口号
	 */
	constructor(port: number = 3000) {
		super()
		this.port = port
	}

	/**
	 * 启动 MCP 服务器
	 * @returns 是否成功启动
	 */
	async start(): Promise<boolean> {
		if (this.isRunning) {
			printMessage("MCP server is already running", "info")
			return true
		}

		try {
			// 检查端口是否被占用
			const portInUse = await isPortInUse(this.port)
			if (portInUse) {
				printMessage(`Port ${this.port} is already in use, attempting to kill the process...`, "warning")
				await killProcessOnPort(this.port)
			}

			// 创建 Express 应用
			const app = express()

			// 配置中间件
			app.use(express.json())

			// 配置路由
			app.get("/health", (req, res) => {
				res.json({ status: "ok" })
			})

			// 启动服务器
			this.server = app.listen(this.port, () => {
				printMessage(`MCP server started on port ${this.port}`, "success")
				this.isRunning = true

				// 设置 MCP 服务器 URL
				const serverUrl = `http://localhost:${this.port}`
				setMcpServerUrl(serverUrl)

				this.emit("started", { port: this.port, url: serverUrl })
			})

			return true
		} catch (error) {
			printMessage(
				`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			)
			return false
		}
	}

	/**
	 * 停止 MCP 服务器
	 * @returns 是否成功停止
	 */
	async stop(): Promise<boolean> {
		if (!this.isRunning) {
			printMessage("MCP server is not running", "info")
			return true
		}

		try {
			// 停止服务器
			if (this.server) {
				this.server.close()
				this.server = null
			}

			// 停止进程
			if (this.process) {
				this.process.kill()
				this.process = null
			}

			this.isRunning = false
			setMcpServerUrl(null)

			printMessage("MCP server stopped", "success")
			this.emit("stopped")

			return true
		} catch (error) {
			printMessage(
				`Failed to stop MCP server: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			)
			return false
		}
	}

	/**
	 * 重启 MCP 服务器
	 * @returns 是否成功重启
	 */
	async restart(): Promise<boolean> {
		await this.stop()
		return this.start()
	}

	/**
	 * 获取 MCP 服务器状态
	 * @returns 服务器状态
	 */
	getStatus(): { running: boolean; port: number; url: string | null } {
		return {
			running: this.isRunning,
			port: this.port,
			url: this.isRunning ? `http://localhost:${this.port}` : null,
		}
	}
}
