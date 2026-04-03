# 当前服务器 backend 首轮启动执行清单 v1

## 目标
在当前 OpenClaw 所在服务器上，不依赖目标服务器，先把企微项目 backend 的最小闭环跑起来。

---

## 一、首轮最小目标
满足以下条件即视为首轮成功：

1. backend 进程可启动
2. `GET /health` 正常
3. `POST /api/v1/auth/login` 正常返回 token
4. `GET /api/v1/patients` 正常
5. `POST /api/v1/patients` 正常
6. `GET /api/v1/dashboard/overview` 正常

---

## 二、当前阻塞项
当前唯一明确阻塞 backend 首轮启动的关键依赖是：

**PostgreSQL 不可用**

已确认当前服务器：
- Node 可用
- npm 可用
- backend 代码已具备最小启动骨架
- Redis 暂时不是首轮阻塞项
- Docker 当前不可作为默认路径

---

## 三、推荐执行路径

### 路径 1：优先补本机 PostgreSQL
适用场景：
- 当前服务器允许补装系统依赖
- 希望最快拿到 backend 可运行环境

执行顺序：
1. 安装 PostgreSQL
2. 创建数据库 `chronic_disease`
3. 创建可用账号（如 `postgres`）
4. 复制 `project/.env.example` 为 `project/.env`
5. 修改数据库连接：
   - `DB_HOST=127.0.0.1`
   - `DB_PORT=5432`
   - `DB_NAME=chronic_disease`
   - `DB_USER=postgres`
   - `DB_PASSWORD=<实际密码>`
6. 执行初始化 SQL：
   - `project/backend/src/infra/db/init.sql`
   - `project/backend/src/infra/db/seed.sql`
7. 进入 `project/backend`
8. 执行 `npm run dev`
9. 验证健康接口和首批 API

### 路径 2：接入已有外部 PostgreSQL
适用场景：
- 已存在可靠数据库
- 想最快完成验证

执行顺序：
1. 修改 `project/.env`
2. 将 DB 指向外部实例
3. 执行 `init.sql`
4. 启动 backend
5. 验证接口

风险：
- 与外部环境耦合
- 后续迁移成本可能增加

---

## 四、当前建议的 `.env` 基线
建议首轮使用：

```env
APP_NAME=chronic-disease-mvp
APP_PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=chronic_disease
DB_USER=postgres
DB_PASSWORD=<实际密码>

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=<替换为真实值>
JWT_EXPIRES_IN=7d

WECOM_CORP_ID=replace_me
WECOM_AGENT_ID=replace_me
WECOM_SECRET=replace_me
WECOM_TOKEN=replace_me
WECOM_AES_KEY=replace_me
```

说明：
- Redis 暂可空转，不必作为首轮阻塞项
- WeCom 参数首轮可先保留占位，前提是验证链路暂不依赖真实回调

---

## 五、首轮验证顺序

### 1. 健康检查
- `GET /health`

预期：
- 返回 `status: ok`

### 2. 登录
- `POST /api/v1/auth/login`

演示账号：
- mobile: `13800000000`
- password: `demo123456`

预期：
- 返回 `accessToken`

### 3. 患者接口
- `GET /api/v1/patients`
- `POST /api/v1/patients`

### 4. 绑定接口
- `POST /api/v1/patients/:id/wecom-binding`

### 5. 看板接口
- `GET /api/v1/dashboard/overview`

---

## 六、当前阶段不必阻塞的项
以下事项可以放到 backend 跑起来之后再补：
- Redis 真正接入
- Docker Compose 收敛
- Nginx / Caddy 反代
- HTTPS
- 企业微信真实回调地址
- 正式环境变量替换

---

## 七、下一阶段衔接
当 backend 最小闭环跑通后，再继续：
1. 守护运行方案（pm2 / systemd / compose）
2. 反向代理接入
3. 企业微信真实参数替换
4. 联调企业微信回调与消息链路
5. 后台页面与 API 联调
