# 122.51.79.175 可执行部署手册 v1

## 1. 目标
在 122.51.79.175 上拉起 PostgreSQL、Redis、Backend，并完成基础 API 验证。

## 2. 服务器准备
1. 登录服务器
2. 确认系统版本与端口占用
3. 安装 Docker 与 Docker Compose
4. 安装 Git

## 3. 部署步骤
1. 创建项目目录，例如 `/srv/chronic-disease-mvp`
2. 拉取项目代码到服务器
3. 复制 `.env.example` 为 `.env`
4. 修改数据库、JWT、企业微信配置
5. 执行 `docker compose up -d`
6. 进入数据库执行 `src/infra/db/init.sql`
7. 执行 `src/infra/db/seed.sql` 初始化演示账号
8. 在 backend 目录执行 `npm install`
9. 执行 `npm run build`
10. 执行 `npm run dev` 或使用进程管理器启动

## 4. 验证步骤
1. `GET /health`
2. `POST /api/v1/auth/login`
3. 带 token 调用 `GET /api/v1/patients`
4. 创建患者
5. 绑定企微
6. 新增血糖/血压/体重记录
7. 创建 doctor review task
8. 查看 dashboard overview

## 5. 当前演示账号
- mobile: `13800000000`
- password: `demo123456`

## 6. 后续增强
- 接入 Nginx
- 配置域名与 HTTPS
- 使用 PM2 或 systemd 管理 backend
- 接入正式企业微信参数
