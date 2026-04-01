create table if not exists org (
  id varchar(64) primary key,
  name varchar(128) not null,
  created_at timestamptz not null default now()
);

create table if not exists user_account (
  id varchar(64) primary key,
  org_id varchar(64) references org(id),
  name varchar(64) not null,
  mobile varchar(32) not null unique,
  password_hash varchar(255) not null,
  created_at timestamptz not null default now()
);

create table if not exists patient (
  id varchar(64) primary key,
  org_id varchar(64) references org(id),
  name varchar(64) not null,
  gender varchar(16),
  birth_date date,
  mobile varchar(32),
  diabetes_type varchar(32),
  risk_level varchar(16),
  source varchar(32),
  management_status varchar(32) not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists patient_wecom_binding (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  binding_type varchar(32) not null,
  wecom_user_id varchar(128),
  external_user_id varchar(128),
  binding_status varchar(32) not null default 'bound',
  bound_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists patient_profile_ext (
  patient_id varchar(64) primary key references patient(id),
  basic_info text,
  preferences text,
  core_problem text,
  communication_summary text,
  followup_focus text,
  persona_summary text,
  recent_issue_summary text,
  followup_plan text,
  source_conversations text,
  updated_at timestamptz not null default now()
);

create table if not exists patient_tag (
  id varchar(64) primary key,
  org_id varchar(64) references org(id),
  tag_name varchar(64) not null,
  tag_type varchar(32),
  created_at timestamptz not null default now()
);

create table if not exists patient_tag_relation (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  tag_id varchar(64) not null references patient_tag(id),
  created_at timestamptz not null default now()
);

create table if not exists doctor_review_task (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  summary varchar(255) not null,
  status varchar(32) not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists health_record_glucose (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  measure_time timestamptz not null,
  glucose_value numeric(5,2) not null,
  measure_scene varchar(32),
  source varchar(32),
  created_at timestamptz not null default now()
);

create table if not exists health_record_blood_pressure (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  measure_time timestamptz not null,
  systolic_value integer not null,
  diastolic_value integer not null,
  source varchar(32),
  created_at timestamptz not null default now()
);

create table if not exists health_record_weight (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  measure_time timestamptz not null,
  weight_value numeric(5,2) not null,
  source varchar(32),
  created_at timestamptz not null default now()
);

create extension if not exists pgcrypto;

create table if not exists patient_outreach_action (
  id varchar(64) primary key,
  patient_id varchar(64) not null references patient(id),
  action_type varchar(32) not null,
  trigger_source varchar(32) not null,
  summary varchar(255) not null,
  status varchar(32) not null default 'pending',
  sent_at timestamptz,
  failure_reason varchar(255),
  created_at timestamptz not null default now()
);

create table if not exists patient_outreach_delivery_log (
  id varchar(64) primary key,
  action_id varchar(64) not null references patient_outreach_action(id),
  channel varchar(32) not null,
  receiver_type varchar(32) not null,
  receiver_id varchar(128) not null,
  delivery_status varchar(32) not null,
  platform_message_id varchar(255),
  failure_reason varchar(255),
  created_at timestamptz not null default now()
);

create table if not exists wecom_conversations (
  id bigserial primary key,
  conversation_id varchar(128) not null unique,
  chat_type varchar(32) not null,
  platform_chat_id varchar(128) not null,
  conversation_name varchar(255),
  primary_customer_id varchar(128),
  mapping_status varchar(32),
  mapping_matched_by varchar(64),
  status varchar(32) not null default 'active',
  message_count integer not null default 0,
  started_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wecom_conversation_participants (
  id bigserial primary key,
  conversation_id varchar(128) not null,
  user_id varchar(128) not null,
  user_name varchar(255),
  role_type varchar(32) not null default 'unknown',
  is_primary_contact boolean not null default false,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_wecom_conversation_participants unique (conversation_id, user_id)
);

create table if not exists wecom_messages (
  id varchar(64) primary key,
  message_id varchar(128) not null unique,
  source_platform varchar(32) not null default 'wecom',
  chat_type varchar(32) not null,
  conversation_id varchar(128) not null,
  sender_id varchar(128) not null,
  sender_name varchar(255),
  sender_role varchar(32) not null default 'unknown',
  content_type varchar(32) not null default 'text',
  content_raw text,
  content_text text,
  sent_at timestamptz not null,
  received_at timestamptz not null default now(),
  linked_customer_id varchar(128),
  analysis_status varchar(32) not null default 'pending',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists wecom_conversation_insights (
  id bigserial primary key,
  insight_id varchar(128) not null unique,
  conversation_id varchar(128) not null,
  linked_customer_id varchar(128),
  time_window_start timestamptz,
  time_window_end timestamptz,
  summary_text text,
  need_points_json jsonb not null default '[]'::jsonb,
  concern_points_json jsonb not null default '[]'::jsonb,
  objection_points_json jsonb not null default '[]'::jsonb,
  risk_signals_json jsonb not null default '[]'::jsonb,
  intent_assessment_json jsonb not null default '{}'::jsonb,
  next_action_suggestions_json jsonb not null default '[]'::jsonb,
  plan_update_suggestions_json jsonb not null default '[]'::jsonb,
  confidence_score numeric(4,3),
  generated_at timestamptz not null default now(),
  generated_by varchar(32) not null default 'system'
);

create table if not exists wecom_event_state (
  id varchar(64) primary key,
  conversation_id varchar(128) not null,
  message_id varchar(128),
  linked_customer_id varchar(128),
  event_category varchar(64),
  event_action varchar(64),
  lifecycle_status varchar(64),
  state_transition varchar(128),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists wecom_automation_audit (
  id varchar(64) primary key,
  conversation_id varchar(128) not null,
  message_id varchar(128),
  linked_customer_id varchar(128),
  trigger_event varchar(64),
  trigger_action varchar(64),
  lifecycle_status varchar(64),
  state_transition varchar(128),
  triggered boolean not null default false,
  reason varchar(128),
  insight_id varchar(128),
  feedback_status varchar(64),
  action_status varchar(64),
  closure_status varchar(64),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists wecom_mapping_audit (
  id varchar(64) primary key,
  conversation_id varchar(128) not null,
  platform_chat_id varchar(128),
  action varchar(64) not null,
  from_patient_id varchar(128),
  to_patient_id varchar(128),
  mapping_status varchar(32),
  matched_by varchar(64),
  binding_type varchar(32),
  operator_note text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wecom_conversations_platform_chat_id on wecom_conversations(platform_chat_id);
create index if not exists idx_wecom_conversations_primary_customer_id on wecom_conversations(primary_customer_id);
create index if not exists idx_wecom_conversations_mapping_status on wecom_conversations(mapping_status);
create index if not exists idx_wecom_conversations_mapping_matched_by on wecom_conversations(mapping_matched_by);
create index if not exists idx_wecom_messages_conversation_sent_at on wecom_messages(conversation_id, sent_at desc);
create index if not exists idx_wecom_messages_customer_sent_at on wecom_messages(linked_customer_id, sent_at desc);
create index if not exists idx_wecom_messages_analysis_status on wecom_messages(analysis_status);
create index if not exists idx_wecom_conversation_insights_conversation_generated_at on wecom_conversation_insights(conversation_id, generated_at desc);
create index if not exists idx_wecom_conversation_insights_customer_generated_at on wecom_conversation_insights(linked_customer_id, generated_at desc);
create index if not exists idx_wecom_event_state_conversation_created_at on wecom_event_state(conversation_id, created_at desc);
create index if not exists idx_wecom_event_state_customer_created_at on wecom_event_state(linked_customer_id, created_at desc);
create index if not exists idx_wecom_automation_audit_conversation_created_at on wecom_automation_audit(conversation_id, created_at desc);
create index if not exists idx_wecom_automation_audit_customer_created_at on wecom_automation_audit(linked_customer_id, created_at desc);
create index if not exists idx_wecom_mapping_audit_conversation_created_at on wecom_mapping_audit(conversation_id, created_at desc);
create index if not exists idx_wecom_mapping_audit_action_created_at on wecom_mapping_audit(action, created_at desc);
