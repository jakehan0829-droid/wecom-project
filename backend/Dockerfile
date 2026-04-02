# 多阶段构建：构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建TypeScript
RUN npm run build

# 生产运行阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 安装生产依赖（不包括devDependencies）
COPY package*.json ./
RUN npm ci --only=production

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/infra/config/env.example.js ./src/infra/config/env.example.js

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode === 200) process.exit(0); else process.exit(1)}).on('error', () => process.exit(1))"

# 启动应用
CMD ["node", "dist/main.js"]