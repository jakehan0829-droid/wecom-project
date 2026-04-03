# action-feedback 去旧表兼容写灰度结果记录 v1

更新时间：2026-03-30

## 1. 本轮灰度动作

本轮已实际执行：
- 移除 `action-feedback.service.ts` 中旧表 `wecom_conversation_insights` 写入
- 保留新表 `wecom_conversation_insights_v1` 写入
- 其他旧表兼容逻辑暂不动

也就是说，本轮验证的是：

> **feedback 旁路是否也能在不写旧表的情况下继续正常工作。**

---

## 2. 本轮实际验证

本轮选取样本：
- `patient_outreach_action.id = 0a68d5bb-2321-4f67-82ff-15dda6853b4e`

实际执行：
- `POST /api/v1/patient-outreach-actions/:id/feedback`
- payload: `status=done`, `feedbackType=completed`, `notes=去旧表兼容写灰度`

---

## 3. 实际验证结果

### feedback API
- 调用成功
- 返回 action 状态更新正常

### 新表 v1
查库确认已存在对应记录：
- `conversation_id = action-feedback:0a68d5bb-2321-4f67-82ff-15dda6853b4e`
- `patient_ref = 689ca26c-b8d0-46e4-a6d3-c5b750472eff`
- `analysis_version = v1-feedback`
- `summary = 动作反馈：completed｜去旧表兼容写灰度`

### 旧表
查库结果：
- 未发现对应新增记录

---

## 4. 当前阶段结论

本轮验证说明：

> **action-feedback 已可以在不写旧表的情况下继续正常工作。**

这意味着：
- 旧表已进一步失去新增 feedback 数据来源
- feedback 旁路当前也已基本脱离旧表新增写依赖

---

## 5. 一句话结论

本轮灰度结果成立：

**action-feedback 去旧表兼容写后，feedback API 正常，新表正常落记录，旧表不再新增对应 feedback 记录。**
