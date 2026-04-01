# 企微映射生命周期能力 v1

更新时间：2026-03-30

## 1. 本轮目标

继续推进以下 3 项：

1. 撤销确认 / 改绑接口
2. 将人工确认受控沉淀为 binding
3. 给 conversation 列表增加 mapping 筛选能力

当前三项均已完成第一轮落地，并已实际验证。

---

## 2. 新增接口

### 2.1 撤销人工确认
```http
POST /api/v1/wecom/conversations/:conversationId/mapping/unconfirm
Content-Type: application/json

{
  "operatorNote": "revert after api test"
}
```

作用：
- 清空 `wecom_conversations.primary_customer_id`
- 清空该 conversation 下消息的 `linked_customer_id`
- 删除消息 metadata 里的 `patientMapping`
- 写入 `mappingManualUnconfirm`
- 记录 `wecom_event_state`

事件口径：
- `event_action = manual_unconfirm`
- `lifecycle_status = mapping_unconfirmed`
- `state_transition = mapping_manual_unconfirmed`

---

### 2.2 将 mapping 提升为正式 binding
```http
POST /api/v1/wecom/conversations/:conversationId/mapping/promote-binding
Content-Type: application/json

{
  "patientId": "689ca26c-b8d0-46e4-a6d3-c5b750472eff",
  "bindingType": "wecom_user",
  "operatorNote": "promote manual mapping to binding"
}
```

支持：
- `bindingType = wecom_user`
- `bindingType = external_user`

作用：
- 基于 conversation 的 `platform_chat_id`
- 受控写入 `patient_wecom_binding`
- 若已存在相同 bound 记录，则复用
- 同时保留 conversation 主客户写回
- 记录一条 mapping 生命周期事件

事件口径：
- `event_action = promote_binding`
- `lifecycle_status = binding_promoted`
- `state_transition = mapping_binding_promoted`

---

## 3. conversation 列表新增筛选

接口：
```http
GET /api/v1/wecom/conversations
```

本轮新增 query 参数：
- `mappingStatus`
- `matchedBy`

### 3.1 按映射状态筛选
示例：
```http
GET /api/v1/wecom/conversations?mappingStatus=conflict&limit=10
```

可用值：
- `matched`
- `conflict`
- `unmapped`

### 3.2 按命中来源筛选
示例：
```http
GET /api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=10
```

当前可见来源包括：
- `patient_id`
- `external_user_id`
- `wecom_user_id`
- `manual_confirmation`
- `unknown`

---

## 4. 已验证结果

### 4.1 promote-binding 已通过
已验证：
- `HanCong` 会话可成功调用 `promote-binding`
- 系统返回已有绑定记录：
  - `bindingType = wecom_user`
  - `wecomUserId = HanCong`

### 4.2 unconfirm 已通过
已验证：
- 对 `HanCong` 执行 `unconfirm` 后
- mapping 即恢复为：
  - `status = conflict`
  - `matchedBy = wecom_user_id`

### 4.3 reconfirm 已通过
已验证：
- 再次 confirm 后
- mapping 恢复为：
  - `status = matched`
  - `matchedBy = manual_confirmation`

### 4.4 列表筛选已通过
已验证：
- `mappingStatus=conflict`
- `mappingStatus=matched&matchedBy=manual_confirmation`

均可正常返回。

---

## 5. 当前生命周期状态理解

到当前为止，conversation 映射已经形成最小生命周期：

### 状态 A：未映射 / 冲突
- 来源：系统自动识别结果
- 特征：`unmapped` / `conflict`

### 状态 B：人工确认
- 动作：`confirm`
- 特征：
  - conversation 有主客户
  - 列表/详情显示 `matchedBy = manual_confirmation`

### 状态 C：提升为正式 binding
- 动作：`promote-binding`
- 特征：
  - `patient_wecom_binding` 中存在正式记录
  - 后续跨会话识别会更稳定

### 状态 D：撤销确认
- 动作：`unconfirm`
- 特征：
  - 会话退回自动识别状态
  - 若 binding 层本身存在冲突，展示层重新显露冲突

---

## 6. 当前边界

### 6.1 还没有“改绑到另一个 patient”的专门动作名
目前可以通过：
- `unconfirm`
- 再 `confirm` 新 patient

实现改绑，但还没有单独的 `reassign` 接口。

### 6.2 promote-binding 目前按 conversation.platform_chat_id 生成 binding
这在私聊场景很自然。

但群聊场景未来仍需 participant 维度支持，否则不能把整个 group chat 粗暴当作某个 patient 的全局 binding 来源。

### 6.3 当前列表筛选是在应用层完成
当前做法是：
- 先查 conversation
- 再逐条 lookup mapping
- 再在应用层按 `mappingStatus` / `matchedBy` 过滤

优点：
- 改动快
- 逻辑统一

缺点：
- 数据量变大后性能一般

后续若 conversation 规模上来，需要改成 SQL 级筛选或建立物化字段。

---

## 7. 当前价值

这一轮完成后，映射链已经具备了可操作的最小生命周期闭环：

- 能发现问题（unmapped / conflict）
- 能人工确认
- 能撤销确认
- 能受控沉淀为正式 binding
- 能在列表页按状态与命中来源筛选

这已经足够支撑前端做第一版“映射治理台”。

---

## 8. 后续建议

### P1
补 `reassign` 接口
直接表达“从 A 改绑到 B”而不是走 unconfirm + confirm。

### P2
把 promote-binding 增加幂等审计与专门操作日志

### P3
把 `mappingStatus` / `matchedBy` 做成 SQL 级索引友好字段

### P4
为群聊引入 participant 级 mapping 管理

---

## 9. 一句话结论

当前企微映射管理已经具备第一版完整生命周期能力：

**不仅能确认，还能撤销、能提升为正式 binding，并且 conversation 列表已经支持按 `mappingStatus` 和 `matchedBy` 直接筛选。**
