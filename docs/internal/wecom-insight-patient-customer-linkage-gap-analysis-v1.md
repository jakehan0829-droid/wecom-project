# patient detail 取不到新表 latestInsight 的原因分析 v1

更新时间：2026-03-30

## 1. 结论先说

原因已经基本查清：

> **不是 patient detail 新查询写错，也不是 patient/customer 映射表不存在，而是当前 analyze / insight 新表写入时，根本没有把 customer_id / patient_id 维度沉淀进去。**

也就是说，问题核心不在读取侧，而在写入侧的关联能力缺失。

---

## 2. 本轮核查结果

### 2.1 patient / binding / conversation 映射本身是存在的
核查发现：
- `patient` 有真实数据
- `patient_wecom_binding` 有绑定数据
- `wecom_conversations.primary_customer_id` 也已有映射数据

说明：
- 患者与企微对象之间并不是“完全没映射”
- conversation 维度已经具备拿到 patient/customer 的条件

### 2.2 旧 insight 与新 insight 当前都没沉淀 customer_id
核查结果：
- 旧表 `linked_customer_id` 基本为 `null`
- 新表 `customer_id` / `patient_id` 也为 `null`

说明：
- 当前 analyze 在写 insight 时，并没有把 conversation 关联到 patient/customer 维度

### 2.3 现有代码里 conversation 已有 primary_customer_id，但 analyze 没利用
核查 `conversation.service.ts` 可见：
- `wecom_conversations.primary_customer_id` 会被写入

但核查 `insight.service.ts` 可见：
- analyze 写旧表 / 新表时，`customerId` 主要来自 payload
- 当前联调调用 analyze 时并没有稳定传入 customerId
- 也没有在 analyze 内部主动根据 conversation 去补 `primary_customer_id`

这就是根因。

---

## 3. 为什么 patient detail 会拿不到 latestInsight

patient detail 当前已经改成：
- 按 `wecom_conversation_insights_v1.customer_id = patient.id` 查 latest insight

这条查询本身没有问题。

之所以拿不到，是因为：
- 新表中的 `customer_id` 当前没有被写进去
- 所以按 patient/customer 维度查询自然为空

---

## 4. 当前最合理的下一步判断

现在已经可以明确：

> **下一步不该优先继续迁下一条读取接口，而应该先补“新表的 patient/customer 维度关联能力”。**

原因：
- 如果继续迁别的读取接口，但新表仍没有 customer_id / patient_id，读取侧还会继续空
- 先补写入侧关联能力，后续 patient / insight list/detail / business-feedback 才有真实迁移基础

---

## 5. 建议补法

建议在 analyze 写 insight 时增加一层自动补全：
- 先按 `conversationId` 查询 `wecom_conversations.primary_customer_id`
- 把它作为 `customerId` 写入旧表/新表
- 如有需要，再补 patient/customer 语义统一命名

这样可以最快验证：
- 新生成的 insight 是否开始具备 patient/customer 维度沉淀
- patient detail 是否能正常拿到 latestInsight

---

## 6. 一句话结论

patient detail 取不到新表 latestInsight 的根因不是“读取接口问题”，而是：

**当前 analyze / insight 新表写入没有沉淀 customer_id / patient_id；所以下一步应先补新表的 patient/customer 维度关联能力，而不是继续优先迁下一条读取链。**
