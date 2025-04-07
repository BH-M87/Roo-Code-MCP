import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

// Type declarations

// Create Express app
const app = express()
app.use(cors())
app.use(bodyParser.json())

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

// Store active transport
let activeTransport: SSEServerTransport | null = null

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [],
	}
})

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args = {} } = request.params

	try {
		let result

		switch (name) {
			case "execute-command":
				result = "result of execute-command"
				break

			default:
				throw new Error(`Unknown tool: ${name}`)
		}

		return {
			content: [
				{
					type: "text",
					text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
				},
			],
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
			isError: true,
		}
	}
})

// Set up SSE endpoint
app.get("/sse", (req: express.Request, res: express.Response) => {
	console.log("Client connected to SSE endpoint")

	// Set headers for SSE
	res.setHeader("Content-Type", "text/event-stream")
	res.setHeader("Cache-Control", "no-cache")
	res.setHeader("Connection", "keep-alive")

	// Create new transport
	activeTransport = new SSEServerTransport("/messages", res)

	// Connect server to transport
	server.connect(activeTransport).catch((error) => {
		console.error("Failed to connect server to transport:", error)
	})

	// Handle client disconnect
	req.on("close", () => {
		console.log("Client disconnected from SSE endpoint")
		if (activeTransport) {
			activeTransport.close().catch((error) => {
				console.error("Error closing transport:", error)
			})
			activeTransport = null
		}
	})
})

// Handle client-to-server messages
app.post("/messages", (req: express.Request, res: express.Response) => {
	if (activeTransport) {
		activeTransport.handlePostMessage(req, res)
	} else {
		res.status(503).json({ error: "No active SSE connection" })
	}
})

// Health check endpoint
app.get("/health", (_req: express.Request, res: express.Response) => {
	res.json({ status: "ok", connected: activeTransport !== null })
})

// Start server
const PORT = process.env.PORT || 3000

// Export the app and server for use in the extension
export { app, server }

// Only start the server if this file is run directly
if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`MCP server running on http://localhost:${PORT}`)
	})
}
