# 去掉 latest insight 旧表回退读灰度执行卡 v1

更新时间：2026-03-30

## 1. 当前前提

截至当前版本：
- analyze 已停止写旧表
- latest insight 主链已长期优先读新表
- 主要读取侧与 feedback 旁路已迁到新表或已同步写新表
- 观察期抽检未发现明显隐性旧写依赖

因此当前可以进入：

> **去掉 latest insight 旧表回退读的小灰度。**

---

## 2. 本轮灰度动作

- 在 `getLatestConversationInsight` 中移除旧表回退读
- latest insight 仅从 `wecom_conversation_insights_v1` 返回
- 其他旧表兼容逻辑暂不动

也就是说，本轮目标是：

> **验证主链是否已可以完全不依赖旧表兜底。**

---

## 3. 本轮重点验证项

至少验证：
1. `POST /api/v1/wecom/conversations/:conversationId/analyze`
2. `GET /api/v1/wecom/conversations/:conversationId/insight`
3. `GET /api/v1/patients/:id`
4. `GET /api/v1/wecom/insights`
5. `GET /api/v1/wecom/insights/:insightId`
6. `POST /api/v1/wecom/conversations/:conversationId/business-feedback`

重点观察：
- latest insight 是否仍稳定返回
- patient detail latestInsight 是否仍正常
- list/detail 是否仍能拿到新生成 insight
- business-feedback 是否仍正常

---

## 4. 回滚条件

出现以下任一情况，立即恢复 latest insight 的旧表回退读：
- latest insight 查不到新生成数据
- patient detail latestInsight 异常
- business-feedback 异常增加
- insight list/detail 与 latest 表现明显分裂

---

## 5. 一句话结论

本轮灰度不是收掉整个旧表，而是：

**先收掉 latest insight 的旧表回退读，验证主链是否已经可以彻底脱离旧表兜底。**
