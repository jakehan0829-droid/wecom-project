# 企微映射治理字段字典 v1

更新时间：2026-03-30

## 1. 目的

本文件用于固定治理台相关核心字段的取值含义，避免前端、后端、执行人各自猜枚举。

---

## 2. `matchedBy`

表示：
- 当前映射结果是通过哪条规则命中的

当前可能值：
- `patient_id`
- `external_user_id`
- `wecom_user_id`
- `conversation_primary_customer_id`
- `manual_confirmation`
- `unknown`

说明：

### `patient_id`
- customerId 本身直接就是 patient.id

### `external_user_id`
- 通过 `patient_wecom_binding.external_user_id` 命中

### `wecom_user_id`
- 通过 `patient_wecom_binding.wecom_user_id` 命中

### `conversation_primary_customer_id`
- 通过 `wecom_conversations.primary_customer_id` 命中
- 更多偏 conversation 层兜底来源

### `manual_confirmation`
- 通过人工确认 / 改绑后的 conversation 主客户命中
- 对治理台最重要的人工治理来源

### `unknown`
- 当前没有可用 matchedBy
- 可能是历史数据、未映射、或无结果样本

---

## 3. `action`

表示：
- 一条治理动作的类型

当前可能值：
- `manual_confirm`
- `manual_unconfirm`
- `reassign`
- `promote_binding`

说明：

### `manual_confirm`
- 手工把某个 conversation 确认给某个 patient

### `manual_unconfirm`
- 撤销手工确认，让会话回到自动识别状态

### `reassign`
- 把一个 conversation 从当前 patient 改绑到另一个 patient

### `promote_binding`
- 把 conversation 级人工确认提升为正式 `patient_wecom_binding`

---

## 4. `mappingStatus`

表示：
- 当前 conversation / mapping lookup 的结果状态

当前可能值：
- `matched`
- `conflict`
- `unmapped`
- `unknown`

说明：

### `matched`
- 已明确命中唯一 patient

### `conflict`
- 命中了多个候选 patient，系统不自动裁决

### `unmapped`
- 当前还没有命中任何 patient

### `unknown`
- 当前没有足够信息返回明确状态
- 更常见于兼容态或历史样本

---

## 5. `bindingType`

表示：
- 在 `patient_wecom_binding` 中沉淀 binding 时采用的绑定类型

当前可能值：
- `wecom_user`
- `external_user`
- `null`

说明：

### `wecom_user`
- 以企微用户 ID 为核心标识建立 binding

### `external_user`
- 以企微 external_user_id 为核心标识建立 binding

### `null`
- 当前动作不是 promote-binding
- 或该条审计记录不涉及 bindingType

---

## 6. 对前端的建议

### 图表 / 表格展示时不要硬编码中文含义到接口层
建议：
- 前端用字典表做展示映射
- 接口保持稳定英文枚举

### `unknown` 不要直接渲染成错误
建议文案：
- 未识别
- 暂无明确来源

### `manual_confirmation` 与 `conversation_primary_customer_id` 不要混为一谈
- `manual_confirmation` 更偏人工治理结果
- `conversation_primary_customer_id` 更偏 conversation 层兜底

---

## 7. 一句话结论

治理台相关核心枚举已经固定：前端后续应以本字典为准，不再自行猜测 `matchedBy / action / mappingStatus / bindingType` 的语义。
