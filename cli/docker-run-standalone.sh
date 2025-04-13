#!/bin/bash

# 设置默认值
WORKSPACE_PATH=${WORKSPACE_PATH:-$(pwd)/workspace}
COMMAND=${@:-"--help"}
IMAGE_NAME="roo-cli"
CONTAINER_NAME="roo-cli-container"
PORT=${PORT:-3000}

# 显示帮助信息
show_help() {
  echo "Roo CLI Docker 启动脚本"
  echo ""
  echo "用法: $0 [选项] [命令]"
  echo ""
  echo "选项:"
  echo "  --build                  构建 Docker 镜像"
  echo "  --mcp-server             启动 MCP 服务器"
  echo "  --port <端口>            指定 MCP 服务器端口 (默认: 3000)"
  echo "  --workspace <路径>       指定工作区路径 (默认: ./workspace)"
  echo "  --openai-key <密钥>      设置 OpenAI API 密钥"
  echo "  --anthropic-key <密钥>   设置 Anthropic API 密钥"
  echo "  --help                   显示此帮助信息"
  echo ""
  echo "环境变量:"
  echo "  WORKSPACE_PATH           工作区路径"
  echo "  PORT                     MCP 服务器端口"
  echo "  OPENAI_API_KEY           OpenAI API 密钥"
  echo "  ANTHROPIC_API_KEY        Anthropic API 密钥"
  echo ""
  echo "示例:"
  echo "  $0 --build                                  # 构建 Docker 镜像"
  echo "  $0 new \"创建一个 Node.js 服务器\" --mode code  # 创建新任务"
  echo "  $0 --mcp-server                             # 启动 MCP 服务器"
  echo "  $0 --workspace /path/to/workspace new \"...\" # 指定工作区路径"
  echo ""
  exit 0
}

# 解析命令行参数
BUILD_IMAGE=false
START_MCP_SERVER=false
OPENAI_API_KEY=${OPENAI_API_KEY:-""}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-""}
ROO_COMMAND=""

while [[ $# -gt 0 ]]; do
  case "$1" in
  --build)
    BUILD_IMAGE=true
    shift
    ;;
  --mcp-server)
    START_MCP_SERVER=true
    shift
    ;;
  --port)
    PORT="$2"
    shift 2
    ;;
  --workspace)
    WORKSPACE_PATH="$2"
    shift 2
    ;;
  --openai-key)
    OPENAI_API_KEY="$2"
    shift 2
    ;;
  --anthropic-key)
    ANTHROPIC_API_KEY="$2"
    shift 2
    ;;
  --help)
    show_help
    ;;
  *)
    # 收集剩余参数作为 roo 命令
    if [ -z "$ROO_COMMAND" ]; then
      ROO_COMMAND="$1"
    else
      ROO_COMMAND="$ROO_COMMAND $1"
    fi
    shift
    ;;
  esac
done

# 创建工作区目录（如果不存在）
mkdir -p "$WORKSPACE_PATH"
echo "使用工作区: $WORKSPACE_PATH"

# 构建 Docker 镜像
if [ "$BUILD_IMAGE" = true ]; then
  echo "构建 Docker 镜像..."
  docker build -t "$IMAGE_NAME" .
  echo "Docker 镜像构建完成"
  exit 0
fi

# 检查镜像是否存在，如果不存在则构建
if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
  echo "Docker 镜像不存在，正在构建..."
  docker build -t "$IMAGE_NAME" .
fi

# 设置环境变量参数
ENV_PARAMS=()
if [ -n "$OPENAI_API_KEY" ]; then
  ENV_PARAMS+=(-e "OPENAI_API_KEY=$OPENAI_API_KEY")
fi
if [ -n "$ANTHROPIC_API_KEY" ]; then
  ENV_PARAMS+=(-e "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
fi

# 启动 MCP 服务器
if [ "$START_MCP_SERVER" = true ]; then
  echo "启动 MCP 服务器，端口: $PORT..."

  # 检查端口是否已被使用
  if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null; then
    echo "警告: 端口 $PORT 已被占用"
    read -p "是否尝试停止现有容器并继续? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      # 尝试停止并移除现有容器
      docker stop "$CONTAINER_NAME" 2>/dev/null || true
      docker rm "$CONTAINER_NAME" 2>/dev/null || true
    else
      echo "操作已取消"
      exit 1
    fi
  fi

  # 启动 MCP 服务器
  docker run --rm -it \
    --name "$CONTAINER_NAME" \
    -v "$WORKSPACE_PATH:/workspace" \
    -p "$PORT:$PORT" \
    "${ENV_PARAMS[@]}" \
    -w /workspace \
    "$IMAGE_NAME" mcp-start --port "$PORT"

  exit 0
fi

# 运行 Roo CLI 命令
if [ -n "$ROO_COMMAND" ]; then
  echo "运行命令: $ROO_COMMAND"

  docker run --rm -it \
    --name "$CONTAINER_NAME" \
    -v "$WORKSPACE_PATH:/workspace" \
    "${ENV_PARAMS[@]}" \
    -w /workspace \
    "$IMAGE_NAME" $ROO_COMMAND
else
  # 如果没有提供命令，显示帮助信息
  show_help
fi
