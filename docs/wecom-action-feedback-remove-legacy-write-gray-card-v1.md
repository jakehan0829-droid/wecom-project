# action-feedback 去旧表兼容写灰度执行卡 v1

更新时间：2026-03-30

## 1. 当前前提

截至当前：
- action-feedback 新表同步写已验证成立
- 主链和主要消费链已基本脱离旧表兜底
- latest insight 已去掉旧表回退读

因此当前可以进入：

> **去掉 action-feedback 旧表兼容写的小灰度。**

---

## 2. 本轮灰度动作

- 在 `action-feedback.service.ts` 中移除旧表 `wecom_conversation_insights` 写入
- 保留新表 `wecom_conversation_insights_v1` 写入
- 其他旧表兼容逻辑暂不动

本轮目标是：

> **验证 feedback 旁路是否也能在不写旧表的情况下继续正常工作。**

---

## 3. 本轮重点验证项

至少验证：
1. `POST /api/v1/patient-outreach-actions/:id/feedback`
2. 新表中是否出现对应 feedback 记录
3. 旧表中是否不再出现新的对应 feedback 记录
4. feedback API 是否仍成功

---

## 4. 回滚条件

出现以下任一情况，立即恢复旧表兼容写：
- feedback API 失败
- 新表未落 feedback 记录
- feedback 时间线明显缺失

---

## 5. 一句话结论

本轮灰度不是处理整个旧表，而是：

**先去掉 action-feedback 的旧表兼容写，验证旧表是否可以进一步停止新增 feedback 写入。**
