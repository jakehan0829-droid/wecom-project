import { db } from '../../../infra/db/pg.js';

type DedupInput = {
  conversationId: string;
  triggerEvent?: string;
  triggerAction?: string;
  stateTransition?: string;
  messageId?: string;
};

export async function checkWecomAutomationDedupService(input: DedupInput) {
  if (input.messageId) {
    const byMessage = await db.query(
      `select id
         from wecom_automation_audit
        where conversation_id = $1
          and message_id = $2
        limit 1`,
      [input.conversationId, input.messageId]
    );

    if (byMessage.rows[0]) {
      return {
        duplicate: true,
        reason: 'duplicate_message_id'
      };
    }
  }

  if (input.triggerEvent && input.triggerAction && input.stateTransition) {
    const byEvent = await db.query(
      `select id
         from wecom_automation_audit
        where conversation_id = $1
          and trigger_event = $2
          and trigger_action = $3
          and state_transition = $4
          and created_at::date = current_date
        limit 1`,
      [input.conversationId, input.triggerEvent, input.triggerAction, input.stateTransition]
    );

    if (byEvent.rows[0]) {
      return {
        duplicate: true,
        reason: 'duplicate_event_transition_same_day'
      };
    }
  }

  return {
    duplicate: false,
    reason: 'fresh_event'
  };
}
