# 新 insight 表接入方案 / 迁移执行方案 v1

更新时间：2026-03-30

## 1. 目标

在不打断当前 D2+D3 最小闭环的前提下，把 insight 存储从“旧表兼容模式”推进到“新表主读写模式”。

目标不是一次性替换所有旧逻辑，而是采用低风险双轨方案：
- analyze 开始写新表
- latest insight 优先读新表
- 读不到再回退读旧表
- 旧 analyze 写旧表的兼容链暂时保留

---

## 2. 当前判断

### 为什么不能长期停留在旧表
旧表 `wecom_conversation_insights` 当前存在几个结构性限制：
- `confidence` 只存数值型 `confidence_score`
- `evidenceMessageIds` 没有原生字段
- `stage / nextActions / analysisVersion / source window` 都不是按 D1 结构设计
- D4 proposal / actionSuggestion 后续要接 `sourceInsightId` 时，旧结构会越来越别扭

### 为什么不建议一步硬切
- 当前 analyze / latest insight 最小链路刚跑通
- detail 页 insight 展示位已接上
- 直接硬切旧表会增加回归风险

结论：

> 当前最合理的是“新表主读写 + 旧表兼容回退”的双轨切换。

---

## 3. 执行策略

### Phase 1：接入新表，但不移除旧表逻辑
- 新增 `wecom_conversation_insights_v1`
- analyze 在当前旧表写逻辑之后，再补一份新表写入
- latest insight 先查新表
- 若新表查不到，再回退读旧表

### Phase 2：前端和调用侧逐步稳定到新结构
- detail 页优先消费新表返回结构
- 保持字段尽量稳定：summaryText / stage / needs / nextActions / confidence / evidenceMessageIds

### Phase 3：观察一段时间后再决定是否停旧写
- 如果新表稳定可用，再考虑停止旧表写入
- 如果 D4 / 运营筛选开始依赖新结构，则进一步收口

---

## 4. 推荐迁移顺序

### Step 1
先执行新表建表 SQL：
- `project/ops/sql/2026-03-30-wecom-conversation-insights-v1.sql`

### Step 2
后端 analyze 增加新表写入逻辑：
- 继续保留旧表写
- 同时补新表写

### Step 3
后端 latest insight 改成：
- 优先读新表
- 查不到回退旧表

### Step 4
联调验证：
- POST analyze 后，新表有记录
- GET latest insight 优先返回新表结构

### Step 5
等新表稳定后，再评估：
- 是否停旧表写
- 是否补历史迁移

---

## 5. 当前阶段一句话结论

新 insight 表当前不应“直接替换一切”，而应：

> **先进入主读写链路，再通过优先读新表、回退读旧表的方式平滑切换。**
