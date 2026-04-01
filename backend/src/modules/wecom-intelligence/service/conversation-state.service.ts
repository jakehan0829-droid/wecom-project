import { db } from '../../../infra/db/pg.js';
import { shouldUpdateConversationStatus } from './conversation-status-policy.service.js';

export async function updateWecomConversationStatusService(conversationId: string, status: string) {
  const current = await db.query(
    `select status from wecom_conversations where conversation_id = $1 limit 1`,
    [conversationId]
  );

  const currentStatus = (current.rows[0]?.status as string | undefined) || null;
  const shouldUpdate = shouldUpdateConversationStatus(currentStatus, status);

  if (!shouldUpdate) {
    return {
      updated: false,
      conversationId,
      status: currentStatus,
      skippedReason: 'lower_priority_status_blocked'
    };
  }

  await db.query(
    `update wecom_conversations
     set status = $2,
         updated_at = now()
     where conversation_id = $1`,
    [conversationId, status]
  );

  return {
    updated: true,
    conversationId,
    previousStatus: currentStatus,
    status
  };
}
