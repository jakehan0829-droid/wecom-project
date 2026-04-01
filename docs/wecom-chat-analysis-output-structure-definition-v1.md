# D1 聊天分析输出结构定义 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于定义企业微信项目中“聊天分析”这条主线的最小输出结构，解决以下问题：
- 系统到底要从聊天里提炼什么
- 输出结果按什么字段组织
- 如何与客户、会话、消息关联
- 后续如何支持查询、回看、反哺方案与跟进动作

目标不是一开始就做复杂 NLP 体系，而是先定义一个**最小可落地、可回看、可反哺**的分析输出结构。

---

## 2. 分析输出的定位

聊天分析输出，不应只是“一段总结文本”，而应是可落到系统里的结构化业务结果。

因此，分析输出至少要满足四个要求：
1. **可读**：人能快速看懂
2. **可查**：能按客户/会话回看
3. **可用**：能用于跟进建议和方案更新
4. **可扩**：后续可继续补更多维度而不推翻结构

---

## 3. 最小分析对象

分析输出建议围绕以下三个对象组织：

### 3.1 会话级分析（conversation insight）
用于总结一段会话当前阶段的整体判断。

### 3.2 消息片段级分析（message evidence）
用于保留“为什么得出这个判断”的关键证据。

### 3.3 客户级变化提示（customer signal）
用于把会话中的新变化映射到客户层的判断更新。

当前阶段优先先做：
- 会话级分析
- 消息证据引用

客户级变化提示可以在第二阶段增强。

---

## 4. 最小分析维度

当前阶段建议固定五类核心维度：

### 4.1 需求点（needs）
客户明确表达的诉求、需求、偏好。

示例：
- 希望尽快安排复诊
- 想了解控糖方案
- 关注饮食管理

### 4.2 关注点 / 顾虑点（concerns）
客户关心但尚未完全解决的问题。

示例：
- 担心费用
- 担心效果
- 担心执行难度

### 4.3 异议点（objections）
客户明确表达的不认可、迟疑、抗拒。

示例：
- 觉得方案太麻烦
- 不愿频繁到院
- 暂时不考虑继续

### 4.4 风险点（risks）
需要业务上重点关注的异常或风险信号。

示例：
- 明显流失倾向
- 对服务不满
- 存在较强负面情绪
- 反复提及效果不佳

### 4.5 下一步建议（nextActions）
基于当前会话应建议采取的后续动作。

示例：
- 由顾问尽快回访
- 补发饮食方案资料
- 重点解释治疗节奏
- 继续观察，不立即打扰

---

## 5. 会话级分析最小字段结构

建议最小结构如下：

```json
{
  "insightId": "string",
  "conversationId": "string",
  "customerId": "string|null",
  "patientId": "string|null",
  "analysisVersion": "v1",
  "summary": "string",
  "stage": "new_lead|consulting|followup|hesitating|at_risk|unknown",
  "needs": ["string"],
  "concerns": ["string"],
  "objections": ["string"],
  "risks": ["string"],
  "nextActions": ["string"],
  "confidence": "high|medium|low",
  "evidenceMessageIds": ["string"],
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

---

## 6. 字段解释

### insightId
分析结果唯一 ID。

### conversationId
该分析结果对应的会话 ID。

### customerId
对应主客户 ID；没有则可为空。

### patientId
当前映射到的 patientId；没有则可为空。

### analysisVersion
分析结构版本，当前固定为 `v1`。

### summary
一句话总结当前会话状态。

要求：
- 尽量短
- 尽量面向业务判断
- 不写空泛总结

### stage
当前会话阶段判断。

当前建议枚举：
- `new_lead`：新线索/初始接触
- `consulting`：咨询中
- `followup`：跟进中
- `hesitating`：明显犹豫
- `at_risk`：存在流失/负面风险
- `unknown`：暂时无法判断

### needs / concerns / objections / risks / nextActions
五类核心分析结果，均使用字符串数组，保证最小可落地。

### confidence
用于表示本次分析可信度。

### evidenceMessageIds
指向支撑当前分析结论的消息 ID 列表，用于可回看与可复核。

---

## 7. 消息证据结构

为支持“为什么得出这个判断”，建议至少保留一层消息证据结构：

```json
{
  "messageId": "string",
  "conversationId": "string",
  "evidenceType": "need|concern|objection|risk|next_action_basis",
  "excerpt": "string",
  "createdAt": "ISO datetime"
}
```

说明：
- 当前阶段可以不单独建复杂表
- 先保证 `evidenceMessageIds` 可回指消息即可
- 如后续分析结果增多，再拆独立 evidence 结构

---

## 8. 最小查询与回看要求

分析输出落地后，至少支持三种回看方式：

### 8.1 按 conversation 回看
- 查看该会话最近一条 insight
- 查看对应 evidence message

### 8.2 按 customer / patient 回看
- 查看该客户最近 insight
- 看是否出现新增需求或风险

### 8.3 按风险/阶段筛选
- 找出 `at_risk`
- 找出 `hesitating`
- 找出存在明确 `nextActions` 的会话

---

## 9. 与后续业务反哺的关系

本结构定义的核心价值，不是“做个分析结果”，而是为后续两条路径准备落点：

### 9.1 insight -> 客户方案建议
例如：
- 补充某类资料
- 调整沟通重点
- 调整方案表达顺序

### 9.2 insight -> 跟进行动建议
例如：
- 顾问回访
- 补发资料
- 风险关注
- 暂缓打扰

因此，`nextActions` 字段必须保留，哪怕当前先用最简单字符串数组。

---

## 10. 当前阶段设计原则

### 原则 1：先结构化，后精细化
不要一开始就追求复杂标签体系，先保证最小结构闭环。

### 原则 2：先可回看，后可自动化
只要分析结果不能回看，就很难真正用于业务。

### 原则 3：先支撑业务动作，后追求分析漂亮
分析的价值在于支撑下一步，不在于写得像报告。

---

## 11. 当前阶段一句话结论

D1 当前最合理的落地方向是：

> **先用“summary + stage + 五类核心数组 + evidenceMessageIds”形成最小可回看、可复核、可反哺的聊天分析结构。**
