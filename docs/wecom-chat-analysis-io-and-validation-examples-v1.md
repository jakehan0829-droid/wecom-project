# 企微聊天分析闭环输入输出样例与验证样例 V1

## 1. 文档目的

本文件用于给出企微最小聊天分析闭环的输入、输出和验证样例，帮助后续开发、联调和验收更快落地。

目标是回答三个问题：
1. 分析输入长什么样
2. 分析输出长什么样
3. 怎样算“最小聊天分析闭环已打通”

---

## 2. 最小输入样例

### 场景：单客户私聊，最近 4 条文本消息

```json
{
  "customerId": "cust_001",
  "conversationId": "conv_private_001",
  "timeWindow": {
    "start": "2026-03-28T14:00:00+08:00",
    "end": "2026-03-28T15:00:00+08:00"
  },
  "messages": [
    {
      "messageId": "msg_001",
      "senderRole": "customer",
      "contentText": "我想了解这个慢病管理具体怎么安排",
      "sentAt": "2026-03-28T14:05:00+08:00"
    },
    {
      "messageId": "msg_002",
      "senderRole": "staff",
      "contentText": "我们会按阶段做随访、记录和管理。",
      "sentAt": "2026-03-28T14:08:00+08:00"
    },
    {
      "messageId": "msg_003",
      "senderRole": "customer",
      "contentText": "周期会不会太长，我担心自己坚持不下来",
      "sentAt": "2026-03-28T14:12:00+08:00"
    },
    {
      "messageId": "msg_004",
      "senderRole": "customer",
      "contentText": "另外我比较关心后面是不是有人持续跟进",
      "sentAt": "2026-03-28T14:15:00+08:00"
    }
  ]
}
```

---

## 3. 最小输出样例

```json
{
  "meta": {
    "analysisId": "analysis_001",
    "analysisType": "single_customer",
    "conversationId": "conv_private_001",
    "customerId": "cust_001",
    "messageCount": 4,
    "generatedAt": "2026-03-28T15:05:00+08:00",
    "generatedBy": "system",
    "confidenceScore": 0.82
  },
  "summary": {
    "summaryText": "客户对慢病管理服务有明确兴趣，当前重点关注服务周期和持续跟进机制。",
    "summaryShort": "有兴趣，但关心周期与持续跟进",
    "interactionStage": "需求确认中",
    "overallSignal": "mixed"
  },
  "needPoints": [
    {
      "title": "了解服务安排",
      "description": "客户希望知道慢病管理服务具体如何开展。",
      "priority": "high",
      "status": "confirmed",
      "evidenceRefs": ["msg_001"]
    }
  ],
  "concernPoints": [
    {
      "title": "持续跟进机制",
      "description": "客户关心后续是否有人持续跟进。",
      "intensity": "high",
      "status": "active",
      "evidenceRefs": ["msg_004"]
    }
  ],
  "objectionPoints": [
    {
      "title": "服务周期可能过长",
      "description": "客户担心周期过长导致难以坚持。",
      "severity": "medium",
      "objectionType": "timing",
      "status": "active",
      "evidenceRefs": ["msg_003"]
    }
  ],
  "riskSignals": [
    {
      "title": "执行坚持风险",
      "description": "客户担心自己难以长期坚持，存在后续流失风险。",
      "riskLevel": "medium",
      "riskType": "drop_off",
      "recommendedAction": "强调分阶段执行与陪伴机制",
      "evidenceRefs": ["msg_003"]
    }
  ],
  "intentAssessment": {
    "intentLevel": "medium",
    "intentReasoning": "客户主动提问且持续追问细节，但仍存在周期顾虑。",
    "stageJudgement": "需求确认中",
    "isReadyForNextStep": true
  },
  "nextActionSuggestions": [
    {
      "actionType": "clarify",
      "actionText": "进一步解释服务周期如何分阶段推进，降低客户对长期负担的担忧。",
      "priority": "high",
      "reason": "客户对执行周期存在明显顾虑",
      "relatedNeedOrRisk": "服务周期可能过长"
    },
    {
      "actionType": "follow_up",
      "actionText": "明确说明后续由谁持续跟进、跟进频率和形式。",
      "priority": "high",
      "reason": "客户明确关心是否有持续跟进",
      "relatedNeedOrRisk": "持续跟进机制"
    }
  ],
  "planUpdateSuggestions": [
    {
      "suggestionType": "communication_adjustment",
      "suggestionText": "在客户方案表达中加入“分阶段推进、持续陪伴”的说明，弱化客户对周期长的顾虑。",
      "reason": "客户同时关心周期与持续跟进",
      "evidenceRefs": ["msg_003", "msg_004"]
    }
  ]
}
```

---

## 4. 验证样例 1：最小私聊分析闭环

### 验证目标
证明系统能完成：
**读取消息 → 分析 → 输出结构化结果 → 保存/回看结果**

### 步骤
1. 准备一组私聊文本消息
2. 将消息组织到某 customer + conversation 下
3. 触发一次最小分析
4. 产出结构化 JSON
5. 将分析结果存入 insight 结构
6. 再按 customer 或 conversation 查询该 insight

### 通过标准
- 成功生成完整分析结果
- 至少包含八类输出
- 至少生成一条 nextActionSuggestion
- 至少生成一条 planUpdateSuggestion
- 可回看结果

---

## 5. 验证样例 2：群聊阶段性摘要验证

### 验证目标
证明系统在群聊场景下也能做最小分析，不只支持私聊。

### 输入示意
- 一个客户服务群
- 最近 10 条文本消息
- 含客户发言与我方发言

### 期望输出
- 群聊阶段性摘要
- 本阶段主要需求点
- 当前主要异议点
- 当前风险信号
- 下一步群聊跟进建议

### 通过标准
- 能基于 conversation 输出结构化结果
- 能初步识别客户真实关注内容

---

## 6. 验证样例 3：方案反哺验证

### 验证目标
证明分析结果可以反哺客户方案，而不是只做摘要。

### 步骤
1. 准备一组客户表达顾虑的聊天记录
2. 生成结构化分析结果
3. 检查是否生成 planUpdateSuggestion
4. 检查建议是否与客户真实表达一致

### 通过标准
- 至少输出一条合理的方案更新建议
- 建议能说明为什么需要调整
- 建议可追溯到原始消息

---

## 7. 最小闭环打通判定标准

如果满足以下条件，则可判定“企微最小聊天分析闭环已打通”：

1. 系统能基于 customer/conversation 拉取消息
2. 系统能生成结构化分析结果
3. 结果包含最小八类输出
4. 结果能保存
5. 结果能查询回看
6. 结果至少能输出一个下一步建议
7. 结果至少能输出一个方案更新建议

---

## 8. 文档结论

本文件的核心作用是：

> 把聊天分析闭环从抽象结构推进到“可拿样例验证”的层面，
> 让后续开发、联调和验收都能围绕真实输入输出展开，而不是停留在概念讨论中。
