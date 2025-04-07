/**
 * Roo Code MCP Client Example
 *
 * This is a simple example of how to use the MCP client to interact with Roo Code.
 *
 * To run this example:
 * 1. Make sure Roo Code extension is running in VS Code
 * 2. Start the MCP server using the "Roo Code MCP: Start MCP Server" command
 * 3. Run this script with Node.js
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js")
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js")
const fs = require("fs")
const path = require("path")
const os = require("os")

// Create a log file for debugging
const logFile = path.join(os.tmpdir(), `roo-code-mcp-client-${Date.now()}.log`)

// Log function to both console and file
function log(message, isError = false) {
	const timestamp = new Date().toISOString()
	const logMessage = `[${timestamp}] ${message}`

	if (isError) {
		console.error(logMessage)
	} else {
		console.log(logMessage)
	}

	fs.appendFileSync(logFile, `${logMessage}\n`)
}

async function main() {
	log("Starting Roo Code MCP Client Example")
	log(`Log file: ${logFile}`)

	// Create a client
	const client = new Client(
		{
			name: "Roo Code MCP Client Example",
			version: "0.0.1",
		},
		{
			capabilities: {},
		},
	)

	log("Creating transport to connect to MCP server via bridge script")
	// Create a transport
	// Note: This assumes the MCP server is configured to use stdio transport
	// If using SSE transport, you would use SSEClientTransport instead
	const transport = new StdioClientTransport({
		command: "node",
		args: ["./examples/mcp-server-bridge.js"], // Bridge script to connect to VS Code
		cwd: process.cwd(),
		env: process.env,
		stderr: "pipe", // Capture stderr for better error reporting
	})

	// Set up error handler for transport
	transport.onerror = (error) => {
		log(`Transport error: ${error instanceof Error ? error.message : String(error)}`, true)
	}

	try {
		// Note: We don't need to explicitly call transport.start() as client.connect() will do that for us
		log("Preparing to connect to MCP server...")

		// Set up stderr handler that will be used after connect() starts the transport
		transport.onceStarted = () => {
			if (transport.stderr) {
				transport.stderr.on("data", (data) => {
					log(`Bridge stderr: ${data.toString().trim()}`, true)
				})
			}
		}

		// Connect to the server
		log("Connecting to MCP server...")
		await client.connect(transport)
		log("Connected to Roo Code MCP server")

		// List available tools
		log("Listing available tools...")
		const tools = await client.listTools()
		log(`Available tools: ${JSON.stringify(tools, null, 2)}`)

		// Start a new task
		log("Starting a new task...")
		const result = await client.callTool("startTask", {
			prompt: "Create a simple React component that displays a counter with increment and decrement buttons",
			newTab: true,
		})

		log(`Task started: ${JSON.stringify(result, null, 2)}`)

		// Wait for user input to exit
		log("Press Enter to exit...")
		await new Promise((resolve) => process.stdin.once("data", resolve))
	} catch (error) {
		log(`Error: ${error instanceof Error ? error.stack : String(error)}`, true)
	} finally {
		// Close the connection
		// log("Closing connection...")
		// try {
		// 	await transport.close()
		// 	log("Connection closed successfully")
		// } catch (closeError) {
		// 	log(
		// 		`Error closing connection: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
		// 		true,
		// 	)
		// }
	}
}

main().catch((error) => {
	log(`Unhandled error in main: ${error instanceof Error ? error.stack : String(error)}`, true)
})
