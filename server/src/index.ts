import express from "express"
import cors from "cors"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { initializeBridge, setLogger as setBridgeLogger } from "./vscode-bridge"
import { parseMessage, stringifyMessage, MessageType } from "./communication"
import { Logger } from "./server-manager"
import { isPortInUse, killProcessOnPort } from "./utils/port-utils"

// Create a default logger that uses console
let logger: Logger = {
	log: (message: string) => console.log(message),
	error: (message: string) => console.error(message),
}

// Function to set the logger from outside
export function setLogger(newLogger: Logger): void {
	logger = newLogger
	logger.log("Logger set in MCP server")

	// Also set the logger in vscode-bridge
	try {
		setBridgeLogger(newLogger)
	} catch (error) {
		logger.error(`Failed to set logger in vscode-bridge: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// Create Express app
const app = express()
app.use(cors())

// Create MCP server
const server = new Server(
	{
		name: "roo-code-mcp",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
)

let transport: SSEServerTransport | null = null

// Initialize the bridge between VSCode and the MCP server
initializeBridge()

// Set up process message handling for communication with VSCode extension
process.on("message", (message) => {
	if (typeof message === "string") {
		try {
			const parsedMessage = parseMessage(message)
			if (parsedMessage) {
				logger.log(`Received message from extension: ${parsedMessage.type}`)
			}
		} catch (error) {
			logger.error(
				`Error parsing message from extension: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
})

// Send a startup message to the extension
if (process.send) {
	process.send(
		stringifyMessage({
			type: MessageType.GET_COMMANDS,
		}),
	)
	logger.log("Sent GET_COMMANDS message to extension")
} else {
	logger.error("Cannot communicate with VSCode extension: process.send is not available")
}

// Set up SSE endpoint
app.get("/sse", async (req: express.Request, res: express.Response) => {
	logger.log("Client connected to SSE endpoint")

	// Create new transport
	transport = new SSEServerTransport("/messages", res)

	// Connect server to transport
	await server
		.connect(transport)
		.then(() => {
			logger.log("Server successfully connected to transport")

			// Send a welcome message to confirm the connection is working
			// setTimeout(() => {
			// 	if (transport) {
			// 		try {
			// 			logger.log("Sent connected event to client")

			// 			// Start sending heartbeats to keep the connection alive
			// 			startHeartbeat(res)
			// 		} catch (err) {
			// 			logger.error(
			// 				`Error sending connected event: ${err instanceof Error ? err.message : String(err)}`,
			// 			)
			// 		}
			// 	}
			// }, 100) // Small delay to ensure everything is set up
		})
		.catch((error) => {
			logger.error(
				`Failed to connect server to transport: ${error instanceof Error ? error.message : String(error)}`,
			)
		})

	// Handle client disconnect
	req.on("close", () => {
		logger.log("Client disconnected from SSE endpoint")
	})
})

// Handle client-to-server messages
app.post("/messages", async (req: express.Request, res: express.Response) => {
	if (!transport) {
		logger.error("Transport not initialized")
		return
	}
	await transport.handlePostMessage(req, res)
})

// Health check endpoint
app.get("/health", (_req: express.Request, res: express.Response) => {
	res.json({
		status: "ok",
		connected: transport !== null,
		version: "1.0.0",
		name: "roo-code-mcp",
	})
})

// API info endpoint
app.get("/", (_req: express.Request, res: express.Response) => {
	res.json({
		name: "Roo Code MCP Server",
		version: "1.0.0",
		description: "MCP server for Roo Code VSCode extension",
		endpoints: [
			{ path: "/sse", description: "SSE endpoint for MCP communication" },
			{ path: "/messages", description: "Endpoint for client-to-server messages" },
			{ path: "/health", description: "Health check endpoint" },
		],
	})
})

// Start server
const PORT = process.env.PORT || 5201

// Export the app and server for use in the extension
export { app, server }

/**
 * Start the server with port conflict handling
 */
async function startServer(port: number): Promise<void> {
	try {
		// Check if port is in use
		const portInUse = await isPortInUse(port)

		if (portInUse) {
			logger.log(`Port ${port} is already in use. Attempting to terminate the existing process...`)
			await killProcessOnPort(port, logger)

			// Check again after killing
			const stillInUse = await isPortInUse(port)
			if (stillInUse) {
				logger.error(
					`Port ${port} is still in use after attempting to kill the process. Please close the application using this port.`,
				)
				return
			}
		}

		// Start the server
		app.listen(port, () => {
			logger.log(`MCP server running on http://localhost:${port}`)
		})
	} catch (error) {
		logger.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// Only start the server if this file is run directly
if (require.main === module) {
	startServer(Number(PORT))
}
