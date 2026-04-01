# backend 运行与运维入口

## 当前运行入口
工作目录：
- `/root/.openclaw/workspace/project/backend`

运行配置：
- `/root/.openclaw/workspace/project/backend/.env`

PM2 进程：
- `chronic-disease-backend`

正式 PM2 配置：
- `/root/.openclaw/workspace/project/backend/ecosystem.config.cjs`

Webhook 正式运行说明：
- `project/docs/wecom-webhook-runtime-v1.md`

## 常用动作
### build
```bash
cd /root/.openclaw/workspace/project/backend
npm run build
```

### restart
```bash
pm2 restart chronic-disease-backend
```

### rebuild + recreate PM2 runtime
```bash
bash /root/.openclaw/workspace/project/ops/fix-pm2-runtime.sh
```

### status
```bash
pm2 status chronic-disease-backend
```

### logs
```bash
pm2 logs chronic-disease-backend --lines 100 --nostream
```

### runtime check
```bash
cd /root/.openclaw/workspace/project
node scripts/runtime-check.js
```

### webhook smoke test
```bash
cd /root/.openclaw/workspace/project/backend
node ../ops/wecom-webhook-smoke-test.js
```

### owner-level schema migration for stable mapping columns
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

## 隔离规则
1. backend 运维入口集中放在 `project/ops/`
2. backend 实际 env 只认 `project/backend/.env`
3. 不在 workspace 根目录新增项目级运行脚本
