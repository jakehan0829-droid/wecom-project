# 新 insight 表 patient/customer 维度字段方案 v1

更新时间：2026-03-30

## 1. 背景

本轮排查和联调已确认：
- `wecom_conversations.primary_customer_id` 已在现网真实使用
- 该字段值并不总是 UUID，当前既存在 UUID，也存在业务型字符串（如 `pt_wecom_demo_001`）
- 当前新表 `wecom_conversation_insights_v1` 的 `customer_id` / `patient_id` 都是 UUID 类型

这导致：
- analyze 自动回填 `primary_customer_id` 时，不能稳定直接写入 `customer_id`
- patient detail 只能通过 conversation join 方式临时绕过

所以必须正式收一版字段方案，避免临时绕法扩散。

---

## 2. 当前问题本质

当前不是“没有 patient/customer 维度”，而是：

> **现网业务中的 customer/patient 标识体系，与 v1 表里强行使用 UUID 字段的设计不一致。**

这会带来两个直接问题：
1. 写入时容易因为类型不匹配报错
2. 读取时不能稳定按 patient/customer 维度直接取数

---

## 3. 方案目标

新的字段方案要同时满足：
- 能承接现网已有的 `primary_customer_id`
- 能兼容未来如果 patient/customer 统一 UUID 化的方向
- 不阻塞当前 insight 主链继续推进
- 让 patient / customer 维度查询不再依赖临时 join 绕法

---

## 4. 建议方案

## 方案结论

建议把 v1 表中的 patient/customer 维度拆成“两层表达”：

### 第一层：业务主关联键（推荐作为当前主用）
新增：
- `customer_ref text null`
- `patient_ref text null`

含义：
- 存当前业务真实使用的 patient/customer 标识
- 不强制要求必须是 UUID
- 可以直接承接 `wecom_conversations.primary_customer_id`

### 第二层：规范化 UUID 键（保留为未来标准化预留）
保留现有：
- `customer_id uuid null`
- `patient_id uuid null`

含义：
- 仅在上游确实存在 UUID 且语义清晰时再写
- 作为未来标准化主键使用
- 当前不强求主链依赖它

---

## 5. 当前推荐写入口径

在 analyze 写入 insight 时：

### 必写
- `conversation_id`
- `customer_ref = wecom_conversations.primary_customer_id`（若存在）
- `patient_ref = wecom_conversations.primary_customer_id`（若当前业务语义本质就是 patient）

### 选写
- `customer_id`：仅当值确认为 UUID 时写
- `patient_id`：仅当值确认为 UUID 时写

也就是说：

> 当前主链应先依赖 `*_ref text` 这层稳定沉淀；UUID 字段作为兼容未来标准化的增强层，而不是当前主用层。

---

## 6. 当前推荐读取口径

### patient detail
优先按：
- `patient_ref = patient.id`

而不是优先按：
- `patient_id = patient.id::uuid`

### 其他 patient/customer 维度消费侧
同理优先按：
- `customer_ref` / `patient_ref`

这样可以避免现阶段继续大量依赖 conversation join 临时绕法。

---

## 7. 对下一步迁移顺序的影响

当前最合理的下一步不是继续优先迁更多读取链，
而是：

> **先统一新表的 patient/customer 维度关联模型。**

原因：
- 如果模型不统一，继续迁读取链只会反复遇到“新表查不到数据”的问题
- 先把 `*_ref text` 这一层补齐，后续 patient / insight list/detail / business-feedback 才有稳定迁移基础

---

## 8. 一句话结论

当前 v1 表最需要补的不是更多接口迁移，而是字段模型修正：

**新增 `customer_ref` / `patient_ref` 作为当前主用的文本关联键，UUID 字段仅保留为未来标准化预留；在此之前，不建议继续优先扩读取链迁移。**
