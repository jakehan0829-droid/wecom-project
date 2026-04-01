# 停旧表双写前预检查结论 v1

更新时间：2026-03-30

## 1. 本轮预检查目标

根据《停旧表双写前检查清单 v1》，先做一轮轻量预检查，判断当前离“灰度停旧写”还差哪几项。

---

## 2. 当前已满足项

### 已满足
- analyze 接口可成功调用
- latest insight 接口可成功调用
- latest insight 已优先读取新表
- 新表 `wecom_conversation_insights_v1` 已建表成功
- analyze 后新表已有真实记录
- 新表已包含：
  - `summary`
  - `stage`
  - `needs_json`
  - `next_actions_json`
  - `confidence`
  - `evidence_message_ids_json`
- detail 页 insight 区已具备：
  - summary
  - stage
  - confidence
  - generatedAt
  - evidenceMessageIds
  - D4 摘要展示
- 前端 build 通过

---

## 3. 当前仍未完全满足项

### 仍需继续确认
- analyze / latest insight 是否已覆盖足够多的 conversation 样本
- 是否还有其他隐性读取链依赖旧表特有结构
- detail 页之外的消费侧是否已完全能围绕新表运行
- 是否已准备正式停旧写后的回滚步骤

---

## 4. 当前阶段判断

当前已经不是“能不能考虑停旧写”的问题，
而是：

> **已经可以开始为灰度停旧写做准备，但还不适合立刻正式停。**

原因：
- 主链已基本就绪
- 新表主读已成立
- 但样本覆盖、旧依赖排查、回滚准备还没完全做完

---

## 5. 当前离灰度停旧写还差的关键项

建议优先补三项：

### 1. 多会话样本验证
- 不只验证单条 `mapping-chat-demo-001`
- 至少再覆盖几条 conversation

### 2. 旧表读取链排查
- 看是否还有页面/接口隐性直接依赖旧表

### 3. 回滚方案明确
- 明确如果停旧写后出现异常，如何恢复旧写

---

## 6. 一句话结论

本轮预检查的结论是：

**当前已经接近可以进入“停旧写灰度准备期”，但还差样本覆盖、旧依赖排查、回滚方案三项关键确认。**
