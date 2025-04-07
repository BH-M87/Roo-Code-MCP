/**
 * MCP Server Bridge
 *
 * This script acts as a bridge between the MCP client and the Roo Code MCP server.
 * It forwards stdin/stdout between the client and server.
 *
 * This is needed because the MCP server in Roo Code is running inside VS Code,
 * and we need a way to communicate with it from an external process.
 */

const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")
const net = require("net")

// Create a temporary file to store logs
const tempFile = path.join(os.tmpdir(), `roo-code-mcp-bridge-${Date.now()}.log`)

// Log function to both console and file
function log(message) {
	const timestamp = new Date().toISOString()
	const logMessage = `[${timestamp}] ${message}`
	console.error(logMessage) // Use stderr for logs to avoid interfering with stdout communication
	fs.appendFileSync(tempFile, `${logMessage}\n`)
}

log("MCP Server Bridge starting...")

// Path to VS Code's CLI executable
const getVSCodePath = () => {
	switch (process.platform) {
		case "darwin":
			return "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
		case "win32":
			return path.join(process.env.LOCALAPPDATA, "Programs", "Microsoft VS Code", "bin", "code.cmd")
		case "linux":
			return "/usr/bin/code"
		default:
			throw new Error(`Unsupported platform: ${process.platform}`)
	}
}

// Directly start the bridge process
// The MCP server should already be running in VS Code
startBridge()

function startBridge() {
	log("Starting bridge process...")

	// First, ensure the MCP server is running by sending a command to VS Code
	log("Starting MCP server in VS Code...")
	const startServerProcess = spawn(getVSCodePath(), ["--no-sandbox", "--command", "roo-cline.startMcpServer"])

	// Give the server a moment to start
	setTimeout(() => {
		log("Connecting to MCP server...")

		// Start VS Code with the extension loaded in stdio mode for MCP
		const vscode = spawn(getVSCodePath(), ["--no-sandbox", "--extensionDevelopmentPath=.", "--stdio"])

		// Log VS Code's output for debugging
		vscode.stdout.on("data", (data) => {
			log(`[VS Code stdout] ${data.toString().trim()}`)
		})

		vscode.stderr.on("data", (data) => {
			log(`[VS Code stderr] ${data.toString().trim()}`)
		})

		// Forward stdin/stdout between the client and server
		process.stdin.pipe(vscode.stdin)
		vscode.stdout.pipe(process.stdout)

		// Handle errors
		vscode.on("error", (error) => {
			log(`Bridge process error: ${error.message}`)
			process.exit(1)
		})

		// Handle process exit
		vscode.on("close", (code) => {
			log(`Bridge process exited with code ${code}`)
			process.exit(code)
		})

		// Handle signals
		;["SIGINT", "SIGTERM"].forEach((signal) => {
			process.on(signal, () => {
				log(`Received ${signal}, shutting down...`)
				vscode.kill()
				process.exit()
			})
		})

		// Handle our own process exit
		process.on("exit", () => {
			log("Bridge process exiting...")
			vscode.kill()
			try {
				// Keep the log file for debugging
				log(`Log file available at: ${tempFile}`)
			} catch (error) {
				// Ignore errors
			}
		})
	}, 2000) // Wait 2 seconds for the server to start
}
