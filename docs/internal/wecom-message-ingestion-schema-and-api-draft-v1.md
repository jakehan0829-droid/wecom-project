# 企微消息入库闭环的数据表与接口草案 V1

## 1. 文档目的

本文件用于把《企微最小消息入库闭环任务单 V1》继续推进到更接近实现的层面，给出最小可用的数据表设计思路与接口草案，供后续开发、评审和联调使用。

目标是支撑最小主链：

**企微消息进入 → 标准化 → 入库 → 会话归档 → 客户关联 → 查询回看**

---

## 2. 设计原则

1. **先支撑文本主链**：优先支持私聊/群聊文本消息
2. **先最小可用**：字段够用即可，不一开始做过重设计
3. **先可追溯**：保留原始消息与结构化字段
4. **先兼容后续分析**：为分析与反哺预留关联字段
5. **先允许待确认**：客户归属不明时不阻断入库

---

## 3. 数据表草案

## 3.1 `wecom_conversations`
表示会话主表。

建议字段：
- `id` BIGSERIAL PRIMARY KEY
- `conversation_id` VARCHAR(128) UNIQUE NOT NULL
- `chat_type` VARCHAR(32) NOT NULL -- private / group
- `platform_chat_id` VARCHAR(128) NOT NULL
- `conversation_name` VARCHAR(255)
- `primary_customer_id` VARCHAR(128)
- `status` VARCHAR(32) DEFAULT 'active'
- `message_count` INT DEFAULT 0
- `started_at` TIMESTAMPTZ
- `last_message_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

索引建议：
- unique(`conversation_id`)
- index(`platform_chat_id`)
- index(`primary_customer_id`)
- index(`last_message_at`)

---

## 3.2 `wecom_conversation_participants`
表示会话参与者。

建议字段：
- `id` BIGSERIAL PRIMARY KEY
- `conversation_id` VARCHAR(128) NOT NULL
- `user_id` VARCHAR(128) NOT NULL
- `user_name` VARCHAR(255)
- `role_type` VARCHAR(32) DEFAULT 'unknown' -- customer / staff / bot / unknown
- `is_primary_contact` BOOLEAN DEFAULT FALSE
- `joined_at` TIMESTAMPTZ
- `left_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT NOW()

索引建议：
- index(`conversation_id`)
- index(`user_id`)
- unique(`conversation_id`, `user_id`)

---

## 3.3 `wecom_messages`
表示原始消息记录主表。

建议字段：
- `id` BIGSERIAL PRIMARY KEY
- `message_id` VARCHAR(128) UNIQUE NOT NULL
- `source_platform` VARCHAR(32) DEFAULT 'wecom'
- `chat_type` VARCHAR(32) NOT NULL -- private / group
- `conversation_id` VARCHAR(128) NOT NULL
- `sender_id` VARCHAR(128) NOT NULL
- `sender_name` VARCHAR(255)
- `sender_role` VARCHAR(32) DEFAULT 'unknown'
- `content_type` VARCHAR(32) DEFAULT 'text'
- `content_raw` TEXT
- `content_text` TEXT
- `sent_at` TIMESTAMPTZ NOT NULL
- `received_at` TIMESTAMPTZ DEFAULT NOW()
- `linked_customer_id` VARCHAR(128)
- `analysis_status` VARCHAR(32) DEFAULT 'pending' -- pending / done / failed
- `metadata_json` JSONB DEFAULT '{}'::jsonb
- `created_at` TIMESTAMPTZ DEFAULT NOW()

索引建议：
- unique(`message_id`)
- index(`conversation_id`, `sent_at`)
- index(`linked_customer_id`, `sent_at`)
- index(`analysis_status`)
- gin(`metadata_json`)

---

## 3.4 `wecom_conversation_insights`
表示会话分析结果（为后续分析预留）。

建议字段：
- `id` BIGSERIAL PRIMARY KEY
- `insight_id` VARCHAR(128) UNIQUE NOT NULL
- `conversation_id` VARCHAR(128) NOT NULL
- `linked_customer_id` VARCHAR(128)
- `time_window_start` TIMESTAMPTZ
- `time_window_end` TIMESTAMPTZ
- `summary_text` TEXT
- `need_points_json` JSONB DEFAULT '[]'::jsonb
- `concern_points_json` JSONB DEFAULT '[]'::jsonb
- `objection_points_json` JSONB DEFAULT '[]'::jsonb
- `risk_signals_json` JSONB DEFAULT '[]'::jsonb
- `intent_assessment_json` JSONB DEFAULT '{}'::jsonb
- `next_action_suggestions_json` JSONB DEFAULT '[]'::jsonb
- `plan_update_suggestions_json` JSONB DEFAULT '[]'::jsonb
- `confidence_score` NUMERIC(4,3)
- `generated_at` TIMESTAMPTZ DEFAULT NOW()
- `generated_by` VARCHAR(32) DEFAULT 'system'

索引建议：
- unique(`insight_id`)
- index(`conversation_id`, `generated_at`)
- index(`linked_customer_id`, `generated_at`)

---

## 4. 最小接口草案

## 4.1 接收消息接口
### `POST /api/wecom/messages/intake`

用途：
- 接收一条标准化前或标准化后的企微消息输入

建议请求体：
```json
{
  "messageId": "msg_xxx",
  "chatType": "private",
  "platformChatId": "chat_xxx",
  "senderId": "ext_user_xxx",
  "senderName": "张三",
  "senderRole": "customer",
  "contentType": "text",
  "contentRaw": "我想了解你们这个服务怎么安排",
  "contentText": "我想了解你们这个服务怎么安排",
  "sentAt": "2026-03-28T15:00:00+08:00",
  "linkedCustomerId": "cust_001",
  "metadata": {}
}
```

建议响应：
```json
{
  "success": true,
  "messageId": "msg_xxx",
  "conversationId": "conv_xxx",
  "linkedCustomerId": "cust_001"
}
```

---

## 4.2 查询客户消息接口
### `GET /api/wecom/messages`

建议查询参数：
- `customerId`
- `conversationId`
- `startTime`
- `endTime`
- `limit`

用途：
- 按客户或会话回看消息

---

## 4.3 查询会话详情接口
### `GET /api/wecom/conversations/:conversationId`

用途：
- 查询某个会话的基础信息、参与者、最近消息

---

## 4.4 查询会话消息接口
### `GET /api/wecom/conversations/:conversationId/messages`

用途：
- 查看某个会话时间线

---

## 4.5 手动触发分析接口（预留）
### `POST /api/wecom/conversations/:conversationId/analyze`

用途：
- 对某个会话执行一次分析

说明：
- 当前作为预留接口，支撑最小分析闭环衔接

---

## 5. 最小流程样例

### 私聊消息入库样例
1. 外部收到一条私聊文本消息
2. 调用 `/api/wecom/messages/intake`
3. 系统检查 `conversation_id` 是否存在
4. 若不存在则创建 `wecom_conversations`
5. 写入 `wecom_messages`
6. 更新会话 `message_count` 与 `last_message_at`
7. 返回 messageId、conversationId、linkedCustomerId

---

## 6. 验收标准

本草案可用于进入实现讨论的标准：
- 至少支撑私聊文本消息入库
- 支撑消息按客户和会话回看
- 结构上兼容群聊扩展
- 结构上兼容后续 insight 分析结果接入

---

## 7. 文档结论

本版本数据表与接口草案的核心目标是：

> 先把企微消息正式纳入系统数据层和接口层，支撑最小消息入库闭环，
> 为后续聊天分析和方案反哺提供稳定基础。
