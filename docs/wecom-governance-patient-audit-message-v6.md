# 详情页继续增强：会话-候选对照字段 / audit 前后对照块 / 消息噪音过滤 v6

更新时间：2026-03-30

## 本轮新增

### 1. 当前会话与 patient 候选对照更明确
- 当前映射卡补充：
  - conversationId
  - conversation name
  - platformChatId
  - primaryCustomerId
  - matchedBy
- patient 候选补充：
  - recentConversationId
  - recentConversationName
- 候选卡片能更直观看到与当前会话的关系

### 2. audit 轨迹升级为前后对照块
- 最新 audit 区新增“治理前 / 治理后”双卡片
- 展示：
  - fromPatientId / toPatientId
  - 前后 mappingStatus
- 不再只靠一句总结，而是能直接看前后状态变化

### 3. 消息噪音过滤更稳
- “只看可判断消息”过滤规则进一步加强：
  - 过滤长度 <= 1 的内容
  - 过滤 `[]` / `{}` / `null` / `undefined`
  - 过滤重复空壳消息（同 sender + 同时间 + 同内容）

## 一句话结论

详情页正在逐步变成一个更接近真实治理工作台的判断面板：会话和候选能对照，audit 能看前后变化，消息噪音更少。
