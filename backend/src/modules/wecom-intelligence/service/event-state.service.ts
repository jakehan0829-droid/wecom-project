import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';

type CreateWecomEventStatePayload = {
  conversationId: string;
  messageId?: string;
  customerId?: string;
  eventCategory?: string;
  eventAction?: string;
  lifecycleStatus?: string;
  stateTransition?: string;
  eventPayload?: Record<string, unknown>;
};

export async function createWecomEventStateService(payload: CreateWecomEventStatePayload) {
  await db.query(
    `insert into wecom_event_state (
      id, conversation_id, message_id, linked_customer_id,
      event_category, event_action, lifecycle_status, state_transition, payload_json
    ) values (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9::jsonb
    )`,
    [
      randomUUID(),
      payload.conversationId,
      payload.messageId || null,
      payload.customerId || null,
      payload.eventCategory || null,
      payload.eventAction || null,
      payload.lifecycleStatus || null,
      payload.stateTransition || null,
      JSON.stringify(payload.eventPayload || {})
    ]
  );

  return {
    stored: true,
    conversationId: payload.conversationId,
    messageId: payload.messageId || null,
    lifecycleStatus: payload.lifecycleStatus || null,
    stateTransition: payload.stateTransition || null
  };
}
