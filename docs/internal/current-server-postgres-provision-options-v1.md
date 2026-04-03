# 当前服务器 PostgreSQL 补齐方案 v1

## 1. 当前判断
当前服务器未发现以下可用项：
- `psql`
- `postgres`
- 已安装 PostgreSQL 相关包
- PostgreSQL systemd unit

因此可以把结论直接定为：

**当前服务器上 PostgreSQL 基本可视为未安装。**

---

## 2. 这意味着什么
企微项目 backend 首轮启动的主阻塞项已进一步收敛：

不是代码、不是端口、不是 Node，
而是：

**当前机缺一个可用 PostgreSQL。**

---

## 3. 可选补齐路径

### 方案 A：APT 安装 PostgreSQL（推荐首选）
适用：
- 当前机可执行系统安装
- 目标是尽快把 backend 跑起来

优点：
- 不依赖 Docker
- 与当前主机现状最匹配
- 启动路径最短
- 排障简单

缺点：
- 会对主机做系统级改动
- 后续若转容器化，还要做一次收敛

### 方案 B：后续修复 Docker，再容器化 PostgreSQL
适用：
- 明确要统一容器化
- 能接受先解决 Docker 可用性

优点：
- 更接近长期标准化

缺点：
- 当前不够短路径
- 会拖慢 backend 首轮启动

### 方案 C：接外部数据库
适用：
- 手头已有现成 PostgreSQL
- 只追求最快验证

优点：
- 启动快

缺点：
- 增加耦合
- 不是当前机独立业务栈的最佳形态

---

## 4. 当前推荐
当前推荐统一采用：

**方案 A：先在当前服务器用 APT 补 PostgreSQL。**

理由：
1. 最符合当前机实际条件
2. 不再被 Docker 卡住
3. 能最快推进到 backend 真启动
4. 后续仍可再迁回容器化，不影响当前阶段判断

---

## 5. 补齐后的最短链路
一旦 PostgreSQL 补齐，后续就很直：

1. 创建数据库 `chronic_disease`
2. 复制 `project/.env.example` 为 `project/.env`
3. 把 DB_HOST 改成 `127.0.0.1`
4. 执行 `init.sql`
5. 执行 `seed.sql`
6. `cd project/backend && npm run dev`
7. 验证 `/health`、登录、患者、dashboard

---

## 6. 当前阶段的关键原则
现阶段要避免两种跑偏：

### 跑偏 1：继续先研究 Docker
当前 Docker 连命令都不可用，继续把它当第一主线不划算。

### 跑偏 2：为了“更标准”而迟迟不启动 backend
当前首要目标不是最终形态，而是先获得真实可运行环境。

---

## 7. 一句话结论
当前服务器上，补 PostgreSQL 是下一步最值得优先推进的真实动作；一旦补齐，backend 就可以进入首轮启动与接口验证阶段。
