# 旧 insight 表读取链排查 v1

更新时间：2026-03-30

## 1. 本轮排查目标

排查当前系统中，除了 latest insight 主链外，还有哪些接口 / 页面 / 服务仍直接依赖旧表 `wecom_conversation_insights`。

---

## 2. 结论先说

结论非常明确：

> **当前还不能直接进入“停旧写灰度”。**

原因不是 latest insight 主链不稳定，而是：
- 旧表读取链仍然存在多处
- 旧表甚至不只是“被读”，还在被其他反馈链直接写入

也就是说，旧表当前仍是系统内多个旁路能力的真实依赖，而不只是一个可随时拔掉的历史兼容层。

---

## 3. 已识别的旧表直接读取链

### A. dashboard 概览
文件：
- `backend/src/modules/dashboard/service/dashboard.service.ts`

当前直接依赖旧表：
- `wecomInsightTotal`
- `highPriorityInsightTotal`

说明：
- 仪表盘统计仍直接从旧表取 insight 总量和高优先摘要数量

### B. patient 详情
文件：
- `backend/src/modules/patient/service/patient.service.ts`

当前直接依赖旧表：
- `latestInsight`

说明：
- 患者详情页的最新 insight 仍直接查旧表

### C. business feedback 链
文件：
- `backend/src/modules/wecom-intelligence/service/business-feedback.service.ts`

当前直接依赖旧表：
- `generateBusinessFeedback`
- `getCustomerBusinessFeedback`

说明：
- 这条链不仅读取旧表，而且还依赖旧表里的 `next_action_suggestions_json / plan_update_suggestions_json / intent_assessment_json` 等旧结构字段

### D. insight list/detail 旧链
文件：
- `backend/src/modules/wecom-intelligence/service/insight.service.ts`
- `backend/src/modules/wecom-intelligence/controller/insight.controller.ts`

当前直接依赖旧表：
- `listWecomInsights`
- `getWecomInsightDetail`

说明：
- latest insight 已优先走新表
- 但 insight 列表和 detail 旧接口仍直接走旧表

---

## 4. 已识别的旧表直接写入链

### E. analyze 主链
文件：
- `backend/src/modules/wecom-intelligence/service/insight.service.ts`

当前状态：
- 旧表写入 + 新表写入（双写）

### F. action feedback 链
文件：
- `backend/src/modules/wecom-intelligence/service/action-feedback.service.ts`

当前状态：
- 直接插入旧表

说明：
- 这里不是 analyze 双写遗留，而是另一条独立反馈链还在主动写旧表
- 即使 analyze 停旧写，旧表也不会真正停止新增数据

---

## 5. 这意味着什么

这次排查后，阶段判断要更精确一些：

### 可以确认的
- latest insight 主链已经基本具备新表主读能力
- 多 conversation 样本验证也已补齐

### 不能忽略的
- dashboard / patient / business-feedback / insight list/detail 仍在直接读取旧表
- action-feedback 仍在直接写旧表

所以当前不能简单地把“停旧写”理解成：
- 只把 analyze 里的旧写去掉就行

因为那样做之后：
- 旧表仍会被别的链路写
- 旧表仍会被多个消费侧直接读

---

## 6. 当前最合理的判断

当前还不适合直接进入“停旧写灰度”。

更合理的说法是：

> **现在已经完成了主链验证，但还处于“旧表旁路依赖清理前”的准备阶段。**

也就是说，下一步不该直接停 analyze 旧写，而应该先处理：
- 旧表读取链迁移
- action-feedback 的旧表写入归口问题

---

## 7. 一句话结论

本轮排查后的结论是：

**当前不能直接进入停旧写灰度；真正的关键卡点已经从主链稳定性，转移为旧表旁路读取链和旁路写入链的清理。**
