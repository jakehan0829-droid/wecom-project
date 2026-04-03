# 多 conversation 样本验证 v1

更新时间：2026-03-30

## 1. 本轮验证目标

根据停旧表双写前预检查结论，补一轮真实多会话样本验证，判断新表主读链是否已经不再只依赖单一 demo 会话。

---

## 2. 本轮验证样本

本轮实际验证了以下 7 条 conversation：

1. `wecom:private:HanCong`
2. `wecom:group:chat_openclaw_local_005`
3. `wecom:group:chat_openclaw_local_004`
4. `wecom:group:chat_openclaw_local_002`
5. `wecom:group:chat_openclaw_local_003`
6. `wecom:group:chat_openclaw_local_001`
7. `wecom:private:mapping-chat-demo-001`

每条均执行：
- `POST /api/v1/wecom/conversations/:conversationId/analyze`
- `GET /api/v1/wecom/conversations/:conversationId/insight`

---

## 3. 验证结果概览

### 整体结果
- 7/7 conversation 的 analyze 成功
- 7/7 conversation 的 latest insight 成功
- 新表主读链路已不再仅依赖单条 demo conversation

### 字段表现
多数 conversation 已稳定返回：
- `summaryText`
- `stage`
- `confidence`
- `evidenceMessageIds`
- `d4Summary.proposalSuggestion`
- `d4Summary.actionSuggestion`

### 特殊样本
`wecom:private:HanCong` 这条会话的表现是：
- `stage = unknown`
- `evidenceCount = 0`
- `hasD4Proposal = false`
- `hasD4Action = true`

这说明：
- 当前 analyze 对“没有明显 customer 表达”的样本仍能运行
- 但输出会偏保守
- 这是预期内现象，不是接口失败

---

## 4. 当前判断

本轮样本验证已经补掉了“只验证单一 conversation”的缺口，说明：

> 新表主读 + latest insight + D4 摘要链路，已经具备多 conversation 层面的基础稳定性。

但这不等于已经可以直接正式停旧写，因为仍需继续确认：
- 是否存在其他隐性旧表读取链
- 回滚方案是否明确可执行

---

## 5. 一句话结论

多 conversation 样本验证这一项，本轮已基本补齐。当前离灰度停旧写，剩余更关键的缺口已经主要集中到：

- 旧表读取链排查
- 回滚方案 / 灰度执行卡
