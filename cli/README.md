# Roo CLI

A command-line interface for RooCode, allowing you to execute AI tasks from the terminal.

## Installation

### Local Installation

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Link the CLI globally (optional)
pnpm link
```

### Docker Installation

You can also run Roo CLI using Docker:

```bash
# Clone the repository
git clone https://github.com/your-username/roo-code-mcp.git
cd roo-code-mcp/cli

# Build the Docker image
docker-compose build
```

## Usage

### Running with Docker

#### Using docker-compose

You can use the provided scripts to run Roo CLI with docker-compose:

```bash
# Run a command (e.g., show help)
./docker-run.sh --help

# Create a new task
./docker-run.sh new "Write a function to calculate the Fibonacci sequence" --mode code

# Specify a custom workspace directory
WORKSPACE_PATH=/path/to/your/workspace ./docker-run.sh new "Create a Node.js server"

# Start the MCP server
./docker-mcp-server.sh

# Start the MCP server on a specific port
PORT=3001 ./docker-mcp-server.sh
```

You can also use docker-compose directly:

```bash
# Run a command
docker-compose run --rm roo-cli new "Write a function" --mode code

# Mount a specific workspace directory
WORKSPACE_PATH=/path/to/your/workspace docker-compose run --rm roo-cli new "Create a Node.js server"
```

#### Using Docker Standalone

If you prefer not to use docker-compose, you can use the standalone Docker script:

```bash
# Build the Docker image
./docker-run-standalone.sh --build

# Show help information
./docker-run-standalone.sh --help

# Create a new task
./docker-run-standalone.sh new "Write a function to calculate the Fibonacci sequence" --mode code

# Specify a custom workspace directory
./docker-run-standalone.sh --workspace /path/to/your/workspace new "Create a Node.js server"

# Start the MCP server
./docker-run-standalone.sh --mcp-server

# Start the MCP server on a specific port
./docker-run-standalone.sh --mcp-server --port 3001

# Set API keys
./docker-run-standalone.sh --openai-key "your-api-key" --anthropic-key "your-api-key" new "Your prompt"
```

### Creating a New Task

```bash
# Basic usage
roo new "Write a function to calculate the Fibonacci sequence"

# Specify a mode
roo new "Write a function to calculate the Fibonacci sequence" --mode code

# Specify a workspace directory
roo new "Write a function to calculate the Fibonacci sequence" --workspace /path/to/project

# Use a custom configuration file
roo new "Write a function to calculate the Fibonacci sequence" --config-file path/to/config.json

# Use OpenAI API
roo new "Write a function to calculate the Fibonacci sequence" --api-provider openai --openai-api-key your-api-key --openai-base-url https://api.openai.com/v1 --openai-model gpt-4

# Use Anthropic API
roo new "Write a function to calculate the Fibonacci sequence" --api-provider anthropic --anthropic-api-key your-api-key --anthropic-model claude-3-5-sonnet-20241022
```

### Continuous Execution Mode

Continuous execution mode allows the AI to automatically execute multiple steps to complete a task without requiring user intervention between each step.

```bash
# Enable continuous execution mode
roo new "Create a simple Node.js HTTP server" --continuous

# Specify maximum number of steps
roo new "Create a simple Node.js HTTP server" --continuous --max-steps 5

# Enable verbose output
roo new "Create a simple Node.js HTTP server" --continuous --verbose
```

### Using Tools

```bash
# List available tools
roo tools

# List available tools in a specific mode
roo tools --mode code

# Execute a tool
roo tool read_file --params '{"path": "src/index.js"}'

# Execute a tool with verbose output
roo tool execute_command --params '{"command": "ls -la"}' --verbose

# Execute a tool in a specific directory
roo tool list_files --params '{"path": ".", "recursive": "true"}' --cwd /path/to/directory
```

### MCP Server

The MCP (Model Context Protocol) server allows external clients to control Roo CLI using the MCP protocol.

```bash
# Start the MCP server
roo mcp-start

# Start the MCP server on a specific port
roo mcp-start --port 3001

# Stop the MCP server
roo mcp-stop

# Restart the MCP server
roo mcp-restart

# Check the MCP server status
roo mcp-status
```

### Starting the Server

```bash
# Start the server on the default port (3000)
roo server

# Specify a custom port
roo server --port 8080
```

## Configuration Files

The CLI uses several configuration files:

- `.rooTask`: Task configuration
- `.rooProviderProfiles`: AI provider settings
- `.rooSettings`: Global settings
- `.rooModes`: Custom modes

### Task Configuration (`.rooTask`)

```json
{
	"mode": "code",
	"message": "Write a function to calculate the Fibonacci sequence",
	"cwd": "/path/to/working/directory"
}
```

### Provider Profiles (`.rooProviderProfiles`)

```json
{
	"currentApiConfigName": "default",
	"apiConfigs": {
		"default": {
			"apiProvider": "anthropic",
			"anthropicApiKey": "your-api-key",
			"anthropicModelId": "claude-3-5-sonnet-20241022",
			"id": "default"
		},
		"openai": {
			"apiProvider": "openai",
			"openAiApiKey": "your-api-key",
			"openAiBaseUrl": "https://api.openai.com/v1",
			"openAiModelId": "gpt-4",
			"id": "openai"
		}
	}
}
```

### Global Settings (`.rooSettings`)

```json
{
	"autoApprovalEnabled": true,
	"alwaysAllowReadOnly": true,
	"alwaysAllowWrite": true,
	"alwaysAllowExecute": true,
	"allowedCommands": ["npm test", "npm install", "git log"],
	"customModes": [
		{
			"slug": "test",
			"name": "Test",
			"roleDefinition": "You are a testing specialist...",
			"customInstructions": "When writing tests...",
			"groups": ["read", "browser", "command"],
			"source": "project"
		}
	]
}
```

### Custom Modes (`.rooModes`)

```json
[
	{
		"slug": "translate",
		"name": "Translate",
		"roleDefinition": "You are a linguistic specialist...",
		"groups": ["read", "command"],
		"source": "project"
	}
]
```

## API Server

When running the server, the following endpoints are available:

- `GET /health`: Health check
- `POST /api/task`: Execute a task
- `GET /api/config`: Get current configuration
- `POST /api/config/api`: Update API configuration
- `POST /api/config/settings`: Update global settings
- `POST /api/config/modes`: Update custom modes
- `POST /api/config/mode`: Set current mode

### Example: Execute a Task

```bash
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a function to calculate the Fibonacci sequence",
    "mode": "code"
  }'
```

## Environment Variables

You can use a `.env` file to configure the CLI:

```env
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_ID=gpt-4

# For Docker
WORKSPACE_PATH=/path/to/your/workspace
PORT=3000
```

When using Docker, you can pass environment variables directly to docker-compose:

```bash
OPENAI_API_KEY=your-api-key WORKSPACE_PATH=/path/to/workspace docker-compose run --rm roo-cli new "Your prompt"
```

## License

MIT
