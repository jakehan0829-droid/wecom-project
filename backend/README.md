# 企微项目 Backend 运维文档

## 项目信息
- **项目目录**: /root/.openclaw/workspace/project/backend
- **配置文件**: /root/.openclaw/workspace/project/backend/.env
- **PM2服务名**: chronic-disease-backend
- **监听端口**: 3000
- **数据库**: PostgreSQL (chronic_disease)
- **数据库用户**: wecom_mvp_user

## 环境配置
```bash
# .env 配置内容
APP_NAME=chronic-disease-mvp
APP_PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=chronic_disease
DB_USER=wecom_mvp_user
DB_PASSWORD=wecom_mvp_123456

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=hancong-demo-jwt-secret
JWT_EXPIRES_IN=7d
```

## 运维命令

### 服务管理
```bash
# 查看状态
pm2 list

# 查看日志
pm2 logs chronic-disease-backend

# 重启服务
pm2 restart chronic-disease-backend

# 停止服务
pm2 stop chronic-disease-backend

# 开机自启状态（已配置）
pm2 startup
pm2 save
```

### 健康检查
```bash
# 健康检查
curl http://127.0.0.1:3000/health

# 登录接口
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"13800000000","password":"demo123456"}'
```

### 工作台 V1 标准试跑入口
```bash
cd /root/.openclaw/workspace/project/backend
./scripts/open-workbench-v1-trial-run.sh
```

说明：
- 该脚本会一键完成：确保标准样本存在、登录获取 accessToken、输出标准会话打开地址
- 默认账号：`13800000000 / demo123456`
- 默认 BASE_URL：`http://127.0.0.1:3000`
- 如需外部地址，可用：`BASE_URL=http://<服务器地址>:3000 ./scripts/open-workbench-v1-trial-run.sh`

### 数据库连接
```bash
# 使用业务用户连接
PGPASSWORD='wecom_mvp_123456' psql -h 127.0.0.1 -U wecom_mvp_user -d chronic_disease
```

## 当前状态
- ✅ PM2持久化：已完成
- ✅ 开机自启：已配置
- ✅ 数据库权限：已收紧（使用专属用户）
- 🔄 Redis状态：待确认（当前配置为占位）
- ✅ 核心API：健康检查、登录接口已验证

## 注意事项
- 不要停止OpenClaw服务
- 数据库使用最小权限原则
- Redis当前为占位配置，未正式接入
- 服务重启后会自动恢复