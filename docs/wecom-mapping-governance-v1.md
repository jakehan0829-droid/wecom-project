# 企微映射治理能力 v1

更新时间：2026-03-30

## 1. 本轮目标

继续推进三项：

1. 补 `reassign` 接口
2. 补 mapping 专门操作日志 / 审计
3. 把 `mappingStatus / matchedBy` 做成更适合前端与查询的稳定字段

当前这三项均已完成第一轮落地。

---

## 2. 新增能力

### 2.1 reassign 接口
新增：
```http
POST /api/v1/wecom/conversations/:conversationId/mapping/reassign
Content-Type: application/json

{
  "toPatientId": "de14f0da-bbcc-4e64-b368-3d789897edf4",
  "operatorNote": "reassign api test"
}
```

作用：
- 直接把某个 conversation 从当前归属改到新的 patient
- 不必再手工走 `unconfirm -> confirm`

当前行为：
- 强制回写 `wecom_conversations.primary_customer_id`
- 回写该 conversation 下消息的 `linked_customer_id`
- 回写 `patientMapping.matchedBy = manual_confirmation`
- 写入 `wecom_event_state`
- 写入 `wecom_mapping_audit`

---

### 2.2 专门的 mapping 操作日志表
新增表：
- `wecom_mapping_audit`

字段包括：
- `conversation_id`
- `platform_chat_id`
- `action`
- `from_patient_id`
- `to_patient_id`
- `mapping_status`
- `matched_by`
- `binding_type`
- `operator_note`
- `payload_json`
- `created_at`

当前记录的动作：
- `manual_confirm`
- `manual_unconfirm`
- `promote_binding`
- `reassign`

这张表比 `wecom_event_state` 更偏“治理操作审计”，后续前端做治理日志页时会更顺。

---

### 2.3 稳定映射字段设计
已将以下字段纳入 `wecom_conversations` 设计：
- `mapping_status`
- `mapping_matched_by`

目标：
- 让列表筛选更适合前端查询
- 避免每次都依赖运行时临时推断

但当前线上真实库存在一个实际约束：
- 业务 DB 用户不是旧表 owner
- 无法直接对既有 `wecom_conversations` 执行 `ALTER TABLE ADD COLUMN`

所以本轮采取了**兼容降级方案**：

#### 若库中已有稳定字段
- 列表查询直接走 SQL 条件过滤
- `refreshConversationMappingStateService()` 会更新这两个字段

#### 若库中没有稳定字段
- 系统自动回退到动态 `lookupCustomerMapping()`
- 然后在应用层做 `mappingStatus / matchedBy` 过滤
- 功能不挂，只是性能和结构不如最终态

这保证了：
- 功能能继续跑
- 不会因为 schema owner 问题让治理链断掉

---

## 3. 已验证结果

### 3.1 reassign 已跑通
已验证：
- `HanCong` 会话可成功调用 `reassign`
- 返回：
  - `reassigned = true`
  - `mapping.status = matched`
  - `matchedBy = manual_confirmation`

### 3.2 mapping audit 已落库
已验证 `wecom_mapping_audit` 中已有记录：
- `action = reassign`
- `mapping_status = matched`
- `matched_by = manual_confirmation`

### 3.3 conversation 列表筛选仍可正常使用
即使真实库尚未成功补上稳定列，当前仍可通过回退逻辑正常使用：
- `mappingStatus=matched`
- `matchedBy=manual_confirmation`

说明筛选能力已可用，只是当前处于“兼容态”而非“最终高性能态”。

---

## 4. 当前架构状态

到当前为止，企微映射治理链已具备：

### 发现层
- unmapped / conflict 独立 API
- ops summary / dashboard 观察面

### 处理层
- confirm
- unconfirm
- reassign
- promote-binding

### 审计层
- `wecom_event_state` 记录业务事件流
- `wecom_mapping_audit` 记录治理动作流

### 查询层
- conversation list 支持 `mappingStatus / matchedBy`
- 有稳定字段时走 SQL
- 无稳定字段时自动降级到应用层过滤

---

## 5. 当前真实约束

### 5.1 真实库 owner 权限不足
这是当前阶段最关键的现实约束。

表现为：
- `CREATE TABLE IF NOT EXISTS` 可以建新表
- 但不能直接改已有 `wecom_conversations` 老表结构
- 因为当前 DB 用户不是该表 owner

这意味着：
- 新表 `wecom_mapping_audit` 已成功创建
- 但 `wecom_conversations.mapping_status / mapping_matched_by` 尚未真正进入线上现有表

### 5.2 所以当前稳定字段是“代码设计已接入，数据库实装待补 owner 级迁移”
这不是设计问题，是数据库权限问题。

---

## 6. 当前价值

这一轮最重要的不是只多了几个接口，而是：

**映射治理已经从“能改”升级到“能改、能记、能查、还能在迁移未完成时继续工作”。**

这对真实业务很关键，因为它更接近生产可用，而不是只在理想数据库权限下成立。

---

## 7. 后续建议

### P1
补一份 owner 权限下的正式迁移脚本
专门用于给现有 `wecom_conversations` 加：
- `mapping_status`
- `mapping_matched_by`

### P2
增加 mapping audit 查询接口
让前端或运营可直接查看治理动作历史。

### P3
修正 reassign 返回中的 `fromPatientId`
当前若会话已被前一步改写，返回值可能不够精准，建议后续在事务内先缓存旧值再返回。

### P4
将筛选彻底切到 SQL / 索引友好模式
待 owner 级迁移补完后即可推进。

---

## 8. 一句话结论

当前企微映射治理能力已经进入“可治理 + 可审计 + 可兼容迁移”的阶段：

**不仅支持 `reassign`，还新增了专门的 `wecom_mapping_audit` 审计表，并且在稳定字段尚未真正落库时，系统也会自动回退到动态过滤，保证功能持续可用。**
