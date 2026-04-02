import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';

const SAMPLE = {
  conversationId: 'wecom:private:HanCong',
  platformChatId: 'HanCong',
  conversationName: 'HanCong',
  patientId: '689ca26c-b8d0-46e4-a6d3-c5b750472eff',
  actionType: 'manual_followup',
  triggerSource: 'manual',
  summary: '【测试】工作台 V1 真实试跑用 pending action'
} as const;

export async function ensureWorkbenchV1TrialSample() {
  // 确保患者存在
  await db.query(
    `insert into patient (id, name, management_status, created_at)
     values ($1, $2, 'active', now())
     on conflict (id) do nothing`,
    [SAMPLE.patientId, '测试患者']
  );

  await db.query(
    `insert into wecom_conversations (
      conversation_id, chat_type, platform_chat_id, conversation_name,
      primary_customer_id, status, message_count, started_at, last_message_at
    ) values ($1, 'private', $2, $3, $4, 'active', 1, now(), now())
    on conflict (conversation_id)
    do update set
      platform_chat_id = excluded.platform_chat_id,
      conversation_name = excluded.conversation_name,
      primary_customer_id = excluded.primary_customer_id,
      status = 'active',
      updated_at = now()`,
    [SAMPLE.conversationId, SAMPLE.platformChatId, SAMPLE.conversationName, SAMPLE.patientId]
  );

  const existing = await db.query(
    `select id, summary, status, created_at as "createdAt"
       from patient_outreach_action
      where patient_id = $1
        and action_type = $2
        and trigger_source = $3
        and summary = $4
        and status = 'pending'
        and created_at::date = current_date
      order by created_at desc
      limit 1`,
    [SAMPLE.patientId, SAMPLE.actionType, SAMPLE.triggerSource, SAMPLE.summary]
  );

  let action = existing.rows[0] || null;

  if (!action) {
    const inserted = await db.query(
      `insert into patient_outreach_action (
        id, patient_id, action_type, trigger_source, summary, status, sent_at, failure_reason
      ) values ($1, $2, $3, $4, $5, 'pending', null, null)
      returning id, summary, status, created_at as "createdAt"`,
      [randomUUID(), SAMPLE.patientId, SAMPLE.actionType, SAMPLE.triggerSource, SAMPLE.summary]
    );
    action = inserted.rows[0];
  }

  return {
    sample: SAMPLE,
    action
  };
}
