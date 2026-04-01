# 企微聊天分析闭环 backend 文件级实现草案 V1

## 1. 文档目的

本文件用于把企微聊天分析闭环继续推进到 backend 文件级实现层，明确 analyze 相关能力在当前 backend 中应如何落文件、落职责、落路由。

目标是支撑最小聊天分析闭环：

**analyze route → controller → message read → analysis processing → insight persistence → query**

---

## 2. 建议新增/修改文件

## 2.1 路由层
### 建议修改
- `project/backend/src/routes.ts`

### 目标
新增：
- `POST /api/wecom/conversations/:conversationId/analyze`
- `POST /api/wecom/customers/:customerId/analyze-latest`
- `GET /api/wecom/insights`
- `GET /api/wecom/insights/:insightId`

---

## 2.2 controller 层
### 建议新增
- `project/backend/src/modules/wecom-intelligence/controller/insight.controller.ts`

### 职责
- 接收 analyze 请求
- 处理按 customer / conversation 的 analyze 入口
- 返回 insightId、messageCount 等
- 提供 insight 列表与详情查询接口

---

## 2.3 service 层
### 建议新增
- `project/backend/src/modules/wecom-intelligence/service/message-read.service.ts`
- `project/backend/src/modules/wecom-intelligence/service/insight-generation.service.ts`
- `project/backend/src/modules/wecom-intelligence/service/insight-persistence.service.ts`
- `project/backend/src/modules/wecom-intelligence/service/insight-query.service.ts`

### 职责
#### message-read.service.ts
- 按 customer / conversation / timeWindow 读取消息
- 组装分析输入

#### insight-generation.service.ts
- 生成 summary
- 生成 need / concern / objection / risk / intent
- 生成 nextActionSuggestions / planUpdateSuggestions

#### insight-persistence.service.ts
- 写入 wecom_conversation_insights
- 关联 customer / conversation
- 必要时更新 message analysis_status

#### insight-query.service.ts
- insight 列表查询
- insight 详情查询

---

## 2.4 module 层
### 建议复用
- `project/backend/src/modules/wecom-intelligence/wecom-intelligence.module.ts`

### 职责
- 注册 insight controller 与相关 service
- 让 intake 与 analyze 同属一个 intelligence 子模块

---

## 3. 最小文件级实现顺序

1. routes.ts 新增 analyze / insights 路由
2. message-read.service.ts
3. insight-generation.service.ts
4. insight-persistence.service.ts
5. insight-query.service.ts
6. insight.controller.ts

---

## 4. 最小分析流程对应文件映射

### 输入读取
- message-read.service.ts

### 结构化分析
- insight-generation.service.ts

### 结果入库
- insight-persistence.service.ts

### 结果查询
- insight-query.service.ts

### 对外 API
- insight.controller.ts

---

## 5. 验收标准

- analyze 路由存在
- 至少一组消息可生成 insight
- insight 可入库
- insight 可查询详情
- 至少有 nextActionSuggestion 和 planUpdateSuggestion

---

## 6. 文档结论

企微聊天分析闭环在 backend 文件级的建议实现方式是：

> 在 `wecom-intelligence` 子模块内新增 insight 相关 controller 与 service，
> 以“读取消息—生成 insight—保存 insight—查询 insight”的最小链路打通分析闭环。
