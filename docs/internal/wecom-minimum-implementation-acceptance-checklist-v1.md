# 企微最小实现验收清单 V1

## 1. 文档目的

本文件用于定义企微项目当前阶段“最小实现”应满足的验收项，作为后续端到端验证的统一依据。

目标是验证两个最小闭环：
1. 消息入库闭环
2. 聊天分析闭环

---

## 2. 验收范围

### 范围内
- 私聊文本消息主链
- message / conversation / customer 关联
- analyze / insight 主链
- nextActionSuggestion / planUpdateSuggestion 最小输出

### 范围外
- 图片、文件、语音等复杂消息
- 群聊复杂多参与者场景全量覆盖
- 完整 dashboard 与自动触发器
- 完整 CRM / 客户视图系统

---

## 3. 消息入库闭环验收项

### M1
存在最小数据表：
- wecom_conversations
- wecom_conversation_participants
- wecom_messages
- wecom_conversation_insights

### M2
存在消息 intake 接口

### M3
至少一条私聊文本消息可成功入库

### M4
message 可成功挂到 conversation

### M5
message 可成功关联 customer（或明确标记待确认）

### M6
可按 customer 查询最近消息

### M7
可按 conversation 查询消息时间线

### M8
最小验证样例已跑通并留有记录

---

## 4. 聊天分析闭环验收项

### A1
存在 analyze 入口

### A2
系统可读取一组消息形成分析输入

### A3
系统可生成 insight

### A4
insight 至少包含：
- summary
- needPoints
- concernPoints
- objectionPoints
- riskSignals
- intentAssessment
- nextActionSuggestions
- planUpdateSuggestions

### A5
至少生成一条 nextActionSuggestion

### A6
至少生成一条 planUpdateSuggestion

### A7
insight 可成功入库

### A8
可按 customer / conversation 查询 insight

### A9
最小分析验证样例已跑通并留有记录

---

## 5. 通过标准

## 最低通过标准
- M1-M8 全部通过
- A1-A9 全部通过

说明：
- 只要缺一项，就不能判定“企微最小实现已完成”

---

## 6. 当前阶段验收结论口径

只有当以上两组验收项全部通过时，才能对外说：

> 企微项目最小消息入库闭环与最小聊天分析闭环已经打通。

在此之前，只能说：
- 已完成设计层
- 已完成实现方案层
- 正在推进 backend 真实实现

---

## 7. 文档结论

本清单作为后续企微项目端到端验证的统一验收标准使用，避免“做了一些接口”和“最小闭环真正打通”之间口径混乱。
