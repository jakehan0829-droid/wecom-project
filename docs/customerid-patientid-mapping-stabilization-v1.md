# customerId -> patientId 映射稳定化 v1

更新时间：2026-03-30

## 1. 当前结论

A+B 中的 B（`customerId -> patientId` 映射稳定化）已完成第一轮落地，不再只是“临时查映射”，而是开始把映射结果沉淀回会话主对象。

当前已形成的映射优先级：

1. `patient_id` 直匹配
2. `patient_wecom_binding.external_user_id`
3. `patient_wecom_binding.wecom_user_id`
4. `wecom_conversations.primary_customer_id`

其中第 4 条是本轮新增，目的不是替代绑定表，而是把已识别出的患者归属稳定回写到会话层，减少后续同一会话反复重判。

---

## 2. 本轮新增内容

### 2.1 会话主客户回写能力
新增：
- `assignConversationPrimaryCustomer(conversationId, patientId)`

位置：
- `project/backend/src/modules/wecom-intelligence/service/conversation.service.ts`

作用：
- 当消息 intake 已识别到明确 patientId 时
- 自动把 `wecom_conversations.primary_customer_id` 回写为该 patientId
- 仅在当前为空、空串或本来就是同值时更新，避免粗暴覆盖

### 2.2 消息 intake 接入 conversation 级回写
位置：
- `project/backend/src/modules/wecom-intelligence/service/message-intake.service.ts`

作用：
- message 入库主链中，一旦映射命中 patient
- 除写入 `wecom_messages.linked_customer_id` 外
- 同步回写 `wecom_conversations.primary_customer_id`

### 2.3 映射服务支持 conversation 级兜底
位置：
- `project/backend/src/modules/wecom-intelligence/service/patient-mapping.service.ts`

当前查找顺序：
1. patient.id
2. binding.external_user_id
3. binding.wecom_user_id
4. conversation.primary_customer_id

新增匹配来源：
- `matchedBy = conversation_primary_customer_id`

### 2.4 customer mapping 接口支持带 conversationId 查询
接口仍为：
- `GET /api/v1/wecom/customer-mappings/:customerId`

本轮新增 query：
- `conversationId`

示例：
```bash
curl "http://127.0.0.1:3000/api/v1/wecom/customer-mappings/external_user_demo?conversationId=wecom:private:external_user_demo" \
  -H "Authorization: Bearer <token>"
```

---

## 3. 已验证结果

### 3.1 本机加密 webhook 继续通过
```bash
cd /root/.openclaw/workspace/project/backend
node ../ops/wecom-webhook-smoke-test.js
```

结果：
- HTTP 200
- body = `success`

### 3.2 conversation 已持久化 primary_customer_id
已验证：
- `conversation_id = wecom:private:external_user_demo`
- `primary_customer_id = external_user_demo`

### 3.3 映射接口已能通过会话主客户兜底命中
已验证结果：
```json
{
  "status": "matched",
  "mapping": {
    "patientId": "external_user_demo",
    "patientName": "",
    "matchedBy": "conversation_primary_customer_id"
  }
}
```

说明：
- 即使 binding 表当前没有直接命中
- 只要同会话已经稳定识别过患者
- 后续映射查询仍可通过 conversation 层兜底命中

---

## 4. 当前价值

本轮补强后，系统从“每次只靠 customerId 临时查绑定”进了一步，变成：

**消息首次识别成功 -> 患者归属写入消息 -> 患者归属回写会话 -> 后续同会话可稳定复用该归属。**

这会直接改善：
- 后续 business action 生成的稳定性
- 会话详情页的客户归属一致性
- automation / event state / audit 查询时的口径稳定性

---

## 5. 当前边界

这还不是最终版“稳定映射体系”，目前仍有边界：

### 5.1 conversation 级兜底只适合同一会话延续
它能解决“同一客户在同一会话里反复来消息”的稳定性问题。

但它不能替代：
- 新会话首次识别
- 多客户群聊精确归属
- binding 数据源本身的治理

### 5.2 当前 conflict 仍只报出，不自动裁决
如果 `external_user_id` 或 `wecom_user_id` 命中多个 patient，当前仍返回：
- `status = conflict`

这是对的，当前阶段不应该静默自动选一个。

### 5.3 当前 patientName 可能为空
当来源是 `conversation_primary_customer_id` 且 patient 表无对应 name 或当前样本非正式 patient 时，`patientName` 可能为空。

这说明后续还需要补 patient 主数据治理，而不是只看映射函数。

---

## 6. 后续建议

下一轮建议按这个顺序继续推进：

### P1
补“未映射客户观察面”
- 输出 unmapped customer 列表
- 输出最近命中的 unmapped conversation
- 让运营知道哪些客户还没绑定成功

### P2
补 conflict 观察面
- 输出同一个 external_user_id 命中多个 patient 的候选列表
- 支持人工确认/修正

### P3
补 conversation participant 维度
- 为群聊场景引入参与者层
- 避免 group conversation 下把所有消息都粗暴绑定到一个 patient

### P4
把 mapping 命中来源透传到 dashboard / ops view
- 让前端或运营直接看到：
  - matchedBy = external_user_id / wecom_user_id / conversation_primary_customer_id

---

## 7. 一句话结论

当前 `customerId -> patientId` 映射已经从“临时查表”推进到“绑定表优先 + conversation 主客户回写兜底”的第一轮稳定化状态，足够支撑真实 webhook 主链继续往后走。
