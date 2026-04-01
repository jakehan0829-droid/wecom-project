# 企微消息入库闭环 backend 文件级实现草案 V1

## 1. 文档目的

本文件用于把企微消息入库闭环继续推进到 backend 文件级实现层，明确应该新增或修改哪些文件、各文件承担什么职责、如何与现有 backend 对接。

目标是支撑最小消息入库闭环：

**intake route → controller → normalize/service → db write → conversation upsert → customer link → query**

---

## 2. 建议新增/修改文件

## 2.1 路由层
### 建议修改
- `project/backend/src/routes.ts`

### 目标
新增：
- `POST /api/wecom/messages/intake`
- `GET /api/wecom/messages`
- `GET /api/wecom/conversations/:conversationId`
- `GET /api/wecom/conversations/:conversationId/messages`

---

## 2.2 controller 层
### 建议新增
- `project/backend/src/modules/wecom-intelligence/controller/message-intake.controller.ts`
- `project/backend/src/modules/wecom-intelligence/controller/conversation.controller.ts`

### 职责
#### message-intake.controller.ts
- 接收 intake 请求
- 参数校验
- 调用 service 完成标准化与写入
- 返回 messageId / conversationId / linkedCustomerId

#### conversation.controller.ts
- 查询 conversation 详情
- 查询 conversation 消息时间线

---

## 2.3 service 层
### 建议新增
- `project/backend/src/modules/wecom-intelligence/service/message-normalize.service.ts`
- `project/backend/src/modules/wecom-intelligence/service/message-intake.service.ts`
- `project/backend/src/modules/wecom-intelligence/service/conversation.service.ts`
- `project/backend/src/modules/wecom-intelligence/service/message-query.service.ts`

### 职责
#### message-normalize.service.ts
- 外部输入转内部消息结构
- 统一 messageId / conversationId / customerId 映射规则

#### message-intake.service.ts
- 协调整个 intake 主链
- 写入 message
- 调用 conversation upsert
- 调用 customer link

#### conversation.service.ts
- conversation upsert
- participant 预留处理
- conversation 查询

#### message-query.service.ts
- 按 customer 查询消息
- 按 conversation 查询消息
- 按时间窗口查询

---

## 2.4 db 接点
### 建议接入
- `project/backend/src/infra/db/init.sql`
- `project/backend/src/infra/db/pg.ts`

### 职责
#### init.sql
- 增补 wecom_conversations
- 增补 wecom_conversation_participants
- 增补 wecom_messages
- 增补 wecom_conversation_insights

#### pg.ts
- 继续沿用当前数据库连接能力
- 新 service 通过 pg 查询或事务执行

---

## 2.5 module 层
### 建议新增
- `project/backend/src/modules/wecom-intelligence/wecom-intelligence.module.ts`

### 职责
- 注册 controller / service
- 作为企微互动 intelligence 子模块入口

---

## 3. 最小文件级实现顺序

1. routes.ts 新增路由入口
2. init.sql 增补表结构
3. message-normalize.service.ts
4. conversation.service.ts
5. message-intake.service.ts
6. message-intake.controller.ts
7. message-query.service.ts
8. conversation.controller.ts

---

## 4. 与当前 backend 主链的关系

当前已存在企微发送主链：
- wecom-outreach
- wecom-message-sender
- outreach-delivery-log

本草案建议：
- 不改动现有发送主链
- 新增 `wecom-intelligence` 子模块承接消息接收与分析前置能力

---

## 5. 验收标准

- intake 路由存在
- message 可入库
- conversation 可 upsert
- customer 可关联
- message 可按 customer / conversation 查询

---

## 6. 文档结论

企微消息入库闭环在 backend 文件级的建议实现方式是：

> 保持现有发送链不动，新增 `wecom-intelligence` 子模块承接 intake、conversation 与 message query 主链，
> 并通过 routes + service + init.sql 的最小改动打通消息入库闭环。
