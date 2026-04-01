# 停 analyze 旧写灰度结果记录 / 阶段结论 v1

更新时间：2026-03-30

## 1. 本轮灰度动作

本轮已实际执行：
- 停止 `analyzeConversationMessages` 向旧表 `wecom_conversation_insights` 写入
- 保留新表 `wecom_conversation_insights_v1` 写入
- 保留 latest insight 的旧表回退读
- 保留其他旧表兼容链不动

也就是说，本轮灰度范围是：

> **只停 analyze 的旧写，不停旧表回退读。**

---

## 2. 本轮实际验证项

本轮已真实验证以下核心链路：
1. `POST /api/v1/wecom/conversations/:conversationId/analyze`
2. `GET /api/v1/wecom/conversations/:conversationId/insight`
3. `GET /api/v1/patients/:id`
4. `GET /api/v1/wecom/insights`
5. `GET /api/v1/wecom/insights/:insightId`
6. `POST /api/v1/wecom/conversations/:conversationId/business-feedback`

---

## 3. 实际验证结果

### 结果摘要
- analyze 成功
- latest insight 成功
- patient detail latestInsight 正常
- insight list 正常
- insight detail 正常
- business-feedback 正常

### 实测结果要点
- `analyzeSuccess = true`
- `latestSuccess = true`
- `patientLatestInsight` 正常返回
- `listCount = 4`
- `detailInsightId` 正常返回
- `businessFeedbackStatus = ready`

---

## 4. 当前阶段结论

本轮验证说明：

> **在 analyze 不再写旧表的情况下，主链和主要消费链当前仍可正常运行。**

这意味着：
- 前期围绕新表主读写的迁移和补链，已经足以支撑 analyze 脱离旧表写依赖
- 当前没有出现必须立即回滚 analyze 旧写的明显信号

---

## 5. 下一步判断

### 当前更适合进入：继续观察期
而不是立刻继续大幅收口旧表兼容逻辑。

原因：
- analyze 停旧写虽然已跑通第一轮灰度，但观察窗口还太短
- latest insight 的旧表回退读仍保留，说明系统还处于兼容过渡态
- action-feedback 的旧表兼容写仍保留，暂不适合立刻进一步硬收口

### 这意味着什么
下一阶段重点应是：
- 观察一段时间是否出现异常
- 确认没有隐性依赖 analyze 旧写的消费链
- 再决定是否进一步缩减旧表兼容逻辑

---

## 6. 一句话结论

本轮灰度结果成立：

**analyze 停旧写的第一轮灰度已通过，当前更适合进入“继续观察期”，而不是立刻进一步硬收口旧表兼容逻辑。**
