#!/bin/bash

# 设置默认值
WORKSPACE_PATH=${WORKSPACE_PATH:-$(pwd)/workspace}
PORT=${PORT:-3000}

# 创建工作区目录（如果不存在）
mkdir -p "$WORKSPACE_PATH"

# 设置环境变量
export WORKSPACE_PATH

# 构建 Docker 镜像
echo "Building Docker image..."
docker-compose build

# 启动 MCP 服务器
echo "Starting MCP server on port $PORT..."
echo "Using workspace: $WORKSPACE_PATH"
docker-compose run -p $PORT:$PORT --rm roo-cli mcp-start --port $PORT
