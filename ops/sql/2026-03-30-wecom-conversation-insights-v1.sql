-- D3 insight 存储结构草案 v1
-- 说明：当前项目里已有 wecom_conversation_insights 旧结构。
-- 本草案先不直接执行 destructive migration，而是作为第一版迁移参考。

create table if not exists wecom_conversation_insights_v1 (
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

create index if not exists idx_wecom_conversation_insights_v1_conversation_created
  on wecom_conversation_insights_v1 (conversation_id, created_at desc);

create index if not exists idx_wecom_conversation_insights_v1_customer_created
  on wecom_conversation_insights_v1 (customer_id, created_at desc);

create index if not exists idx_wecom_conversation_insights_v1_patient_created
  on wecom_conversation_insights_v1 (patient_id, created_at desc);

create index if not exists idx_wecom_conversation_insights_v1_stage_created
  on wecom_conversation_insights_v1 (stage, created_at desc);
