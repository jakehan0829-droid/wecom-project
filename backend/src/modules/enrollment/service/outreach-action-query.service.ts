import { db } from '../../../infra/db/pg.js';

export async function listConversationPendingOutreachActionsService(conversationId: string) {
  const { rows } = await db.query(
    `select a.id, a.patient_id as "patientId", a.action_type as "actionType", a.trigger_source as "triggerSource",
            a.summary, a.status, a.sent_at as "sentAt", a.failure_reason as "failureReason", a.created_at as "createdAt"
       from patient_outreach_action a
       join wecom_conversations c on c.primary_customer_id = a.patient_id
      where c.conversation_id = $1
        and a.status = 'pending'
      order by a.created_at desc
      limit 20`,
    [conversationId]
  );

  return rows;
}

export async function listConversationActionHistoryService(conversationId: string) {
  const { rows } = await db.query(
    `select a.id, a.patient_id as "patientId", a.action_type as "actionType", a.trigger_source as "triggerSource",
            a.summary, a.status, a.sent_at as "sentAt", a.failure_reason as "failureReason", a.created_at as "createdAt"
       from patient_outreach_action a
       join wecom_conversations c on c.primary_customer_id = a.patient_id
      where c.conversation_id = $1
        and a.status in ('done', 'failed', 'closed')
      order by coalesce(a.sent_at, a.created_at) desc, a.created_at desc
      limit 30`,
    [conversationId]
  );

  return rows;
}
