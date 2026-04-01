# action-feedback 模型决策 v1

更新时间：2026-03-30

## 1. 背景

在主链、patient、dashboard、insight list/detail、business-feedback 都逐步迁到新表后，当前阻塞“停 analyze 旧表双写”的最后一条关键旁路写入链，是：
- `backend/src/modules/wecom-intelligence/service/action-feedback.service.ts`

当前这条链仍直接写旧表 `wecom_conversation_insights`。

---

## 2. 需要回答的问题

下一步更合理的是：
1. action-feedback 同步写新表
2. action-feedback 改成另一种独立反馈模型

---

## 3. 当前判断

### 结论

**短期更合理的是：先同步写新表，而不是立刻改成独立反馈模型。**

---

## 4. 原因

### 原因 1：当前首要目标是解除“停 analyze 旧表双写”的剩余阻塞
如果现在去设计独立反馈模型，会引入：
- 新表/新接口/新查询口径设计
- 反馈数据与 insight 数据关系重定义
- 额外前后端消费调整

这会把问题从“清理旧表依赖”重新拉回“新能力设计”。

### 原因 2：action-feedback 当前本质仍可视为 insight 时间线的一部分
虽然它和 analyze 自动生成 insight 不完全同质，但当前系统里它仍承担：
- 记录动作反馈结果
- 为后续业务判断提供上下文

所以短期内继续作为 insight 记录的一种特殊来源，是可以接受的。

### 原因 3：同步写新表能最快消除旧表新增数据来源
只要 action-feedback 继续只写旧表，旧表就无法真正退化为历史兼容层。

而同步写新表后：
- 可以先让新表承接完整时间线
- 再决定是否要把 feedback 独立拆模

---

## 5. 推荐策略

### Phase 1（当前建议）
- 保留 action-feedback 旧表写入
- 同时补一份新表写入
- 让新表也能承接 feedback 类 insight

### Phase 2（后续再看）
如果后续发现 feedback 与 analyze insight 在语义上差异越来越大，再评估：
- 是否拆成独立 feedback_event / feedback_log 模型
- 是否只在视图层聚合，而不再与 insight 共表

---

## 6. 一句话结论

当前更合理的选择不是立刻把 action-feedback 拆成独立模型，而是：

**先同步写新表，尽快消除旧表的最后一条关键新增数据来源；独立建模留到下一阶段再评估。**
