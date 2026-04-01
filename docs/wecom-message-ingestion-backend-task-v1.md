# 企微消息入库闭环 backend 实现任务单 V1

## 1. 任务目标

将企微消息入库闭环从设计和 SQL 草案推进到 backend 实现任务层，重点打通：

**消息进入 → 标准化 → 入库 → 会话归档 → 客户关联 → 查询回看**

---

## 2. 实现范围

### 纳入范围
- 私聊文本消息优先
- intake 路由与 controller
- message / conversation / customer 最小闭环
- 最小查询接口

### 暂不纳入范围
- 图片、文件、语音等复杂消息
- 群聊全量复杂逻辑
- 高级分析与自动化触发

---

## 3. backend 任务拆解

### B1. 建表接入任务
- 将 wecom_conversations / wecom_conversation_participants / wecom_messages / wecom_conversation_insights 的 SQL 草案接入数据库初始化或迁移方案

完成标准：
- 数据库中存在最小可用表结构

---

### B2. intake 接口任务
- 新增 `POST /api/wecom/messages/intake`
- 支持最小文本消息请求体

完成标准：
- 可接受一条私聊文本消息输入

---

### B3. 消息标准化任务
- 将外部输入转换为内部统一 message 结构
- 规范 messageId / conversationId / customerId 映射

完成标准：
- 输入结构能稳定转为内部标准结构

---

### B4. 消息写入任务
- 将标准化后的消息写入 wecom_messages
- 保留原始内容、文本内容、metadata

完成标准：
- 消息能成功写入并可查到

---

### B5. conversation upsert 任务
- 根据 chatType + platformChatId 归入 conversation
- 不存在时创建，存在时更新 message_count / last_message_at

完成标准：
- 消息不会变成孤立记录

---

### B6. customer 关联任务
- 私聊优先支持直接绑定 customer
- 无法确认时允许待确认

完成标准：
- 至少私聊主场景下消息能挂到 customer 名下

---

### B7. 查询接口任务
- 按 customer 查询消息
- 按 conversation 查询消息
- 支持时间窗口查询

完成标准：
- 至少能回看某客户最近聊天记录

---

### B8. 最小验证任务
- 准备一条私聊消息样例
- 跑通 intake → message → conversation → customer → query 全链路

完成标准：
- 可证明消息入库闭环已打通

---

## 4. 建议模块落点

建议新增或扩展企微相关 backend 模块，至少包括：
- message intake controller
- message intake service
- conversation service
- message query service

---

## 5. 验收标准

必须满足：
- 一条私聊文本消息可成功入库
- conversation 可创建或更新
- customer 关联可成立
- 消息可按 customer / conversation 查询

---

## 6. 文档结论

本任务单用于把企微消息入库主链正式压到 backend 实现层，作为冲刺 1 的核心执行依据。
