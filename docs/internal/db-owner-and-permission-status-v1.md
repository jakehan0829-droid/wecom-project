# DB owner / 权限现状说明 v1

更新时间：2026-03-30

## 1. 背景

在推进企微映射治理能力时，出现了一个很典型但容易误判的问题：

- 代码已经支持稳定字段与索引
- 新表也能成功创建
- 但老表结构却改不进去

如果不把这件事写清楚，后续很容易被误判成：
- SQL 没执行
- 迁移脚本有 bug
- 代码没生效

实际上，当前核心原因是：

**当前业务数据库用户不是既有老表的 owner。**

---

## 2. 当前可做 / 不可做边界

### 2.1 当前 DB 用户可以做的事
以当前应用连接账号为例：
- `DB_USER=wecom_mvp_user`

当前已验证它可以：
- 连接业务数据库
- 读写既有业务数据
- 创建新表（如 `wecom_mapping_audit`）
- 创建新索引（针对自己有权限的新对象）

### 2.2 当前 DB 用户做不了的事
当前已验证它不能直接：
- `ALTER TABLE wecom_conversations ADD COLUMN ...`
- 修改由其他 owner 创建的既有老表结构

实际报错表现：
- `must be owner of table wecom_conversations`

---

## 3. 为什么“新表能建，老表不能改”

这是 PostgreSQL 很典型的权限边界：

### 3.1 新表创建
如果当前账号对 schema/database 具备创建权限，就可以：
- `CREATE TABLE wecom_mapping_audit (...)`

因为新表创建出来后，owner 通常就是当前账号自己。

### 3.2 老表变更
但若 `wecom_conversations` 是历史由其他账号创建：
- 当前账号即使能 `select / insert / update`
- 也不代表能 `alter table`

`ALTER TABLE` 要求更高，通常需要：
- 表 owner
- 或更高权限角色

所以就会出现：

**新表能建成功，老表加字段失败。**

这不是矛盾，是 PostgreSQL 权限模型的正常表现。

---

## 4. 本项目中的实际影响

当前影响集中在：
- `wecom_conversations.mapping_status`
- `wecom_conversations.mapping_matched_by`

代码层已经支持这两个字段，但真实库里老表还没有落上去。

因此系统当前处于：

### 兼容运行态
- 若检测到稳定字段已存在：走 SQL 过滤 / 回写
- 若检测不到稳定字段：自动回退到动态 mapping lookup + 应用层过滤

也就是说：
- 功能不受阻
- 只是还没切换到最终高性能态

---

## 5. 当前已确认事实

### 已成功
- `wecom_mapping_audit` 新表已创建成功
- `mapping audit API` 已可用
- `reassign / confirm / unconfirm / promote-binding` 已可用

### 未真正完成
- `wecom_conversations` 老表补字段
- 稳定字段 SQL 级筛选切换

### 当前不是代码问题
关键结论：
- 不是业务代码没写好
- 不是查询逻辑失效
- 主要是 DB owner 权限不足导致老表结构未完成迁移

---

## 6. 推荐处理方式

### 方式 A：由 owner 账号执行正式迁移脚本
推荐脚本：
- `project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`

这是最直接、最稳妥的方式。

### 方式 B：由 DBA / 更高权限角色代执行
如果 owner 账号不便直接暴露，可由具备足够权限的人代执行。

### 方式 C：后续统一迁移表 owner / migration role
如果项目会长期扩展，建议后续统一：
- 谁负责 schema migration
- 应用账号是否只负责 DML，不负责 DDL
- migration role 如何管控

---

## 7. 当前对外口径建议

后续若有人问“为什么代码写了 stable mapping fields 还没完全切成 SQL 过滤”，建议统一回答：

> 当前代码与迁移脚本都已就绪；新表也已成功创建。之所以老表稳定字段尚未正式落库，不是功能设计问题，而是现网数据库权限边界：应用账号不是历史老表 owner，无法直接对既有表执行 ALTER TABLE。系统已实现兼容降级，功能可继续运行，待 owner 级迁移执行后即可切换到稳定字段方案。

---

## 8. 一句话结论

当前“新表能建、老表不能改”的根因是 **PostgreSQL owner 权限边界**，不是代码问题。系统已通过兼容降级保证功能继续可用，后续只需在 owner 权限窗口执行正式迁移脚本即可完成收口。
