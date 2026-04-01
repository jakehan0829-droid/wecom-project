# D3 insight 数据表 / 存储结构草案 v1

更新时间：2026-03-30

## 1. 文档目标

本文件用于定义 D3 会话级 insight 的最小存储结构，回答以下问题：
- insight 存在哪里
- 最小字段有哪些
- 如何和 conversation / customer / patient 关联
- 如何支持最新一条回看
- 是否需要保留历史

目标不是一开始就设计复杂分析仓库，而是先定义一个**足够支撑 D3 当前阶段落地**的存储结构。

---

## 2. 当前阶段总体建议

当前阶段建议新增一张独立表，例如：

`wecom_conversation_insights`

原因：
- insight 不属于 message 原表
- insight 不应混进 mapping audit 表
- insight 后续可能会有版本、建议、筛选等扩展
- 独立表更利于后续 D4 接续

---

## 3. 最小字段建议

建议最小字段如下：

| 字段 | 类型建议 | 说明 |
|---|---|---|
| id | uuid | 主键 |
| conversation_id | text | 会话 ID |
| customer_id | uuid nullable | 当前主客户 ID |
| patient_id | uuid nullable | 当前映射患者 ID |
| analysis_version | text | 当前固定 `v1` |
| summary | text | 一句话总结 |
| stage | text | 阶段判断 |
| needs_json | jsonb | 需求点数组 |
| concerns_json | jsonb | 顾虑点数组 |
| objections_json | jsonb | 异议点数组 |
| risks_json | jsonb | 风险点数组 |
| next_actions_json | jsonb | 下一步建议数组 |
| confidence | text | `high/medium/low` |
| evidence_message_ids_json | jsonb | 证据消息 ID 数组 |
| source_message_count | integer | 本次分析使用的消息条数 |
| source_window_start_at | timestamptz nullable | 本次分析窗口起点 |
| source_window_end_at | timestamptz nullable | 本次分析窗口终点 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

---

## 4. 为什么数组先用 jsonb

当前阶段建议：
- `needs`
- `concerns`
- `objections`
- `risks`
- `nextActions`
- `evidenceMessageIds`

都先用 `jsonb` 存数组，而不是立刻拆多张子表。

原因：
1. 当前阶段重点是先让 D3 跑起来
2. 查询模式以“拉最新一条 insight” 为主
3. 过早拆子表会增加实现复杂度
4. 后续若筛选维度变复杂，再演进也来得及

---

## 5. 是否保留历史

当前阶段建议：

### 建议保留历史记录
但：
- 默认查询只取最新一条
- 不急着做复杂版本对比

原因：
- 保留历史更利于后续观察 insight 演化
- 实现成本不高
- 可以为 D4 / 风险变化判断预留空间

### 当前阶段最小查询模式
- `findLatestInsightByConversationId(conversationId)`
- 后续再补 list/filter

---

## 6. 最小索引建议

建议至少建：

### 索引 1
- `(conversation_id, created_at desc)`

用途：
- 快速查会话最新 insight

### 索引 2
- `(customer_id, created_at desc)`

用途：
- 后续按客户回看

### 索引 3
- `(patient_id, created_at desc)`

用途：
- 后续按 patient 回看

### 索引 4（可后补）
- `(stage, created_at desc)`

用途：
- 后续风险 / 阶段筛选

---

## 7. 最小 SQL 草案（示意）

```sql
create table if not exists wecom_conversation_insights (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  customer_id uuid null,
  patient_id uuid null,
  analysis_version text not null default 'v1',
  summary text not null,
  stage text not null,
  needs_json jsonb not null default '[]'::jsonb,
  concerns_json jsonb not null default '[]'::jsonb,
  objections_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  next_actions_json jsonb not null default '[]'::jsonb,
  confidence text not null default 'medium',
  evidence_message_ids_json jsonb not null default '[]'::jsonb,
  source_message_count integer not null default 0,
  source_window_start_at timestamptz null,
  source_window_end_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wecom_conversation_insights_conversation_created
  on wecom_conversation_insights (conversation_id, created_at desc);
```

---

## 8. 与 D4 的衔接方式

这张表的作用不仅是存 D3 结果，也是在为 D4 预留来源：
- D4 proposal 可通过 `sourceInsightId` 指向 insight
- D4 action suggestion 可通过 `sourceInsightId` 指向 insight

所以 insight 表应保持独立，不和 proposal / action suggestion 混表。

---

## 9. 当前阶段不建议的做法

### 不建议 1：把 insight 直接塞回 conversation 主表
会让 conversation 表承载过多衍生数据。

### 不建议 2：一开始就拆成多张 insight 子表
当前阶段实现成本过高，不符合最小闭环原则。

### 不建议 3：只存 summary，不存结构化字段
这样后续 D4、筛选和回看都会受限。

---

## 10. 当前阶段验收标准

D3 insight 存储结构当前阶段可认为合理的标准应是：
- 能独立保存一条 conversation insight
- 能按 conversationId 快速查最新 insight
- 能保存五类核心数组与 evidenceMessageIds
- 能为后续 D4 提供稳定 sourceInsightId 来源

---

## 11. 当前阶段一句话结论

D3 当前最合理的存储方式是：

> **先新增独立的 `wecom_conversation_insights` 表，用一张表 + jsonb 数组支撑最小闭环，不急着做复杂拆表。**
