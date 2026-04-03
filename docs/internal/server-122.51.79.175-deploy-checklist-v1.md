# 122.51.79.175 部署准备清单 v1

## 1. 服务器基础信息确认
- 操作系统版本
- CPU / 内存 / 磁盘
- 是否允许重装
- 当前是否已有业务占用 80/443/5432/6379 端口

## 2. 基础依赖
- Docker / Docker Compose
- Git
- Node.js（如需宿主机运行）
- Nginx（如需反向代理）

## 3. 部署资源
- 项目代码目录
- `.env` 正式配置
- 域名解析（如 `moshengyuan.com` 子域）
- SSL 证书方案

## 4. 服务清单
- postgres
- redis
- backend
- nginx（可选）

## 5. 上线顺序
1. 准备系统环境
2. 安装 Docker / Compose
3. 拉取项目代码
4. 配置 `.env`
5. 启动 postgres / redis
6. 执行数据库初始化
7. 启动 backend
8. 验证健康检查与 API
9. 配置域名与反向代理

## 6. 上线前检查
- `/health` 可访问
- patient API 可用
- wecom binding API 可用
- dashboard overview 可用
- 数据库可连通
- 日志可查看
