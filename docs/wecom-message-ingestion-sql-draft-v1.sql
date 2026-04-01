-- 企微消息入库闭环 SQL 草案 V1
-- 目标：支撑最小消息入库闭环
-- 范围：conversation / participant / message / insight 四类核心表

CREATE TABLE IF NOT EXISTS wecom_conversations (
  id BIGSERIAL PRIMARY KEY,
  conversation_id VARCHAR(128) NOT NULL UNIQUE,
  chat_type VARCHAR(32) NOT NULL,
  platform_chat_id VARCHAR(128) NOT NULL,
  conversation_name VARCHAR(255),
  primary_customer_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  message_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wecom_conversations_platform_chat_id
  ON wecom_conversations(platform_chat_id);

CREATE INDEX IF NOT EXISTS idx_wecom_conversations_primary_customer_id
  ON wecom_conversations(primary_customer_id);

CREATE INDEX IF NOT EXISTS idx_wecom_conversations_last_message_at
  ON wecom_conversations(last_message_at DESC);


CREATE TABLE IF NOT EXISTS wecom_conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  user_name VARCHAR(255),
  role_type VARCHAR(32) NOT NULL DEFAULT 'unknown',
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wecom_conversation_participants UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wecom_conversation_participants_conversation_id
  ON wecom_conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_wecom_conversation_participants_user_id
  ON wecom_conversation_participants(user_id);


CREATE TABLE IF NOT EXISTS wecom_messages (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(128) NOT NULL UNIQUE,
  source_platform VARCHAR(32) NOT NULL DEFAULT 'wecom',
  chat_type VARCHAR(32) NOT NULL,
  conversation_id VARCHAR(128) NOT NULL,
  sender_id VARCHAR(128) NOT NULL,
  sender_name VARCHAR(255),
  sender_role VARCHAR(32) NOT NULL DEFAULT 'unknown',
  content_type VARCHAR(32) NOT NULL DEFAULT 'text',
  content_raw TEXT,
  content_text TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_customer_id VARCHAR(128),
  analysis_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wecom_messages_conversation_sent_at
  ON wecom_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_wecom_messages_customer_sent_at
  ON wecom_messages(linked_customer_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_wecom_messages_analysis_status
  ON wecom_messages(analysis_status);

CREATE INDEX IF NOT EXISTS idx_wecom_messages_sender_id
  ON wecom_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_wecom_messages_metadata_json
  ON wecom_messages USING GIN(metadata_json);


CREATE TABLE IF NOT EXISTS wecom_conversation_insights (
  id BIGSERIAL PRIMARY KEY,
  insight_id VARCHAR(128) NOT NULL UNIQUE,
  conversation_id VARCHAR(128) NOT NULL,
  linked_customer_id VARCHAR(128),
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  summary_text TEXT,
  need_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  concern_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  objection_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_signals_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  intent_assessment_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_action_suggestions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_update_suggestions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(4,3),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(32) NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_wecom_conversation_insights_conversation_generated_at
  ON wecom_conversation_insights(conversation_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wecom_conversation_insights_customer_generated_at
  ON wecom_conversation_insights(linked_customer_id, generated_at DESC);


-- 可选：触发器函数，用于自动刷新 updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wecom_conversations_set_updated_at ON wecom_conversations;
CREATE TRIGGER trg_wecom_conversations_set_updated_at
BEFORE UPDATE ON wecom_conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
