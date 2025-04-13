FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml（如果存在）
COPY package.json ./
COPY pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 创建工作区目录
RUN mkdir -p /workspace

# 设置环境变量
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:${PATH}"

# 设置工作区目录为卷
VOLUME ["/workspace"]

# 设置入口点
ENTRYPOINT ["node", "dist/index.js"]

# 默认命令
CMD ["--help"]
