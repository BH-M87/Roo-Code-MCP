import { server } from './index';
import {
  CallToolRequestSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

// This module acts as a bridge between the VSCode extension and the MCP server
// It allows the VSCode extension to register handlers for MCP tools

type ToolHandler = (args: any) => Promise<any>;

const toolHandlers: Record<string, ToolHandler> = {};

/**
 * Register a handler for a tool
 * @param toolName The name of the tool
 * @param handler The handler function
 */
export function registerToolHandler(toolName: string, handler: ToolHandler): void {
  toolHandlers[toolName] = handler;
}

/**
 * Initialize the bridge
 */
export function initializeBridge(): void {
  // Override the CallToolRequestSchema handler to use our registered handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    const handler = toolHandlers[name];
    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: `No handler registered for tool: ${name}`,
          },
        ],
        isError: true,
      };
    }
    
    try {
      const result = await handler(args);
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });
}
