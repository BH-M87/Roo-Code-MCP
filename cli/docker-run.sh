#!/bin/bash

# 设置默认值
WORKSPACE_PATH=${WORKSPACE_PATH:-$(pwd)/workspace}
COMMAND=${@:-"--help"}

# 创建工作区目录（如果不存在）
mkdir -p "$WORKSPACE_PATH"

# 设置环境变量
export WORKSPACE_PATH

# 构建 Docker 镜像
echo "Building Docker image..."
docker-compose build

# 运行 Roo CLI
echo "Running Roo CLI with command: $COMMAND"
echo "Using workspace: $WORKSPACE_PATH"
docker-compose run --rm roo-cli $COMMAND
