# 企微项目 backend 对接与模块映射草案 V1

## 1. 文档目的

本文件用于明确：企微项目新增的消息入库与聊天分析能力，应如何与当前 backend 结构衔接，避免实现阶段模块散乱、路由混乱、服务职责不清。

---

## 2. 当前 backend 现状

当前 backend 已存在的企微/触达相关能力主要集中在 enrollment 模块及 dashboard 相关能力，包括：
- wecom-outreach
- wecom-api-client
- wecom-message-sender
- outreach-action
- outreach-delivery-log
- dashboard service

说明：
- 当前已经具备“主动发送与观察”主链
- 新增能力要补的是“消息接收、会话记录、聊天分析、方案反哺”主链

---

## 3. 模块映射建议

## 3.1 建议保持现有发送主链不乱动
当前已有发送链应继续保留在现有相关模块中，不建议为了接收与分析能力把已稳定链路打散。

即：
- 发送相关能力继续保留在现有 wecom-outreach / sender / delivery-log 侧

---

## 3.2 建议新增企微互动子模块
建议新增或扩展一组更偏“互动与分析”的模块，例如：
- wecom-message-intake
- wecom-conversation
- wecom-insight

其职责分别为：

### wecom-message-intake
负责：
- intake API
- 消息标准化
- message 写入
- customer 初步关联

### wecom-conversation
负责：
- conversation upsert
- participant 维护
- conversation 查询
- conversation 消息时间线读取

### wecom-insight
负责：
- analyze API
- 消息读取与输入组装
- insight 生成
- insight 写入
- insight 查询

---

## 3.3 dashboard 的对接方式
当前 dashboard 已具备发送观察能力。

后续建议：
- 先不急着大改 dashboard
- 先预留 insight 与 conversation 相关统计入口
- 等最小消息闭环与分析闭环打通后，再逐步补 dashboard 侧视图

---

## 4. 路由映射建议

建议新增路由组：
- `/api/wecom/messages/intake`
- `/api/wecom/messages`
- `/api/wecom/conversations/:conversationId`
- `/api/wecom/conversations/:conversationId/messages`
- `/api/wecom/conversations/:conversationId/analyze`
- `/api/wecom/customers/:customerId/analyze-latest`
- `/api/wecom/insights`
- `/api/wecom/insights/:insightId`

说明：
- intake / conversations / insights 三组路由职责清晰
- 与当前主动发送路由形成分层

---

## 5. service 映射建议

建议服务层至少拆成：
- message intake service
- message normalize service
- conversation service
- message query service
- message read service
- insight generation service
- insight persistence service
- insight query service

说明：
- 不建议把所有逻辑塞进一个 wecom service
- 应保证“发送链”和“接收/分析链”清晰分层

---

## 6. 与当前主链的关系

### 当前已完成主链
- 企业微信主动发送
- delivery log
- dashboard 发送统计

### 当前待新增主链
- 客户消息接收
- 会话记录
- 聊天分析
- 方案反哺建议

结论：
- 新能力不是替换当前主链
- 而是在当前主链基础上补全“客户互动 intelligence 主链”

---

## 7. 当前推荐实现策略

建议采用：
- **保留现有发送链**
- **新增互动/分析链**
- **通过 routes + service 分层接入**
- **先打通最小闭环，再补 dashboard 与自动触发器**

---

## 8. 文档结论

backend 对接与模块映射的核心原则是：

> 不打乱当前已经稳定的企微发送主链；
> 以新增互动与分析子模块的方式补齐消息接收、会话记录、聊天分析与方案反哺能力，
> 形成“发送主链 + 互动 intelligence 主链”双主链结构。
