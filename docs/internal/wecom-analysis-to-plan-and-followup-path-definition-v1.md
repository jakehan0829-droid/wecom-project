# D4 分析结果 -> 客户方案建议 / 跟进行动建议路径定义 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于定义企业微信项目中，聊天分析结果如何进一步转化为：
- 客户方案建议
- 跟进行动建议

要解决的问题是：
- insight 生成之后下一步怎么用
- 哪些分析结果应进入客户方案视图
- 哪些分析结果应形成跟进行动建议
- 当前阶段先做到什么程度最合理

目标不是一开始就做复杂自动决策系统，而是先形成一个**分析结果可用、可回看、可转行动**的最小反哺路径。

---

## 2. 路径定义

当前阶段建议把 D4 拆成两条明确路径：

### 2.1 insight -> 客户方案建议
作用：
- 把聊天中暴露的新需求、顾虑、风险映射成“方案应如何调整”的建议

### 2.2 insight -> 跟进行动建议
作用：
- 把当前会话状态映射成“业务下一步该怎么做”的动作建议

这两条路径都不等于自动执行，而是先输出结构化建议。

---

## 3. insight -> 客户方案建议

### 3.1 适合进入方案建议的分析结果
优先考虑：
- `needs`
- `concerns`
- `objections`
- `risks`

### 3.2 当前阶段的最小输出结构

```json
{
  "proposalId": "string",
  "conversationId": "string",
  "customerId": "string|null",
  "patientId": "string|null",
  "sourceInsightId": "string",
  "proposalType": "need_update|risk_reminder|communication_adjustment|plan_adjustment",
  "title": "string",
  "content": "string",
  "priority": "high|medium|low",
  "createdAt": "ISO datetime"
}
```

### 3.3 proposalType 建议枚举
- `need_update`：客户需求有新增/变化
- `risk_reminder`：存在风险需在方案视图中提醒
- `communication_adjustment`：建议调整沟通重点/表达方式
- `plan_adjustment`：建议调整方案内容、顺序或补充信息

### 3.4 示例
- needs 中出现“想了解控糖饮食” -> `need_update`
- concerns 中出现“担心费用” -> `communication_adjustment`
- risks 中出现“明显流失倾向” -> `risk_reminder`

---

## 4. insight -> 跟进行动建议

### 4.1 适合进入跟进行动建议的分析结果
优先考虑：
- `stage`
- `risks`
- `nextActions`
- `confidence`

### 4.2 当前阶段的最小输出结构

```json
{
  "actionSuggestionId": "string",
  "conversationId": "string",
  "customerId": "string|null",
  "patientId": "string|null",
  "sourceInsightId": "string",
  "actionType": "manual_followup|send_material|priority_watch|defer_contact",
  "reason": "string",
  "priority": "high|medium|low",
  "suggestedOwner": "advisor|operator|doctor|unknown",
  "createdAt": "ISO datetime"
}
```

### 4.3 actionType 建议枚举
- `manual_followup`：建议人工尽快跟进
- `send_material`：建议补发资料/方案说明
- `priority_watch`：建议重点观察
- `defer_contact`：建议暂缓打扰

### 4.4 示例
- `stage = at_risk` -> `priority_watch` / `manual_followup`
- `nextActions` 包含“补发资料” -> `send_material`
- `confidence = low` -> 仅给出低优先级建议，不直接触发动作

---

## 5. 当前阶段的落地原则

### 原则 1：先给建议，不先自动执行
当前阶段先输出结构化建议，不直接自动发消息或自动改客户方案。

### 原则 2：一条 insight 可生成多条建议，但数量要克制
建议先控制在：
- 0~2 条方案建议
- 0~2 条跟进行动建议

### 原则 3：优先服务人工判断
D4 当前阶段的价值，不在“全自动”，而在“帮助人更快做下一步判断”。

---

## 6. 与治理台 / 运营台的结合方式

### 6.1 在详情页展示
建议最小展示：
- 本次 insight 的下一步建议
- 本次 insight 生成的方案建议摘要

### 6.2 在运营台展示
可用于：
- 今日新增高优先级跟进行动建议
- 今日新增风险提醒
- 今日新增方案调整建议

### 6.3 作为后续任务系统输入
后续如果引入任务系统，可把 actionSuggestion 作为任务候选输入。

---

## 7. 当前阶段不建议过早做的事

当前阶段不建议：
- 直接自动执行跟进动作
- 自动批量写客户方案
- 用复杂规则引擎做大规模决策自动化

当前更合理的是：
**先把 insight 变成结构化建议，再决定哪些建议值得进入执行层。**

---

## 8. 验收标准

D4 当前阶段完成的验收标准应是：
- 一条 insight 至少能生成 1 条可解释的方案建议或跟进行动建议
- 建议结果可按 conversationId 回看
- 建议结果能明确说明来源 insight
- 建议结果能被详情页或运营台消费

---

## 9. 当前阶段一句话结论

D4 当前最合理的落地方向是：

> **先把 insight 稳定转成结构化建议，再逐步决定哪些建议进入执行层、哪些只保留为人工判断辅助。**
