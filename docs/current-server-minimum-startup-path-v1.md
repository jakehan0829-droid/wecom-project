# 当前服务器最短启动路径 v1

## 1. 当前结论
当前服务器上：
- Node.js 可用（v22.22.1）
- npm 可用（10.9.4）
- 项目 backend 依赖已安装

但以下能力当前未确认可用，且从命令结果看更可能是未安装：
- Docker / Docker Compose
- PostgreSQL
- Redis
- Nginx / Caddy

所以当前最短路径不是“直接 compose 起全栈”，而是：

**先补一个可用 PostgreSQL，再把 backend 直接跑起来。**

---

## 2. 为什么 Redis 不是首轮阻塞项
当前 backend 代码中：
- env 有 Redis 配置
- 但运行主链路中尚未真正初始化 Redis 连接

因此首轮目标是：
- 让 backend 成功启动
- 让登录 / 患者 / 绑定 / dashboard 接口可用

在这个阶段，Redis 可以暂时不作为阻塞前提。

---

## 3. 当前最短闭环所需条件
首轮只需要以下几项：

1. Node/npm（已满足）
2. PostgreSQL（未满足）
3. 项目 `.env`
4. 数据库初始化
5. 启动 backend

---

## 4. 当前推荐最短路径

### 路径 A：本机安装 PostgreSQL（当前最务实）
如果允许安装系统依赖，优先级最高。

执行思路：
1. 安装 PostgreSQL
2. 创建数据库 `chronic_disease`
3. 用项目内 `init.sql` 初始化
4. 用 `seed.sql` 写入演示数据
5. 复制 `.env.example` 为 `.env`
6. 将 DB_HOST 改为 `127.0.0.1` 或 `localhost`
7. 在 `backend/` 下执行 `npm run dev`
8. 验证 `/health` 与核心 API

优点：
- 不依赖 Docker
- 可直接推进
- 更适合当前主机现状

### 路径 B：如果当前机其实已有可用外部数据库
若存在另一个可连接的 PostgreSQL，则可直接改 `.env` 指向该数据库。

优点：
- 启动更快

缺点：
- 当前没有证据表明已存在这样的数据库
- 会增加环境耦合

### 路径 C：等待 Docker 可用再走 compose
不建议作为当前第一路径。

原因：
- 当前 `docker` 命令不可用
- 继续等容器条件清晰，会阻塞主线

---

## 5. 首轮成功标准
当以下项目成立时，可视为当前服务器最小闭环跑通：

1. `GET /health` 返回正常
2. `POST /api/v1/auth/login` 可返回 token
3. `GET /api/v1/patients` 可访问
4. `POST /api/v1/patients` 可创建患者
5. `GET /api/v1/dashboard/overview` 可返回统计数据

---

## 6. 当前建议的下一步动作
按优先级排序：

### P1
补 PostgreSQL 可用性

### P2
生成当前机 `.env`
- `APP_PORT=3000`
- `DB_HOST=127.0.0.1`
- `DB_PORT=5432`
- 其余按本机实际情况调整

### P3
执行数据库初始化
- `src/infra/db/init.sql`
- `src/infra/db/seed.sql`

### P4
启动 backend
- `npm run dev`

### P5
验证首轮演示链路
- login
- patient create/list
- wecom binding
- dashboard overview

---

## 7. 当前阶段不建议做的事
- 为了标准化而先卡在 Docker/Compose 上
- 为了未来生产形态而过早引入完整反代与 HTTPS
- 为了“更优雅”而先做多机拆分

当前更重要的是：

**在当前机先把 backend 真实跑起来。**
