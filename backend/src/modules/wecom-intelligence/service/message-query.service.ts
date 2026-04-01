import { db } from '../../../infra/db/pg.js';

export async function listWecomMessages(filters: {
  customerId?: string;
  conversationId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.customerId) {
    values.push(filters.customerId);
    conditions.push(`linked_customer_id = $${values.length}`);
  }
  if (filters.conversationId) {
    values.push(filters.conversationId);
    conditions.push(`conversation_id = $${values.length}`);
  }
  if (filters.startTime) {
    values.push(filters.startTime);
    conditions.push(`sent_at >= $${values.length}`);
  }
  if (filters.endTime) {
    values.push(filters.endTime);
    conditions.push(`sent_at <= $${values.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  values.push(filters.limit || 50);

  const { rows } = await db.query(
    `select message_id, chat_type, conversation_id, sender_id, sender_name, sender_role,
            content_type, content_raw, content_text, sent_at, linked_customer_id, metadata_json
       from wecom_messages
       ${where}
      order by sent_at desc
      limit $${values.length}`,
    values
  );

  return rows;
}
