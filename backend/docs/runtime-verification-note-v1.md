# 运行验证说明 v1

## 已完成
- `npm install` 已执行成功
- 本地 TypeScript/Express 依赖已安装

## 当前限制
- 当前运行环境缺少 `docker` 命令，无法直接通过 `docker compose up -d` 拉起 PostgreSQL / Redis 容器

## 当前建议
1. 若本机可安装 Docker，则在 project/ 下执行 `docker compose up -d`
2. 若已有外部 PostgreSQL，可直接修改 `.env` 指向现有数据库
3. 完成数据库可用后：
   - 执行 `src/infra/db/init.sql`
   - 运行 `npm run dev`
   - 验证 `/health`、`/api/v1/patients`、`/api/v1/dashboard/overview`
