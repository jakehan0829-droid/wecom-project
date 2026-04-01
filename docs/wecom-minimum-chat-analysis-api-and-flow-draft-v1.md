# 企微最小聊天分析闭环接口与处理流程草案 V1

## 1. 文档目的

本文件用于把《企微最小聊天分析闭环任务单 V1》继续推进到更接近实现的层面，给出最小可用的接口草案与处理流程草案。

目标是支撑最小分析闭环：

**读取消息 → 组织输入 → 执行分析 → 生成结构化结果 → 保存 insight → 查询回看**

---

## 2. 最小接口草案

## 2.1 按会话触发分析
### `POST /api/wecom/conversations/:conversationId/analyze`

用途：
- 对指定会话执行一次最小分析

建议请求体：
```json
{
  "customerId": "cust_001",
  "timeWindow": {
    "start": "2026-03-28T14:00:00+08:00",
    "end": "2026-03-28T15:00:00+08:00"
  },
  "limit": 50,
  "mode": "manual"
}
```

建议响应：
```json
{
  "success": true,
  "conversationId": "conv_private_001",
  "insightId": "analysis_001",
  "messageCount": 4,
  "generatedAt": "2026-03-28T15:20:00+08:00"
}
```

---

## 2.2 按客户触发分析
### `POST /api/wecom/customers/:customerId/analyze-latest`

用途：
- 对某客户最近一段消息执行一次分析

建议请求体：
```json
{
  "conversationId": "conv_private_001",
  "limit": 30,
  "mode": "manual"
}
```

用途说明：
- 更适合“看某个客户最近聊了什么、系统怎么理解”的场景

---

## 2.3 查询分析结果列表
### `GET /api/wecom/insights`

建议查询参数：
- `customerId`
- `conversationId`
- `startTime`
- `endTime`
- `limit`

用途：
- 查询某客户或某会话下的分析结果

---

## 2.4 查询单条分析结果详情
### `GET /api/wecom/insights/:insightId`

用途：
- 查看一次分析的完整结构化结果

返回内容建议包含：
- summary
- need points
- concern points
- objection points
- risk signals
- intent assessment
- next action suggestions
- plan update suggestions
- evidence refs

---

## 3. 最小处理流程草案

## 3.1 输入准备阶段
步骤：
1. 接收 analyze 请求
2. 确定 analysis scope：按 conversation 还是按 customer
3. 确定时间窗口或最近 N 条消息范围
4. 查询 `wecom_messages`
5. 过滤掉非文本或无效消息（V1 阶段）
6. 形成标准化分析输入

输出：
- 一组按时间排序的消息
- 对应 customer / conversation 上下文

---

## 3.2 分析执行阶段
步骤：
1. 读取消息集合
2. 生成 summary
3. 提炼 need_points
4. 提炼 concern_points
5. 提炼 objection_points
6. 提炼 risk_signals
7. 生成 intent_assessment
8. 生成 next_action_suggestions
9. 生成 plan_update_suggestions
10. 生成 confidence_score

输出：
- 统一 JSON 结构的 insight

---

## 3.3 结果保存阶段
步骤：
1. 生成 `insight_id`
2. 写入 `wecom_conversation_insights`
3. 记录关联的 customer / conversation
4. 标记相关 message 的分析状态（可选）

输出：
- 可查询、可回看的 insight 记录

---

## 3.4 结果查询与使用阶段
步骤：
1. 用户或系统查询 insight
2. 在客户视图 / 会话视图中显示结果
3. 后续用于方案建议、跟进建议或自动提醒

---

## 4. 输入输出最小要求

### 输入最小要求
- 至少一组文本消息
- 明确的 customer 或 conversation 范围
- 可选的时间窗口或 limit

### 输出最小要求
必须包含：
- `summary`
- `needPoints`
- `concernPoints`
- `objectionPoints`
- `riskSignals`
- `intentAssessment`
- `nextActionSuggestions`
- `planUpdateSuggestions`

---

## 5. 最小实现建议

### V1 优先支持
- 手动触发分析
- 私聊分析优先
- 最近 N 条文本消息分析
- 分析结果入库与回看

### V1 暂不强求
- 复杂自动调度
- 多模态消息统一分析
- 非结构化长报告
- 高级自动运营策略

---

## 6. 验收标准

本草案可用于进入实现讨论的标准：
- 至少有一个 analyze 入口
- 至少能基于一组消息生成 insight
- insight 可写入数据库
- insight 可查询回看
- insight 至少能给出一条 nextActionSuggestion
- insight 至少能给出一条 planUpdateSuggestion

---

## 7. 文档结论

本版本接口与流程草案的核心目标是：

> 先把最小聊天分析闭环在接口层与处理流程层定义清楚，
> 为后续开发、联调与验收提供直接可执行的实现基础。
