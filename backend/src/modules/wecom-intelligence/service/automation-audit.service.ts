import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';

type CreateWecomAutomationAuditPayload = {
  conversationId: string;
  messageId?: string;
  customerId?: string;
  triggerEvent?: string;
  triggerAction?: string;
  lifecycleStatus?: string;
  stateTransition?: string;
  triggered: boolean;
  reason?: string;
  insightId?: string | null;
  feedbackStatus?: string | null;
  actionStatus?: string | null;
  closureStatus?: string | null;
  payload?: Record<string, unknown>;
};

export async function createWecomAutomationAuditService(payload: CreateWecomAutomationAuditPayload) {
  await db.query(
    `insert into wecom_automation_audit (
      id, conversation_id, message_id, linked_customer_id,
      trigger_event, trigger_action, lifecycle_status, state_transition,
      triggered, reason, insight_id, feedback_status, action_status, closure_status, payload_json
    ) values (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15::jsonb
    )`,
    [
      randomUUID(),
      payload.conversationId,
      payload.messageId || null,
      payload.customerId || null,
      payload.triggerEvent || null,
      payload.triggerAction || null,
      payload.lifecycleStatus || null,
      payload.stateTransition || null,
      payload.triggered,
      payload.reason || null,
      payload.insightId || null,
      payload.feedbackStatus || null,
      payload.actionStatus || null,
      payload.closureStatus || null,
      JSON.stringify(payload.payload || {})
    ]
  );

  return {
    stored: true,
    conversationId: payload.conversationId,
    stateTransition: payload.stateTransition || null,
    reason: payload.reason || null
  };
}
