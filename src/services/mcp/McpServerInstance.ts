import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"
import { McpServer } from "./McpServer"
import { ClineProvider } from "../../core/webview/ClineProvider"
import { getWorkspacePath } from "../../utils/path"

/**
 * Manages the MCP server instance for Roo Code
 * Ensures only one MCP server is running at a time
 */
export class McpServerInstance {
    private static instance: McpServer | null = null
    private static readonly CONFIG_FILE_NAME = "roo-code-mcp-server.json"
    private static initializationPromise: Promise<McpServer> | null = null

    /**
     * Get the singleton MCP server instance
     * Creates a new instance if one doesn't exist
     */
    static async getInstance(
        context: vscode.ExtensionContext,
        provider: ClineProvider,
        outputChannel: vscode.OutputChannel
    ): Promise<McpServer> {
        // If we already have an instance, return it
        if (this.instance) {
            return this.instance
        }

        // If initialization is in progress, wait for it
        if (this.initializationPromise) {
            return this.initializationPromise
        }

        // Create a new initialization promise
        this.initializationPromise = (async () => {
            try {
                // Double-check instance in case it was created while we were waiting
                if (!this.instance) {
                    // Load configuration
                    const config = await this.loadConfig()
                    
                    // Create the MCP server
                    this.instance = new McpServer(
                        provider,
                        outputChannel,
                        config.transportType
                    )
                    
                    // Log server creation
                    outputChannel.appendLine("Roo Code MCP Server started")
                }
                return this.instance
            } finally {
                // Clear the initialization promise after completion or error
                this.initializationPromise = null
            }
        })()

        return this.initializationPromise
    }

    /**
     * Load MCP server configuration from file
     */
    private static async loadConfig(): Promise<{
        transportType: "stdio" | "sse"
        // Add other configuration options as needed
    }> {
        try {
            const configPath = path.join(getWorkspacePath(), this.CONFIG_FILE_NAME)
            const configExists = await fs.stat(configPath).catch(() => false)
            
            if (configExists) {
                const configContent = await fs.readFile(configPath, "utf-8")
                return JSON.parse(configContent)
            }
        } catch (error) {
            console.error("Failed to load MCP server config:", error)
        }
        
        // Default configuration
        return {
            transportType: "stdio"
        }
    }

    /**
     * Save MCP server configuration to file
     */
    static async saveConfig(config: {
        transportType: "stdio" | "sse"
        // Add other configuration options as needed
    }): Promise<void> {
        try {
            const configPath = path.join(getWorkspacePath(), this.CONFIG_FILE_NAME)
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8")
        } catch (error) {
            console.error("Failed to save MCP server config:", error)
            throw error
        }
    }

    /**
     * Clean up the singleton instance and all its resources
     */
    static async cleanup(): Promise<void> {
        if (this.instance) {
            await this.instance.dispose()
            this.instance = null
        }
    }
}
