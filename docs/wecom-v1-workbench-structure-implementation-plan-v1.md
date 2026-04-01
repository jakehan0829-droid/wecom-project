# 企微 V1 主工作台结构落地方案 v1

更新时间：2026-03-30

## 1. 目标

当前目标不是继续补底层链路，而是把已有能力收成一个可进入开发的 V1 主工作台。

这个工作台的任务是：
- 承接客户会话处理
- 让业务方快速看懂当前客户互动重点
- 串起 insight / D4 / action / feedback
- 支持最小试运行

一句话定义：

> **这是“客户互动处理工作台”，不是纯消息详情页。**

---

## 2. 页面结构定义

V1 主工作台建议按单页双栏结构落地。

### 左栏：会话工作区
包含：
1. 会话列表
2. 会话基础信息头部
3. 消息时间线

### 右栏：判断与动作工作区
包含：
1. 统一摘要卡
2. latest insight / D4 摘要卡
3. business-feedback 卡
4. pending actions / action history / feedback 卡
5. 客户摘要卡

当前重点不是拆很多新页面，而是优先在现有 conversation detail 基础上升级为工作台。

---

## 3. 区块划分

### 区块 A：会话列表区
目标：快速找重点会话。

建议展示：
- conversationName
- 最近消息时间
- 消息数
- 当前状态
- latest insight 是否存在
- 是否存在 pending action
- 风险优先级（基于 latest insight / business-feedback 提取）

优先复用：
- `GET /api/v1/wecom/conversations`

若现有列表字段不够，可补：
- `latestInsightSummary`
- `hasPendingAction`
- `priorityTag`

---

### 区块 B：会话头部信息区
目标：进入详情后先看清“是谁、当前是什么状态”。

建议展示：
- conversationName
- conversationId
- platformChatId
- primaryCustomerId / patientRef
- 当前 conversation status
- 最近消息时间
- 最近治理状态（如有）

优先复用：
- `GET /api/v1/wecom/conversations/:conversationId`
- `GET /api/v1/wecom/conversations/:conversationId/ops-view`

---

### 区块 C：消息时间线区
目标：保留原始上下文，不让工作台变成黑箱。

建议展示：
- sender
- msgType
- content
- createdAt
- 关键消息高亮（后续可做）

优先复用：
- `GET /api/v1/wecom/conversations/:conversationId/messages`

V1 不强求复杂折叠规则，先保证可读和稳定。

---

### 区块 D：统一摘要卡
目标：让业务方先看结论，再决定要不要读细节。

建议固定 4 块：
1. 客户最近在说什么
2. 当前核心需求 / 顾虑 / 风险
3. 系统建议下一步做什么
4. 当前是否需要优先处理

数据来源：
- latest insight
- business-feedback
- D4 summary
- pending actions

这块是 V1 工作台最优先要补的区块。

---

### 区块 E：latest insight / D4 卡
目标：承接分析主链结果。

建议展示：
- summaryText
- stage
- confidence
- needs
- concerns / objections / risks
- nextActions
- d4Summary.proposalSuggestion
- d4Summary.actionSuggestion
- generatedAt

优先复用：
- `GET /api/v1/wecom/conversations/:conversationId/insight`
- 现有 detail 页 insight 区

---

### 区块 F：business-feedback 卡
目标：把“业务判断层”单独抽出来，方便运营/医生读。

建议展示：
- 当前状态
- 核心判断
- 对业务动作的建议
- 最近生成时间

优先复用：
- `POST /api/v1/wecom/conversations/:conversationId/business-feedback`
- `GET /api/v1/wecom/customers/:customerId/business-feedback`

V1 先支持按会话触发与展示，不强求更复杂聚合。

---

### 区块 G：动作与反馈区
目标：把“建议”变成“执行闭环”。

建议展示：
- pending actions
- action history
- action status
- feedback 入口
- 最近 feedback 结果

优先复用：
- `GET /api/v1/wecom/conversations/:conversationId/pending-actions`
- `GET /api/v1/wecom/conversations/:conversationId/action-history`
- `POST /api/v1/patient-outreach-actions/:id/feedback`

这块当前不要求全新建模，先把已有 action / feedback 能力整合到一个区块里。

---

### 区块 H：客户摘要卡
目标：让详情页不只像会话页，而是像业务处理页。

建议展示：
- patientId / patientName
- riskLevel
- managementStatus
- diabetesType
- 最近 conversation
- 最近 latestInsight 摘要

优先复用：
- `GET /api/v1/patients/:id`
- conversation detail 中已有 patient / mapping 相关数据

---

## 4. 复用哪些现有页面 / 接口

### 前端优先复用
当前优先不新开大量页面，直接基于现有：
- `frontend/src/App.tsx` 中已有的 conversation detail 区
- 现有 dashboard / governance / conversation 交互基础

### 后端优先复用接口
V1 先复用：
- `/api/v1/wecom/conversations`
- `/api/v1/wecom/conversations/:conversationId`
- `/api/v1/wecom/conversations/:conversationId/messages`
- `/api/v1/wecom/conversations/:conversationId/insight`
- `/api/v1/wecom/conversations/:conversationId/pending-actions`
- `/api/v1/wecom/conversations/:conversationId/action-history`
- `/api/v1/wecom/conversations/:conversationId/business-feedback`
- `/api/v1/patients/:id`
- `/api/v1/wecom/conversations/:conversationId/ops-view`

---

## 5. 需要补哪些接口 / 字段

### 第一优先：先不急着补大而全聚合接口
当前更建议先前端聚合现有接口，快速收出 V1。

### 可能需要补的小字段
如果现有接口不足，优先补小字段，不先新开大接口：
- conversation list 增加 `hasPendingAction`
- conversation list 增加 `latestInsightSummary`
- conversation list 增加 `priorityTag`
- conversation detail 增加更直接的 patient 摘要字段（若当前不足）

### 什么时候再补聚合接口
只有当以下问题明显出现时，再补 `/workbench-view` 之类聚合接口：
- 前端请求过多导致加载体验差
- 多接口状态拼装复杂度过高
- 页面状态刷新明显不一致

当前阶段判断：

> **V1 第一版先用前端聚合现有接口，更快。**

---

## 6. 前端落地顺序

建议顺序：

### Step 1
先把现有 conversation detail 改造成双栏主工作台骨架。

### Step 2
先补“统一摘要卡 + latest insight / D4 卡”。

### Step 3
再补“动作与反馈区”。

### Step 4
再补“客户摘要卡”。

### Step 5
最后再回头优化列表区重点标记。

原因：
- 详情页价值最高
- 详情页先成立，试运行就能开始
- 列表增强可以稍后补

---

## 7. 后端是否需要补聚合接口

### 当前判断

**第一版先不补新的大聚合接口。**

原因：
- 现有接口已覆盖大部分工作台所需数据
- 当前更缺的是页面组织，而不是后端能力空白
- 先通过前端拼装验证信息结构是否合理，更快进入试运行

### 可接受的补法
如确实不够，优先补：
- conversation list 小字段
- conversation detail 小字段
- action history / pending action 的展示友好字段

而不是一开始就上一个新的重型 `workbench-view` 接口。

---

## 8. 直接进入开发的建议首刀

建议首刀代码动作：
1. 在现有 conversation detail 页面上搭出双栏结构
2. 把 latest insight 区升级成“统一摘要 + insight / D4”组合卡
3. 在右栏挂入 pending actions / action history 区
4. 客户摘要卡先用现有 patient detail 数据占位

---

## 9. 一句话结论

V1 主工作台第一版不应重新开新系统，而应：

**基于现有 conversation detail 页面升级成“客户互动处理工作台”，优先前端聚合现有接口，先把统一摘要、分析结果、动作反馈、客户摘要收进一个可试运行页面。**
