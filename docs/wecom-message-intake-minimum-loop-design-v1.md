# D2 消息采集最小闭环设计 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于定义企业微信项目中“消息采集”这条主线的最小闭环，回答以下问题：
- 最小闭环到底是什么
- 消息从哪里来
- 先接哪些消息类型
- 最小要落哪些字段
- 如何支撑后续分析与回看

目标不是一开始就覆盖所有消息和所有对象，而是先形成一个**真实可落地、可查询、可支撑分析**的最小闭环。

---

## 2. 最小闭环定义

当前阶段的最小消息采集闭环定义为：

> **真实企微消息进入 → 标准化解析 → 消息入库 → 归入会话 → 可按会话/客户回看 → 可供 D1 分析结构引用。**

这个定义里最关键的不是“接到消息”，而是要保证消息成为系统资产，而不是 transient payload。

---

## 3. 当前阶段优先接入范围

### 3.1 第一优先级
先接：
- 私聊文本消息
- 群聊文本消息（若当前真实入口可得）
- `enter_agent` 进入类事件对应的最小上下文

原因：
- 文本消息最直接支撑 D1 的 needs / concerns / objections / risks / nextActions
- 文本是最适合先做分析的消息类型

### 3.2 第二优先级
后续再补：
- 图片消息
- 文件消息
- 非文本系统事件

原因：
- 这些类型可先保留原始记录，但不作为 D2 第一阶段分析主链重点

---

## 4. 最小数据流

建议最小数据流如下：

### Step 1：接收原始消息 / 事件
来源：
- 企业微信 webhook POST

要求：
- 完成验签/解密
- 标准化消息体

### Step 2：做标准化解析
最小标准化结果包括：
- messageId
- msgType
- sender / from
- conversationId
- chatType（private/group）
- contentText（如可提取）
- rawPayload
- createdAt

### Step 3：消息入库
至少保存：
- 原始内容
- 标准化字段
- 会话关联信息
- 客户/患者关联线索（如已有）

### Step 4：归入会话
要求：
- 能把消息稳定挂到某个 conversationId
- 若 conversation 不存在，则创建最小会话壳

### Step 5：支持业务回看
至少支持：
- 按 conversationId 查消息
- 按 customerId / patientId 查会话消息
- 按时间范围回看

### Step 6：供分析链引用
要求：
- D1 insight 可通过 `evidenceMessageIds` 回指消息
- 至少保证 messageId 稳定可引用

---

## 5. 最小消息字段建议

当前阶段建议最小字段如下：

```json
{
  "messageId": "string",
  "conversationId": "string",
  "chatType": "private|group",
  "senderId": "string|null",
  "senderName": "string|null",
  "externalUserId": "string|null",
  "customerId": "string|null",
  "patientId": "string|null",
  "msgType": "text|image|file|event|unknown",
  "contentText": "string|null",
  "rawPayload": {},
  "createdAt": "ISO datetime",
  "ingestedAt": "ISO datetime"
}
```

---

## 6. 最小会话组织要求

消息采集不能只停在 message 表，必须具备最小会话组织能力。

### 当前阶段至少满足：
- 一条消息必须能归到 conversationId
- conversation 至少区分 private / group
- conversation 至少挂住一个当前主 customerId（如已有）
- 若 patient 映射已存在，可保留 patientId

### 当前不强求：
- 一开始就把 participant 关系做全
- 一开始就做完整群成员图谱

这些内容应留到 C 线进一步展开。

---

## 7. 最小查询能力要求

D2 完成后，至少要能支持下面三类查询：

### 7.1 conversation 视角
- 查某会话最近 N 条消息
- 支撑治理台详情页 message 区

### 7.2 customer / patient 视角
- 查某客户/患者关联的会话消息
- 为客户视图与 insight 回看准备基础

### 7.3 时间视角
- 查某时间窗口内新进入系统的消息
- 为后续自动触发与巡检准备基础

---

## 8. 当前阶段与 D1/D3 的衔接关系

### 对 D1 的支撑
D2 的目标是让 D1 结构里需要的：
- conversationId
- customerId / patientId
- evidenceMessageIds
- 文本证据

都具备稳定来源。

### 对 D3 的支撑
D2 做完后，D3 才能做：
- 从最近消息中提炼 summary
- 做 stage 判断
- 生成 needs / concerns / objections / risks / nextActions

所以 D2 本质上是 D3 的输入底座。

---

## 9. 当前阶段不应过度扩张的点

当前阶段不建议一开始就：
- 覆盖所有企微事件类型
- 强行做完整多媒体解析
- 同步做复杂 participant 关系网
- 把 D2 做成大而全消息中台

当前更重要的是先形成：
**文本消息 -> 入库 -> 会话组织 -> 可回看 -> 可供分析引用**

---

## 10. 验收标准

D2 当前阶段完成的验收标准应是：
- 至少一种真实文本消息可稳定入库
- 能稳定挂到 conversationId
- 能按 conversation 回看最近消息
- D1 中的 `evidenceMessageIds` 已具备真实可引用基础

---

## 11. 当前阶段一句话结论

D2 当前最合理的落地方向是：

> **先把“文本消息进入系统并可按会话回看”做实，再继续扩更多消息类型和更复杂关系。**
