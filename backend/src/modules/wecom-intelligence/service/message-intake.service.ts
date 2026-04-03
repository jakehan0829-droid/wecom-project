import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { normalizeWecomMessage, type WecomMessageIntakeInput } from './message-normalize.service.js';
import { assignConversationPrimaryCustomer, upsertConversation } from './conversation.service.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';
import { aiModelService } from './ai-model.service.js';

function isWecomLocalBypassEnabled() {
  return process.env.WECOM_WEBHOOK_LOCAL_BYPASS_DB === '1';
}

export async function intakeWecomMessage(input: WecomMessageIntakeInput) {
  const normalized = normalizeWecomMessage(input);

  if (isWecomLocalBypassEnabled()) {
    return {
      messageId: normalized.messageId,
      conversationId: normalized.conversationId,
      linkedCustomerId: normalized.linkedCustomerId || null,
      patientMapping: null,
      customerLookup: null,
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

  // 异步触发AI分析（不阻塞主流程）
  if (process.env.ENABLE_AI_ANALYSIS !== 'false' && normalizedWithPatient.contentType === 'text') {
    triggerMessageAnalysis(normalizedWithPatient.messageId).catch((error: unknown) => {
      console.error(`Failed to trigger AI analysis for message ${normalizedWithPatient.messageId}:`, error);
    });
  }

  return {
    messageId: normalizedWithPatient.messageId,
    conversationId: normalizedWithPatient.conversationId,
    linkedCustomerId: normalizedWithPatient.linkedCustomerId || null,
    patientMapping,
    customerLookup: mappingLookup
  };
}

// 触发消息分析的辅助方法
async function triggerMessageAnalysis(messageId: string) {
  try {
    // 延迟一下，确保消息已写入数据库
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await aiModelService.analyzeMessageAndUpdateArchives(messageId);

    if (result.success) {
      console.log(`AI analysis completed for message ${messageId}, archive updated: ${result.archiveUpdated}`);
    } else {
      console.warn(`AI analysis failed for message ${messageId}: ${result.error}`);
    }
  } catch (error) {
    console.error(`Error in triggerMessageAnalysis for ${messageId}:`, error);
  }
}
