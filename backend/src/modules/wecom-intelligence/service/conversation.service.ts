import { db } from '../../../infra/db/pg.js';
import type { NormalizedWecomMessage } from './message-normalize.service.js';

function mapSenderRoleToParticipantRole(senderRole: string) {
  if (senderRole === 'customer') return 'customer';
  if (senderRole === 'staff') return 'staff';
  if (senderRole === 'system') return 'system';
  return 'unknown';
}

export async function upsertConversation(message: NormalizedWecomMessage) {
  await db.query(
    `insert into wecom_conversations (
      conversation_id, chat_type, platform_chat_id, conversation_name,
      primary_customer_id, mapping_status, mapping_matched_by,
      status, message_count, started_at, last_message_at
    ) values ($1, $2, $3, $4, $5, $6, $7, 'active', 1, $8, $8)
    on conflict (conversation_id)
    do update set
      conversation_name = coalesce(excluded.conversation_name, wecom_conversations.conversation_name),
      primary_customer_id = coalesce(excluded.primary_customer_id, wecom_conversations.primary_customer_id),
      mapping_status = coalesce(excluded.mapping_status, wecom_conversations.mapping_status),
      mapping_matched_by = coalesce(excluded.mapping_matched_by, wecom_conversations.mapping_matched_by),
      message_count = wecom_conversations.message_count + 1,
      last_message_at = excluded.last_message_at,
      updated_at = now()`,
    [
      message.conversationId,
      message.chatType,
      message.platformChatId,
      message.conversationName || null,
      message.linkedCustomerId || null,
      null,
      null,
      message.sentAt
    ]
  );
}

export async function upsertConversationParticipant(message: NormalizedWecomMessage) {
  await db.query(
    `insert into wecom_conversation_participants (
      conversation_id, user_id, user_name, role_type, is_primary_contact, joined_at
    ) values ($1, $2, $3, $4, $5, $6)
    on conflict (conversation_id, user_id)
    do update set
      user_name = coalesce(excluded.user_name, wecom_conversation_participants.user_name),
      role_type = excluded.role_type,
      is_primary_contact = excluded.is_primary_contact,
      left_at = null`,
    [
      message.conversationId,
      message.senderId,
      message.senderName || null,
      mapSenderRoleToParticipantRole(message.senderRole),
      message.senderRole === 'customer',
      message.sentAt
    ]
  );
}

export async function assignConversationPrimaryCustomer(conversationId: string, patientId: string, force = false) {
  await db.query(
    force
      ? `update wecom_conversations
            set primary_customer_id = $2,
                updated_at = now()
          where conversation_id = $1`
      : `update wecom_conversations
            set primary_customer_id = $2,
                updated_at = now()
          where conversation_id = $1
            and (primary_customer_id is null or primary_customer_id = '' or primary_customer_id = $2)`,
    [conversationId, patientId]
  );
}

export async function clearConversationPrimaryCustomer(conversationId: string) {
  await db.query(
    `update wecom_conversations
        set primary_customer_id = null,
            updated_at = now()
      where conversation_id = $1`,
    [conversationId]
  );
}

export async function getConversationDetail(conversationId: string) {
  const { rows } = await db.query(
    `select conversation_id, chat_type, platform_chat_id, conversation_name,
            primary_customer_id,
            status, message_count, started_at, last_message_at,
            created_at, updated_at
       from wecom_conversations
      where conversation_id = $1
      limit 1`,
    [conversationId]
  );

  return rows[0] || null;
}
