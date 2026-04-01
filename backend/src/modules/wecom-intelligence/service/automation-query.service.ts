import { db } from '../../../infra/db/pg.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';

export async function listWecomEventStateService(query: Record<string, unknown>) {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (typeof query.conversationId === 'string') {
    values.push(query.conversationId);
    conditions.push(`conversation_id = $${values.length}`);
  }
  if (typeof query.customerId === 'string') {
    values.push(query.customerId);
    conditions.push(`linked_customer_id = $${values.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  values.push(typeof query.limit === 'string' ? Number(query.limit) : 20);

  const { rows } = await db.query(
    `select conversation_id, message_id, linked_customer_id, event_category, event_action,
            lifecycle_status, state_transition, payload_json, created_at
       from wecom_event_state
       ${where}
      order by created_at desc
      limit $${values.length}`,
    values
  );

  return rows;
}

export async function listWecomAutomationAuditService(query: Record<string, unknown>) {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (typeof query.conversationId === 'string') {
    values.push(query.conversationId);
    conditions.push(`conversation_id = $${values.length}`);
  }
  if (typeof query.customerId === 'string') {
    values.push(query.customerId);
    conditions.push(`linked_customer_id = $${values.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  values.push(typeof query.limit === 'string' ? Number(query.limit) : 20);

  const { rows } = await db.query(
    `select conversation_id, message_id, linked_customer_id, trigger_event, trigger_action,
            lifecycle_status, state_transition, triggered, reason, insight_id,
            feedback_status, action_status, closure_status, payload_json, created_at
       from wecom_automation_audit
       ${where}
      order by created_at desc
      limit $${values.length}`,
    values
  );

  return rows;
}

export async function getWecomConversationOpsViewService(conversationId: string) {
  const conversation = await db.query(
    `select conversation_id, chat_type, platform_chat_id, conversation_name,
            primary_customer_id, status, message_count, started_at, last_message_at,
            created_at, updated_at
       from wecom_conversations
      where conversation_id = $1
      limit 1`,
    [conversationId]
  );

  const conversationRow = conversation.rows[0] || null;
  const mapping = conversationRow
    ? await lookupCustomerMapping(conversationRow.platform_chat_id as string, conversationId)
    : null;

  const latestEventState = await db.query(
    `select event_category, event_action, lifecycle_status, state_transition, payload_json, created_at
       from wecom_event_state
      where conversation_id = $1
      order by created_at desc
      limit 5`,
    [conversationId]
  );

  const latestAutomationAudit = await db.query(
    `select trigger_event, trigger_action, lifecycle_status, state_transition, triggered,
            reason, insight_id, feedback_status, action_status, closure_status, created_at
       from wecom_automation_audit
      where conversation_id = $1
      order by created_at desc
      limit 5`,
    [conversationId]
  );

  return {
    conversation: conversationRow,
    mapping,
    latestEventState: latestEventState.rows,
    latestAutomationAudit: latestAutomationAudit.rows
  };
}
