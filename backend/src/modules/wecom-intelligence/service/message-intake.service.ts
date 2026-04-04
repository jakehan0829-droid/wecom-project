import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { normalizeWecomMessage, type WecomMessageIntakeInput } from './message-normalize.service.js';
import { assignConversationPrimaryCustomer, upsertConversation, upsertConversationParticipant } from './conversation.service.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';
import type { WecomSenderRole } from './wecom-automation.types.js';

function isWecomLocalBypassEnabled() {
  return process.env.WECOM_WEBHOOK_LOCAL_BYPASS_DB === '1';
}

export type MessageIntakeResult = {
  messageId: string;
  conversationId: string;
  linkedCustomerId: string | null;
  patientMapping: Record<string, unknown> | null;
  customerLookup: Record<string, unknown> | null;
  senderRole: WecomSenderRole;
  messageCategory: string;
};

export async function intakeWecomMessage(input: WecomMessageIntakeInput) {
  const normalized = normalizeWecomMessage(input);

  if (isWecomLocalBypassEnabled()) {
    return {
      messageId: normalized.messageId,
      conversationId: normalized.conversationId,
      linkedCustomerId: normalized.linkedCustomerId || null,
      patientMapping: null,
      customerLookup: null,
      senderRole: normalized.senderRole,
      messageCategory: normalized.messageCategory,
      bypassed: true,
      bypassReason: 'WECOM_WEBHOOK_LOCAL_BYPASS_DB=1'
    };
  }

  const mappingLookup = await lookupCustomerMapping(normalized.linkedCustomerId, normalized.conversationId);
  const patientMapping = mappingLookup?.status === 'matched' ? mappingLookup.mapping : null;
  const linkedCustomerId = patientMapping?.patientId || normalized.linkedCustomerId || null;

  const normalizedWithPatient = {
    ...normalized,
    linkedCustomerId: linkedCustomerId || undefined,
    metadata: {
      ...normalized.metadata,
      patientMapping,
      customerLookup: mappingLookup
    }
  };

  await upsertConversation(normalizedWithPatient);
  await upsertConversationParticipant(normalizedWithPatient);

  if (patientMapping?.patientId) {
    await assignConversationPrimaryCustomer(normalizedWithPatient.conversationId, patientMapping.patientId);
  }

  await db.query(
    `insert into wecom_messages (
      id, message_id, source_platform, chat_type, conversation_id,
      sender_id, sender_name, sender_role, content_type,
      content_raw, content_text, sent_at, linked_customer_id, metadata_json
    ) values (
      $1, $2, 'wecom', $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12, $13::jsonb
    )
    on conflict (message_id) do nothing`,
    [
      randomUUID(),
      normalizedWithPatient.messageId,
      normalizedWithPatient.chatType,
      normalizedWithPatient.conversationId,
      normalizedWithPatient.senderId,
      normalizedWithPatient.senderName || null,
      normalizedWithPatient.senderRole,
      normalizedWithPatient.contentType,
      normalizedWithPatient.contentRaw,
      normalizedWithPatient.contentText,
      normalizedWithPatient.sentAt,
      normalizedWithPatient.linkedCustomerId || null,
      JSON.stringify(normalizedWithPatient.metadata || {})
    ]
  );

  const result: MessageIntakeResult = {
    messageId: normalizedWithPatient.messageId,
    conversationId: normalizedWithPatient.conversationId,
    linkedCustomerId: normalizedWithPatient.linkedCustomerId || null,
    patientMapping,
    customerLookup: mappingLookup,
    senderRole: normalizedWithPatient.senderRole,
    messageCategory: normalizedWithPatient.messageCategory
  };

  return result;
}
