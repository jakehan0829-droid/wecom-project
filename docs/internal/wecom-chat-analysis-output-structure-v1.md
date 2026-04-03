# 企微聊天分析输出结构定义 V1

## 1. 文档目的

本文件用于定义企微项目中“聊天分析结果”应输出什么、如何组织、如何落到业务使用层，作为后续实现客户聊天分析能力的统一结构基础。

目标不是做泛泛摘要，而是把客户在企业微信群与私聊中的互动内容转成**可用于需求判断、方案优化和后续跟进的结构化结果**。

---

## 2. 使用场景

本输出结构适用于以下场景：
- 分析某位客户最近一段聊天记录
- 分析某个群聊近期互动情况
- 分析一段会话中的客户需求变化
- 对重点客户生成阶段性互动摘要
- 为客户方案、跟进策略、风险预警提供依据

---

## 3. 输出原则

### 3.1 先有业务价值，再追求复杂度
分析输出首先要服务：
- 客户需求理解
- 跟进策略调整
- 风险识别
- 方案完善

### 3.2 先结构化，再摘要化
不能只输出一句“客户对方案比较感兴趣”。
必须尽量拆成可复用字段。

### 3.3 结论必须可追溯
每条关键结论应尽量能追溯到对应消息、会话或时间窗口。

### 3.4 允许不确定性
对低置信度判断，不强行下结论，应保留“不确定”或“待确认”。

---

## 4. 最小输出结构

建议 V1 阶段每次聊天分析至少输出以下结构。

### 4.1 基础信息（meta）
建议字段：
- `analysis_id`
- `analysis_type`：single_customer / conversation / group_window / manual_review
- `conversation_id`
- `customer_id`（可为空）
- `time_window_start`
- `time_window_end`
- `message_count`
- `generated_at`
- `generated_by`：system / ai / manual
- `confidence_score`：0-1

作用：
- 标识这次分析针对谁、分析了什么范围、可信度如何

---

### 4.2 会话摘要（summary）
建议字段：
- `summary_text`
- `summary_short`
- `interaction_stage`
- `overall_signal`：positive / neutral / mixed / negative / unclear

说明：
- `summary_text`：较完整总结
- `summary_short`：便于看板或客户卡片展示
- `interaction_stage`：例如初步沟通、需求确认、异议处理中、推进受阻、待跟进等

---

### 4.3 需求点（need_points）
表示客户明确表达或隐含表达的需求。

每个需求点建议字段：
- `title`
- `description`
- `priority`：high / medium / low / unknown
- `status`：new / repeated / confirmed / unresolved
- `evidence_refs`

输出要求：
- 尽量区分新需求和重复需求
- 不要把普通寒暄误判成需求

---

### 4.4 关注点（concern_points）
表示客户重点关心、反复提到或持续关注的问题。

每项建议字段：
- `title`
- `description`
- `intensity`：high / medium / low
- `status`：active / resolved / unclear
- `evidence_refs`

说明：
- 关注点不一定是异议，也可能是重点考虑因素

---

### 4.5 异议点（objection_points）
表示客户明确表示质疑、顾虑、阻力或犹豫的地方。

每项建议字段：
- `title`
- `description`
- `severity`：high / medium / low
- `objection_type`：price / trust / timing / effect / process / unknown
- `status`：active / softened / resolved / unclear
- `evidence_refs`

说明：
- 这部分对销售推进、服务设计和跟进策略很关键

---

### 4.6 风险信号（risk_signals）
表示客户互动中体现出的风险。

每项建议字段：
- `title`
- `description`
- `risk_level`：high / medium / low
- `risk_type`：drop_off / dissatisfaction / delay / misunderstanding / silence / unknown
- `recommended_action`
- `evidence_refs`

说明：
- 风险信号优先用于提醒和决策，不要求一开始做过细分类

---

### 4.7 意图判断（intent_assessment）
表示对客户当前意向、合作推进可能性或互动积极度的判断。

建议字段：
- `intent_level`：high / medium / low / unclear
- `intent_reasoning`
- `stage_judgement`
- `is_ready_for_next_step`

说明：
- 要允许 unclear
- 不要过度乐观推断

---

### 4.8 下一步建议（next_action_suggestions）
表示基于聊天内容给出的后续动作建议。

每项建议字段：
- `action_type`：follow_up / clarify / send_material / update_plan / escalate / wait
- `action_text`
- `priority`：high / medium / low
- `reason`
- `related_need_or_risk`

说明：
- 这部分是分析结果真正转成行动的关键

---

### 4.9 方案更新建议（plan_update_suggestions）
表示针对客户方案或服务方案的调整建议。

每项建议字段：
- `suggestion_type`：need_update / scope_adjustment / communication_adjustment / risk_notice / priority_adjustment
- `suggestion_text`
- `reason`
- `evidence_refs`

说明：
- 用于反哺客户方案，不应停留在聊天摘要层

---

### 4.10 证据引用（evidence_refs）
所有关键结论尽量带证据引用。

建议结构：
- `message_id`
- `conversation_id`
- `timestamp`
- `excerpt`

作用：
- 便于复盘和人工校验
- 防止分析结果“看起来像结论，实际上没依据”

---

## 5. 建议 JSON 结构示例

```json
{
  "meta": {
    "analysis_id": "analysis_xxx",
    "analysis_type": "single_customer",
    "conversation_id": "conv_xxx",
    "customer_id": "cust_xxx",
    "time_window_start": "2026-03-28T10:00:00+08:00",
    "time_window_end": "2026-03-28T14:00:00+08:00",
    "message_count": 28,
    "generated_at": "2026-03-28T14:30:00+08:00",
    "generated_by": "system",
    "confidence_score": 0.79
  },
  "summary": {
    "summary_text": "客户主要在确认服务流程与随访频次，对执行周期仍有疑虑。",
    "summary_short": "需求明确，但对周期有顾虑",
    "interaction_stage": "需求确认中",
    "overall_signal": "mixed"
  },
  "need_points": [],
  "concern_points": [],
  "objection_points": [],
  "risk_signals": [],
  "intent_assessment": {
    "intent_level": "medium",
    "intent_reasoning": "客户持续提问且未拒绝，但仍存在周期顾虑。",
    "stage_judgement": "需求确认中",
    "is_ready_for_next_step": true
  },
  "next_action_suggestions": [],
  "plan_update_suggestions": []
}
```

---

## 6. 分析结果如何进入业务使用层

聊天分析结果至少应落到三个业务入口：

### 6.1 客户视图
展示：
- 最近需求点
- 最近风险点
- 最新阶段判断
- 下一步建议

### 6.2 方案视图
展示：
- 方案需要补充什么
- 方案当前哪里与客户认知不匹配
- 是否需要调整表达方式、节奏、优先级

### 6.3 运营/提醒视图
展示：
- 重点客户异动
- 新增需求提醒
- 高风险对话提醒
- 需要立即跟进的对象

---

## 7. V1 阶段不建议过度做的事

- 不建议一开始做特别复杂的情感分析体系
- 不建议一开始把标签体系做得过细
- 不建议用过多低价值字段堆满结果
- 不建议输出特别长但不可执行的分析报告

V1 阶段应优先保证：
- 看得懂
- 用得上
- 能回查
- 能推动后续动作

---

## 8. 文档结论

企微聊天分析输出结构 V1 的核心要求是：

> 每次分析都应至少输出“摘要、需求点、关注点、异议点、风险信号、意图判断、下一步建议、方案更新建议”八类结果，
> 并尽量附带证据引用，确保结果可用于客户方案优化与跟进动作。

本结构作为后续分析实现与业务接入的统一输出标准。
