# 停 analyze 旧写灰度执行卡 v2

更新时间：2026-03-30

## 1. 当前前提

截至当前版本：
- latest insight 主链已优先读新表
- dashboard / patient detail / insight list/detail / business-feedback 已迁到新表口径
- action-feedback 已补新表同步写入
- 新表 patient/customer ref 模型已落地

因此当前可以进入：

> **停 analyze 旧表写入的第一轮灰度。**

注意：
- 本轮灰度仅停 analyze 的旧表写入
- 不停旧表回退读
- 不移除 action-feedback 的旧表兼容写入

---

## 2. 灰度动作

### 本轮要做的
- 在 `analyzeConversationMessages` 中停止写旧表 `wecom_conversation_insights`
- 保留新表 `wecom_conversation_insights_v1` 写入
- 保留 `getLatestConversationInsight` 的旧表回退读
- 保留其他旧表兼容链不动

### 本轮不做的
- 不删除旧表
- 不删除旧表回退读
- 不移除 action-feedback 的旧表兼容写
- 不做 destructive migration

---

## 3. 灰度后重点验证项

至少验证：
1. `POST /api/v1/wecom/conversations/:conversationId/analyze`
2. `GET /api/v1/wecom/conversations/:conversationId/insight`
3. `GET /api/v1/patients/:id`
4. `GET /api/v1/wecom/insights`
5. `GET /api/v1/wecom/insights/:insightId`
6. `POST /api/v1/wecom/conversations/:conversationId/business-feedback`

重点观察：
- analyze 是否成功
- latest insight 是否仍稳定返回
- patient detail latestInsight 是否仍正常
- insight list/detail 是否仍可读到新生成数据
- business-feedback 是否仍正常

---

## 4. 回滚触发条件

出现以下任一情况，立即回滚恢复 analyze 旧表写：
- analyze 成功率明显下降
- latest insight 无法读到新生成 insight
- patient detail latestInsight 异常
- insight list/detail 无法读到新生成 insight
- business-feedback 异常

---

## 5. 回滚动作

- 恢复 `analyzeConversationMessages` 中旧表写入逻辑
- backend build
- 重启 3000
- 重测核心链路

---

## 6. 一句话结论

本轮灰度不是停整个旧表，而是：

**只停 analyze 的旧表写，保留新表写和旧表回退读，用一轮真实验证来确认系统已可脱离 analyze 对旧表的写依赖。**
