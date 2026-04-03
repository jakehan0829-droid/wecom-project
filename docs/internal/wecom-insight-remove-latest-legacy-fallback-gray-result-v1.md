# latest insight 去旧表回退读灰度结果记录 v1

更新时间：2026-03-30

## 1. 本轮灰度动作

本轮已实际执行：
- 移除 `getLatestConversationInsight` 中的旧表回退读
- latest insight 仅从 `wecom_conversation_insights_v1` 返回
- 其他旧表兼容逻辑暂不动

也就是说，本轮验证的是：

> **主链是否已经可以完全不依赖旧表兜底。**

---

## 2. 本轮实际验证项

本轮已验证：
1. analyze
2. latest insight
3. patient detail latestInsight
4. insight list
5. insight detail
6. business-feedback

---

## 3. 实际验证结果

### 结果摘要
- analyze 正常
- latest insight 正常
- patient detail latestInsight 正常
- insight list/detail 正常
- business-feedback 正常

### 实测要点
- `analyzeSuccess = true`
- `latestSuccess = true`
- `latestInsightId` 正常返回
- `patientLatestInsight.insightId` 与 latest insight 一致
- `listCount = 6`
- `detailInsightId` 正常返回
- `businessFeedbackStatus = ready`

---

## 4. 当前阶段结论

本轮验证说明：

> **latest insight 主链已经可以完全脱离旧表回退读。**

这意味着：
- 主链当前已不再依赖旧表兜底
- 新表已足以支撑 latest insight 及其主要消费链

---

## 5. 一句话结论

本轮灰度结果成立：

**latest insight 去旧表回退读后，主链与主要消费链仍正常，说明主链已基本完成脱离旧表兜底。**
