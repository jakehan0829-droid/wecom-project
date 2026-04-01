# 企微映射治理台 section 口径 v1

更新时间：2026-03-30

## 1. 目的

本文件用于把治理台页面的 section 口径固定下来，避免前端后端对同一个区域理解不一致。

适用接口：
- `GET /api/v1/wecom/mapping-governance/dashboard`

---

## 2. 页面 section 建议

### Section A：顶部卡片（cards）
数据来源：
- `dashboard.cards`

建议默认口径：
- **当前筛选窗口内** 的治理动作统计
- 若未传时间参数，默认按接口当前 query 解释

建议展示：
1. 总治理动作数 → `totalActions`
2. 手工确认数 → `manualConfirmTotal`
3. 撤销确认数 → `manualUnconfirmTotal`
4. 改绑数 → `reassignTotal`
5. 提升为 binding 数 → `promoteBindingTotal`
6. 触达会话数 → `conversationTouchedTotal`

说明：
- cards 是“动作统计”，不是“当前存量问题统计”
- 因此前端不要把它误解释为“当前未处理问题总数”

---

### Section B：动作分布图（charts.byAction）
数据来源：
- `dashboard.charts.byAction`

口径：
- 当前筛选窗口内，不同治理动作类型的数量分布

适合图形：
- 柱状图
- 环形图

---

### Section C：命中来源分布图（charts.byMatchedBy）
数据来源：
- `dashboard.charts.byMatchedBy`

口径：
- 当前筛选窗口内，治理动作最终落到的 matchedBy 分布

适合图形：
- 柱状图
- 饼图

说明：
- 这是“治理结果来源分布”
- 不是“系统全量 conversation 的 matchedBy 分布”

---

### Section D：最近活跃治理会话（tables.byConversation）
数据来源：
- `dashboard.tables.byConversation`

口径：
- 当前筛选窗口内，最近发生治理动作的会话聚合列表

建议列：
- conversationId
- platformChatId
- total
- lastActionAt

说明：
- 这是“有治理动作的会话”
- 不是“所有业务会话列表”

---

### Section E：最近治理动作（tables.recentActions）
数据来源：
- `dashboard.tables.recentActions`

口径：
- 当前筛选窗口内，最近发生的治理动作明细

建议列：
- createdAt
- action
- conversationId
- fromPatientId
- toPatientId
- matchedBy
- operatorNote

默认建议：
- 最近 10 条或 20 条

---

### Section F：问题对象列表 - 未映射（tables.latestUnmappedCustomers）
数据来源：
- `dashboard.tables.latestUnmappedCustomers`

口径：
- 当前系统最新识别到的未映射私聊对象

说明：
- 这是“问题对象存量列表”
- 与 cards 的动作统计不同

建议列：
- customerId
- conversationId
- lastMessageAt
- messageCount
- status

---

### Section G：问题对象列表 - 冲突（tables.latestConflictCustomers）
数据来源：
- `dashboard.tables.latestConflictCustomers`

口径：
- 当前系统最新识别到的冲突私聊对象

建议列：
- customerId
- conversationId
- lastMessageAt
- messageCount
- status

---

## 3. 今日 / 本周口径建议

### 今日治理卡片
建议：
- `timePreset=today`
- 用于顶部“今日动作”卡片

### 本周治理概览
建议：
- `timePreset=this_week`
- 用于图表和最近治理会话区

### 问题对象列表
当前更适合看“最新问题对象”，不一定要强绑定 today / this_week。

建议：
- 默认直接取接口当前最新问题对象列表
- 不要误解为严格时间窗口内新增问题总数

---

## 4. 一句话结论

治理台页面建议拆成“动作统计区 + 分布图区 + 最近治理区 + 问题对象区”四层，避免把动作统计和问题对象存量混在一起解释。
