# D2+D3 最小接口与落地顺序清单 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于把 D2（消息采集最小闭环）和 D3（最小分析主链）从“设计文档”推进到“可实施清单”。

目标是明确：
- 最少需要哪些接口/能力
- 先做哪一步
- 每一步的输入输出是什么
- 什么算当前阶段完成

---

## 2. 最小接口清单

当前阶段建议至少补以下能力：

### API 1：按会话查询消息
用途：
- 支撑治理台详情页 message 区
- 支撑 D3 获取最近消息窗口

最小要求：
- 输入：`conversationId`
- 支持：`limit`
- 输出：最近 N 条消息

### API 2：生成会话分析
用途：
- 人工触发 D3
- 先联调最小 insight 生成链路

最小要求：
- 输入：`conversationId`
- 输出：最新 insight

### API 3：查询会话最新分析
用途：
- 详情页展示 insight
- 后续运营台回看 insight

最小要求：
- 输入：`conversationId`
- 输出：最新 insight

### API 4：按阶段 / 风险简单筛选 insight（可后补）
用途：
- 运营台摘要
- 风险会话扫描

最小要求：
- 支持：`stage` / `risk` 简单过滤

---

## 3. 最小落地顺序

### Step 1：先把消息查询能力做稳
对应：API 1

目标：
- 确保 conversation 最近消息可稳定查出
- 确保文本消息可被 D3 读取

验收：
- 指定 conversationId 能回看最近消息

### Step 2：再做 insight 生成接口
对应：API 2

目标：
- 手工触发生成一条会话级 insight
- insight 结构符合 D1

验收：
- 指定 conversationId 可生成一条最新 insight

### Step 3：补 insight 查询接口
对应：API 3

目标：
- 详情页可单独拉取当前 conversation 最新 insight
- 不依赖每次重新生成

验收：
- conversationId 可回看最近一条 insight

### Step 4：再考虑运营筛选能力
对应：API 4

目标：
- 能找出 at_risk / hesitating 等会话
- 为运营台或提醒机制做基础

验收：
- 可按 stage / risk 拉取 insight 列表

---

## 4. 推荐最小实现顺序

从工程现实看，建议顺序如下：

### 第一组（必须先做）
1. 消息查询能力
2. insight 数据结构落地
3. insight 生成人工触发接口

### 第二组（紧随其后）
4. insight 查询接口
5. 详情页 insight 展示位

### 第三组（稳定后再做）
6. 按阶段/风险筛选
7. 定时汇总触发
8. 运营台摘要接入

---

## 5. 当前阶段最小输入输出对照

### 5.1 消息查询
输入：
- conversationId
- limit

输出：
- messageId
- msgType
- contentText
- createdAt
- sender

### 5.2 insight 生成
输入：
- conversationId

输出：
- summary
- stage
- needs
- concerns
- objections
- risks
- nextActions
- confidence
- evidenceMessageIds

### 5.3 insight 查询
输入：
- conversationId

输出：
- 最新 insight 全量结构

---

## 6. 当前阶段不建议同步做的内容

为了避免过早扩张，当前阶段不建议和 D2/D3 同步硬做：
- participant 全关系建模
- 全量消息类型支持
- 复杂多版本 insight 历史
- 自动执行动作
- 复杂权限体系

当前最重要的是：
**先把“消息可查 + insight 可生 + insight 可看”这三个点做实。**

---

## 7. 当前阶段验收标准

D2+D3 当前阶段可以视为完成的标准应是：
- conversation 消息可稳定查询
- 可手工生成 insight
- 可回看某个 conversation 的最新 insight
- insight 可引用真实 evidenceMessageIds
- insight 已可在详情页被展示

---

## 8. 当前阶段一句话结论

D2+D3 当前最现实的落地顺序是：

> **先做消息查询，再做 insight 生成，再做 insight 查询与展示，最后再补运营筛选与定时触发。**
