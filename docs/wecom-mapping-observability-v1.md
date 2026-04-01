# 企微映射观察面 v1

更新时间：2026-03-30

## 1. 目的

本文件用于收口本轮新增的 3 项能力：

1. unmapped 观察面
2. conflict 观察面
3. `matchedBy` 透传到 ops view / dashboard

目标是把 `customerId -> patientId` 映射从“后台内部逻辑”变成“可被运营和研发直接观察的状态”。

---

## 2. 本轮新增能力

### 2.1 ops view 透传 mapping
接口：
- `GET /api/v1/wecom/conversations/:conversationId/ops-view`

本轮新增返回字段：
- `mapping`

示例：
```json
{
  "mapping": {
    "status": "matched",
    "mapping": {
      "patientId": "external_user_demo",
      "patientName": "",
      "matchedBy": "conversation_primary_customer_id"
    }
  }
}
```

价值：
- 前端或运营在看某个 conversation 时，不再只能看到 `primary_customer_id`
- 还能知道它是怎么命中的
- 当前可见来源包括：
  - `patient_id`
  - `external_user_id`
  - `wecom_user_id`
  - `conversation_primary_customer_id`

---

### 2.2 ops summary 新增 mapping 观察区
接口：
- `GET /api/v1/wecom/ops-summary`

本轮新增结构：
- `mapping.summary`
- `mapping.latestUnmappedCustomers`
- `mapping.latestConflictCustomers`

#### mapping.summary
包含：
- `matchedBy` 聚合统计
- `unmappedConversationTotal`
- `conflictConversationTotal`

示例：
```json
{
  "mapping": {
    "summary": {
      "matchedBy": [
        { "matched_by": "external_user_id", "total": 12 },
        { "matched_by": "unknown", "total": 5 }
      ],
      "unmappedConversationTotal": 1,
      "conflictConversationTotal": 0
    }
  }
}
```

#### latestUnmappedCustomers
返回最近未映射私聊会话列表，字段包括：
- `conversationId`
- `customerId`
- `lastMessageAt`
- `messageCount`
- `customerLookup`
- `patientMapping`
- `status=unmapped`

#### latestConflictCustomers
返回最近映射冲突私聊会话列表，字段包括：
- `conversationId`
- `customerId`
- `lastMessageAt`
- `messageCount`
- `customerLookup`
- `status=conflict`

---

### 2.3 dashboard metrics 新增两个计数
接口：
- `GET /api/v1/dashboard/wecom-metrics`

本轮新增字段：
- `unmappedWecomConversationTotal`
- `conflictWecomConversationTotal`

作用：
- 让 dashboard 层至少先感知“还有多少私聊会话没映射成功”
- 以及“当前有多少会话存在映射冲突”

---

## 3. 当前已验证结果

### 3.1 dashboard 已返回新增计数
已验证：
```json
{
  "unmappedWecomConversationTotal": 1,
  "conflictWecomConversationTotal": 0
}
```

### 3.2 ops summary 已返回 mapping 观察区
已验证当前样本：
- `matchedBy.external_user_id = 12`
- `unmappedConversationTotal = 1`
- `conflictConversationTotal = 0`

### 3.3 当前已识别到一个 unmapped 样本
当前样本：
- `conversationId = wecom:private:HanCong`
- `customerId = HanCong`

这说明观察面已经能真实暴露问题对象，而不是只有抽象统计。

---

## 4. 当前实现口径

### 4.1 观察面以私聊为主
当前 unmapped / conflict 观察面先只覆盖：
- `chat_type = private`

原因：
- 群聊天然存在多参与者和多客户归属问题
- 当前阶段若把群聊一并纳入，会把“未映射”噪音放大

### 4.2 当前统计来源基于已入库消息 metadata
当前 `matchedBy` 和 `customerLookup.status` 统计，主要来自：
- `wecom_messages.metadata_json.patientMapping`
- `wecom_messages.metadata_json.customerLookup`

这意味着：
- 当前观察面反映的是“实际入库时走过的映射结果”
- 不是纯静态查表估算

### 4.3 unknown 不等于错误
`matchedBy = unknown` 目前表示：
- 当前消息 metadata 中没有可用 patientMapping
- 不一定是 bug
- 也可能是历史数据、未映射、早期未透传样本

因此当前应把它当作“需要继续清洗/观察”的状态，而不是直接视为错误。

---

## 5. 当前价值

本轮完成后，映射体系首次具备了真正的“运营观察面”：

- 能看到有没有未映射对象
- 能看到有没有冲突对象
- 能看到当前主要通过哪种规则命中
- 能在单个 conversation 详情中直接看到 matchedBy

这会让下一步做：
- 未映射补录
- 冲突人工确认
- dashboard 告警
- 群聊映射升级

都更可执行。

---

## 6. 后续建议

### P1
给 unmapped / conflict 增加独立 API
避免后续只能从 `ops-summary` 的聚合结果里拆。

### P2
把 `matchedBy` 直接透传到 conversation list
让列表页就能看归属命中来源，不必点详情。

### P3
加入时间窗口筛选
比如最近 24h / 7d 的 unmapped 增量。

### P4
补人工处理动作
例如：
- 手动确认某 conversation 绑定 patient
- 手动处理 conflict
- 手动回填 binding

---

## 7. 一句话结论

当前企微映射体系已经具备第一轮可观测性：

**既能在 dashboard/ops-summary 看总体未映射与冲突情况，也能在单个 conversation 的 ops view 中直接看到 mapping 命中来源。**
