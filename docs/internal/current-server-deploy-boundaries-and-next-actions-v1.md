# 当前服务器部署边界与下一步动作 v1

## 一、当前已知边界

### 1. OpenClaw 当前占用
- OpenClaw Gateway: `127.0.0.1:27228`
- OpenClaw Local: `127.0.0.1:27230`

结论：
- 当前 OpenClaw 未占用常见业务端口 `3000 / 5432 / 6379`
- 企微项目具备在本机独立起栈的基础条件

### 2. 当前项目基础
项目目录：`/root/.openclaw/workspace/project`

当前已具备：
- backend 代码骨架
- `.env.example`
- `docker-compose.yml` 草稿
- `src/infra/db/init.sql`
- `src/infra/db/seed.sql`
- 核心 API 初版

### 3. 当前关键不确定项
仍需进一步确认：
- 当前机是否已安装 Node / npm
- 当前机是否已安装 PostgreSQL
- 当前机是否可用 Docker / Docker Compose
- 当前机是否已有 Nginx / Caddy / 其他反代
- 当前机未来是否要与其他业务共存更多端口

---

## 二、部署边界要求

### 1. 目录边界
企微项目保持独立目录，不进入 OpenClaw 自身目录结构做污染式部署。

### 2. 运行边界
企微项目后端进程、数据库、缓存均应有单独启停方式。

当前本轮已补：
- `project/ops/backend-runtime-ops.md`
- `project/ops/backend-env-policy.md`

用于把 backend 运维入口与 env 边界收口到项目目录内部。

### 3. 配置边界
企微项目使用自己的 `.env`，不得复用 OpenClaw 配置。

### 4. 网络边界
数据库和 Redis 优先本机访问，不默认外网裸露。

### 5. 反向代理边界
企业微信回调或 API 暴露通过独立反代入口完成，不直接改动 OpenClaw 本地 loopback 服务。

---

## 三、建议的首轮动作

### 动作 1：确认本机基础运行条件
需要确认：
- `node -v`
- `npm -v`
- `psql --version`
- `docker --version`
- `docker compose version`
- `nginx -v` 或 `caddy version`

### 动作 2：优先跑 backend 最小闭环
如果 Node 可用、PostgreSQL 可准备，则先完成：
- 生成 `.env`
- 初始化数据库
- 安装依赖
- 启动 backend
- 验证健康接口与登录接口

### 动作 3：确认 Redis 是否首轮必需
从现有代码看，Redis 暂时只体现在 env 中，首轮不一定是阻塞依赖。
可以先把它降为“第二优先级”。

### 动作 4：决定容器化时机
如果 Docker 当前不可用，则不要卡死在 compose；
先把宿主机直跑打通，再做容器化收敛。

---

## 四、最小成功标准
当前阶段不追求完整上线，先以以下结果为成功：

1. backend 在当前服务器可启动
2. `/health` 返回正常
3. 登录接口可拿到 token
4. 患者列表/创建接口可调用
5. dashboard 概览接口可调用
6. 与 OpenClaw 共机但互不影响

---

## 五、后续衔接
当最小闭环跑通后，再继续：
- 反向代理
- HTTPS
- 企业微信回调
- 后台页面联调
- 正式环境变量替换
- 守护进程/compose 标准化
