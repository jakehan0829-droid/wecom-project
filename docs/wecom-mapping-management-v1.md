# 企微映射管理接口与人工确认能力 v1

更新时间：2026-03-30

## 1. 本轮目标

本轮继续推进三项能力：

1. 给 unmapped / conflict 做独立 API
2. 增加人工确认 / 修正入口
3. 把 `matchedBy` 透传到 conversation list

当前这三项已完成第一轮落地，并已实际验证。

---

## 2. 新增独立 API

### 2.1 获取未映射会话列表
```http
GET /api/v1/wecom/customer-mappings/unmapped
```

支持：
- `limit`（可选，默认 20）

返回：
- 最近未映射私聊会话列表

字段包括：
- `conversationId`
- `customerId`
- `lastMessageAt`
- `messageCount`
- `customerLookup`
- `patientMapping`
- `status=unmapped`

---

### 2.2 获取冲突会话列表
```http
GET /api/v1/wecom/customer-mappings/conflicts
```

支持：
- `limit`（可选，默认 20）

返回：
- 最近映射冲突私聊会话列表

字段包括：
- `conversationId`
- `customerId`
- `lastMessageAt`
- `messageCount`
- `customerLookup`
- `status=conflict`

---

## 3. 新增人工确认 / 修正入口

### 3.1 通用确认入口
```http
POST /api/v1/wecom/customer-mappings/confirm
Content-Type: application/json

{
  "conversationId": "wecom:private:HanCong",
  "patientId": "689ca26c-b8d0-46e4-a6d3-c5b750472eff",
  "operatorNote": "manual resolve for conflict test"
}
```

### 3.2 conversation 路径式确认入口
```http
POST /api/v1/wecom/conversations/:conversationId/mapping/confirm
Content-Type: application/json

{
  "patientId": "689ca26c-b8d0-46e4-a6d3-c5b750472eff",
  "operatorNote": "manual resolve for conflict test"
}
```

---

## 4. 人工确认后系统会做什么

当前确认动作会执行 3 件事：

### 4.1 回写会话主客户
更新：
- `wecom_conversations.primary_customer_id`

### 4.2 回写历史消息归属
对该 conversation 下符合条件的消息：
- 回填 `linked_customer_id`
- 写入 `metadata_json.patientMapping`
- 写入 `metadata_json.mappingManualConfirm`

### 4.3 记录一条事件状态
写入：
- `wecom_event_state`

事件口径：
- `event_category = mapping`
- `event_action = manual_confirm`
- `lifecycle_status = mapping_confirmed`
- `state_transition = mapping_manual_confirmed`

这样后续审计和时间线都能看到“这次映射是人工确认的”。

---

## 5. 手工确认优先级规则

本轮已同步修正映射优先级：

当调用 `lookupCustomerMapping(customerId, conversationId)` 且 conversation 已确认主客户时：

**优先返回 conversation 主客户结果**，并标记为：
- `matchedBy = manual_confirmation`

也就是说：
- 手工确认后的会话
- 不再继续被原始 binding 冲突结果压住展示层

这点已通过 `HanCong` 样本实际验证。

---

## 6. conversation list 已透传 mapping
接口：
```http
GET /api/v1/wecom/conversations
```

本轮新增：
- 每条 conversation 现在都包含 `mapping`

示例：
```json
{
  "conversation_id": "wecom:private:HanCong",
  "primary_customer_id": "689ca26c-b8d0-46e4-a6d3-c5b750472eff",
  "mapping": {
    "status": "matched",
    "mapping": {
      "patientId": "689ca26c-b8d0-46e4-a6d3-c5b750472eff",
      "patientName": "企微日志验证患者2",
      "matchedBy": "manual_confirmation"
    }
  }
}
```

价值：
- 列表页就能直接展示：
  - 已命中 / 未命中 / 冲突
  - 命中来源 matchedBy
- 不必再点进详情页才能知道归属状态

---

## 7. 已验证结果

### 7.1 独立 API 已可调用
已验证：
- `/api/v1/wecom/customer-mappings/unmapped`
- `/api/v1/wecom/customer-mappings/conflicts`

### 7.2 人工确认已可执行
已验证：
- `HanCong` 会话已成功人工确认到指定 patient
- `wecom_conversations.primary_customer_id` 已写入
- `wecom_event_state` 已新增 mapping_confirmed 记录

### 7.3 手工确认后展示已切换为 manual_confirmation
已验证：
- `ops-view` 中 `mapping.matchedBy = manual_confirmation`
- `conversation list` 中也已同步显示 `manual_confirmation`

---

## 8. 当前边界

### 8.1 当前只做“确认”，未做“撤销/改绑”
也就是：
- 已支持把 conversation 确认给某个 patient
- 但还没有“撤回确认”或“改绑到另一个 patient”的专门动作接口

### 8.2 当前未直接写 binding 表
本轮人工确认主要回写：
- conversation
- message
- event_state

尚未自动创建或修正：
- `patient_wecom_binding`

这是有意保守，避免把“临时人工确认某个 conversation”直接提升成“全局绑定事实”。

### 8.3 当前 conflict / unmapped 观察面仍只覆盖私聊
群聊后续还要靠 participant 维度继续增强。

---

## 9. 后续建议

### P1
补“撤销确认 / 改绑”接口

### P2
补“将人工确认沉淀为 binding”的受控动作
例如二次确认后再写 `patient_wecom_binding`

### P3
把 unmapped / conflict / matchedBy 直接纳入前端列表筛选条件

### P4
补人工处理审计表或专门操作日志
避免未来只有 event_state，没有更完整的人工操作记录

---

## 10. 一句话结论

当前映射体系已经从“可观察”推进到“可人工处理”：

**既有独立的 unmapped/conflict API，也有 conversation 级人工确认入口，并且确认后的 `matchedBy` 已能在列表和详情里直接显示为 `manual_confirmation`。**
