import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';

export async function listOutreachDeliveryLogsService(actionId?: string) {
  const params: string[] = [];
  let whereClause = '';

  if (actionId) {
    params.push(actionId);
    whereClause = 'where action_id = $1';
  }

  const result = await db.query(
    `select id, action_id as "actionId", channel, receiver_type as "receiverType", receiver_id as "receiverId", delivery_status as "deliveryStatus", platform_message_id as "platformMessageId", failure_reason as "failureReason", created_at as "createdAt"
     from patient_outreach_delivery_log
     ${whereClause}
     order by created_at desc
     limit 100`,
    params
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function getOutreachDeliveryLogDetailService(id: string) {
  const result = await db.query(
    `select id, action_id as "actionId", channel, receiver_type as "receiverType", receiver_id as "receiverId", delivery_status as "deliveryStatus", platform_message_id as "platformMessageId", failure_reason as "failureReason", created_at as "createdAt"
     from patient_outreach_delivery_log
     where id = $1
     limit 1`,
    [id]
  );

  const item = result.rows[0] || null;
  if (!item) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'outreach delivery log not found');
  }

  return item;
}

export async function createOutreachDeliveryLogService(payload: {
  actionId: string;
  channel: string;
  receiverType: string;
  receiverId: string;
  deliveryStatus: string;
  platformMessageId?: string | null;
  failureReason?: string | null;
}) {
  const result = await db.query(
    `insert into patient_outreach_delivery_log (id, action_id, channel, receiver_type, receiver_id, delivery_status, platform_message_id, failure_reason)
     values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
     returning id, action_id as "actionId", channel, receiver_type as "receiverType", receiver_id as "receiverId", delivery_status as "deliveryStatus", platform_message_id as "platformMessageId", failure_reason as "failureReason", created_at as "createdAt"`,
    [payload.actionId, payload.channel, payload.receiverType, payload.receiverId, payload.deliveryStatus, payload.platformMessageId || null, payload.failureReason || null]
  );

  return result.rows[0];
}
