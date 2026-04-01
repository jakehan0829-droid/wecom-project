# D3 最小分析主链落地方案 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于定义企业微信项目中“最小分析主链”的落地方式，目标是把 D1（分析结构）和 D2（消息采集闭环）真正串起来。

要解决的问题是：
- 分析在什么时机触发
- 用哪些输入做分析
- 最小输出是什么
- 如何落库 / 回看 / 反哺后续动作

目标不是一开始做复杂 AI 工作流，而是先形成一个**可跑、可查、可复核**的最小分析主链。

---

## 2. 最小分析主链定义

当前阶段建议把 D3 定义为：

> **基于某个会话最近一段文本消息，生成一条会话级 insight，包含 summary / stage / 五类分析数组 / evidenceMessageIds，并支持回看。**

也就是说，D3 当前先只做：
- conversation 级分析
- 最近消息窗口分析
- 最新一条 insight 输出

先不追求：
- 多版本复杂比较
- 复杂模型编排
- 多轮自动修正

---

## 3. 最小输入

当前阶段建议输入为：
- `conversationId`
- 最近 N 条消息（建议 5~20 条）
- 当前 conversation 关联的 customerId / patientId（如有）

其中消息优先选择：
- 文本消息
- 可判断的人类消息
- 去除明显重复/空噪音消息

---

## 4. 最小输出

输出结构对齐 D1：

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

## 5. 推荐触发方式

当前阶段建议只保留两种最小触发方式：

### 5.1 人工触发
适用：
- 在治理台 / 详情页点击“生成分析”
- 用于验证分析主链是否可用

优点：
- 低风险
- 易调试
- 最适合第一阶段联调

### 5.2 定时汇总触发
适用：
- 定时扫描最近有新消息的 conversation
- 为后续运营台摘要提供基础

优点：
- 更接近真实业务使用场景

### 当前不建议优先做
- 每条消息实时触发分析

原因：
- 容易造成噪音
- 容易放大错误分析
- 当前阶段先验证最小链路更重要

---

## 6. 最小处理流程

建议最小处理流程如下：

### Step 1：获取会话最近消息
- 读取 conversation 最近 N 条消息
- 仅保留文本/可判断消息
- 做最小去重与降噪

### Step 2：组织分析输入
- 拼接最近消息窗口
- 带入 conversationId / customerId / patientId
- 标记候选 evidenceMessageIds

### Step 3：生成 insight
- 输出 summary
- 输出 stage
- 输出 needs / concerns / objections / risks / nextActions
- 输出 confidence
- 输出 evidenceMessageIds

### Step 4：保存 insight
- 以 conversation 为主键维度保存最新分析
- 当前阶段可只保留最新一条或保留简单历史

### Step 5：支持回看
- 按 conversationId 查最新 insight
- 可跳回 evidence 消息

---

## 7. 当前阶段建议的最小接口 / 能力

当前阶段至少建议具备：

### 7.1 生成分析
- 输入：conversationId
- 输出：最新 insight

### 7.2 查询分析
- 输入：conversationId
- 输出：最新 insight

### 7.3 按阶段/风险简单筛选
- 例如查看 `at_risk` / `hesitating`
- 为后续运营台和提醒打基础

---

## 8. 与治理台的结合点

D3 不应孤立存在，建议直接和现有治理台结合：

### 8.1 详情页中增加 insight 区
最小展示：
- 一句话 summary
- stage
- nextActions
- evidence 消息引用

### 8.2 insight 作为治理判断辅助
可辅助：
- 重新指派 patient
- 判断当前 followup 优先级
- 判断是否需要人工重点介入

### 8.3 后续可连接运营台摘要
例如：
- 今日新增高风险会话
- 今日新增犹豫会话
- 今日新增明确需求会话

---

## 9. 当前阶段不建议过早做的事情

当前阶段不建议一开始就：
- 做复杂多模型链路
- 做每条消息实时分析
- 做大量自动动作联动
- 做复杂 insight 历史版本管理

当前更合理的是：
**先让一条 conversation 稳定产出一条可回看的 insight。**

---

## 10. 验收标准

D3 当前阶段完成的验收标准应是：
- 可对至少一个真实 conversation 生成 insight
- insight 结构符合 D1 定义
- insight 引用了真实 `evidenceMessageIds`
- 可按 conversationId 查询最新 insight
- 可用于治理判断辅助

---

## 11. 当前阶段一句话结论

D3 当前最合理的落地方向是：

> **先把“会话最近消息 -> 一条 insight -> 可回看 -> 可辅助治理”做实，再考虑自动触发、更多维度和更复杂反哺。**
