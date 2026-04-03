# D2+D3 后端模块拆分与文件落位方案 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于把 D2（消息采集最小闭环）和 D3（最小分析主链）进一步推进到后端实施层，明确：
- 应拆成哪些模块
- 各模块职责是什么
- 文件大致落在哪
- 哪些能力可复用现有企微模块
- 应避免哪些实现方式

目标不是一次性画完整架构图，而是先给出一个**可直接开始落代码的模块拆分方案**。

---

## 2. 当前实施原则

### 原则 1：优先复用现有 wecom-intelligence 边界
D2/D3 不建议另起一套完全平行的企微系统，而应尽量落在当前 backend 已有的企微能力边界内。

### 原则 2：先最小闭环，不先大而全抽象
当前优先把：
- 消息查询
- insight 生成
- insight 查询
做实。

### 原则 3：解析、查询、分析、存储分层
不要把消息查询、分析生成、数据库读写混在同一个 service 里。

---

## 3. 推荐模块拆分

建议至少拆成四个模块：

### 模块 M1：conversation-message-query
职责：
- 提供按 conversation 查询最近消息的能力
- 负责 D2 面向 D3 的最小消息窗口读取

### 模块 M2：conversation-insight
职责：
- 定义 insight 结构
- 提供 insight 生成 / 查询能力
- 负责 D3 主链

### 模块 M3：conversation-analysis
职责：
- 负责把消息窗口组织成分析输入
- 调用最小分析逻辑
- 产出 summary / stage / 五类数组 / confidence / evidenceMessageIds

### 模块 M4：conversation-analysis-storage
职责：
- 负责 insight 的读写
- 后续可扩展建议/历史版本存储

---

## 4. 文件落位建议

结合当前 backend 结构，建议继续挂在：

`backend/src/modules/wecom-intelligence/`

### 4.1 conversation-message-query
建议位置：
- `backend/src/modules/wecom-intelligence/service/conversation-message-query.service.ts`

职责：
- `getConversationMessages(conversationId, options)`
- `getRecentTextMessagesForAnalysis(conversationId, limit)`

### 4.2 conversation-analysis
建议位置：
- `backend/src/modules/wecom-intelligence/service/conversation-analysis.service.ts`

职责：
- 清洗消息窗口
- 去重 / 降噪
- 组装最小分析输入
- 返回结构化分析结果

### 4.3 conversation-insight
建议位置：
- `backend/src/modules/wecom-intelligence/service/conversation-insight.service.ts`
- `backend/src/modules/wecom-intelligence/controller/conversation-insight.controller.ts`

职责：
- `generateConversationInsight(conversationId)`
- `getLatestConversationInsight(conversationId)`

### 4.4 conversation-analysis-storage
建议位置：
- `backend/src/modules/wecom-intelligence/service/conversation-insight-repository.service.ts`

职责：
- `saveInsight(payload)`
- `findLatestInsightByConversationId(conversationId)`
- 后续可扩 `listInsights(filter)`

---

## 5. 路由建议

当前阶段建议只补最小两条：

### 路由 1：生成分析
- `POST /api/v1/wecom/conversations/:conversationId/insight`

### 路由 2：查询最新分析
- `GET /api/v1/wecom/conversations/:conversationId/insight`

说明：
- 消息查询接口如当前 conversation message 路径已存在，可优先复用
- 若当前返回结构不足，再增强现有 messages 接口

---

## 6. 最小调用关系建议

建议调用关系如下：

1. `conversation-insight.controller`
2. `conversation-insight.service`
3. `conversation-message-query.service`
4. `conversation-analysis.service`
5. `conversation-insight-repository.service`

即：
- controller 不直接查库
- analysis service 不直接决定 HTTP 返回
- repository 只负责存储，不负责分析逻辑

---

## 7. 与现有能力的复用点

### 可直接复用
- conversationId 体系
- 现有 messages 查询主链
- current customer / patient mapping 信息
- 详情页 conversation 视图
- 现有 wecom-intelligence 模块边界

### 应谨慎复用
- 不要把 insight 直接塞进 mapping audit 体系
- 不要把 D3 分析逻辑混进 mapping-management.service
- 不要把建议逻辑直接写进 message 查询 service

---

## 8. 当前阶段不建议的做法

### 不建议 1：新起一个完全独立的 AI/analysis 顶层模块
当前阶段太重，会打散现有 wecom-intelligence 结构。

### 不建议 2：把 insight 逻辑写进 conversation.controller 里
这样会让 controller 过重，后续难维护。

### 不建议 3：把查询、分析、存储写成一个超级 service
当前阶段虽然功能不大，但这么做会让后续 D4 很难接。

---

## 9. 当前阶段落地顺序建议

### 第一步
先补：
- `conversation-message-query.service.ts`
- 复用或增强现有 message 查询能力

### 第二步
再补：
- `conversation-analysis.service.ts`
- 先用最小规则/占位逻辑产出 insight 结构

### 第三步
再补：
- `conversation-insight-repository.service.ts`
- `conversation-insight.service.ts`
- `conversation-insight.controller.ts`

### 第四步
最后接：
- route 注册
- detail 页 insight 展示位

---

## 10. 当前阶段一句话结论

D2+D3 当前最合理的后端落地方式是：

> **继续复用 wecom-intelligence 边界，把“消息查询、分析生成、insight 存储、insight 接口”拆成四层，不另起一套平行系统。**
