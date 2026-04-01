alter table wecom_conversation_insights_v1
  add column if not exists customer_ref text null,
  add column if not exists patient_ref text null;

create index if not exists idx_wecom_conversation_insights_v1_customer_ref_created
  on wecom_conversation_insights_v1 (customer_ref, created_at desc);

create index if not exists idx_wecom_conversation_insights_v1_patient_ref_created
  on wecom_conversation_insights_v1 (patient_ref, created_at desc);
