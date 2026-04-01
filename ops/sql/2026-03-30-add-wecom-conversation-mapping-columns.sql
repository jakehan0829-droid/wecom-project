-- Owner-level migration for existing databases
-- Purpose: add stable mapping fields to wecom_conversations for fast filtering/query

alter table wecom_conversations
  add column if not exists mapping_status varchar(32);

alter table wecom_conversations
  add column if not exists mapping_matched_by varchar(64);

create index if not exists idx_wecom_conversations_mapping_status
  on wecom_conversations(mapping_status);

create index if not exists idx_wecom_conversations_mapping_matched_by
  on wecom_conversations(mapping_matched_by);
