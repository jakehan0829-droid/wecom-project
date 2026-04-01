import { db } from '../../../infra/db/pg.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';
import { hasWecomConversationMappingColumns } from './schema-capability.service.js';

export async function refreshConversationMappingStateService(conversationId: string, platformChatId: string) {
  const mapping = await lookupCustomerMapping(platformChatId, conversationId);

  const mappingStatus = mapping?.status || 'unknown';
  const matchedBy = mapping && mapping.status === 'matched'
    ? mapping.mapping.matchedBy
    : mapping && mapping.status === 'conflict'
      ? mapping.matchedBy
      : 'unknown';

  if (await hasWecomConversationMappingColumns()) {
    await db.query(
      `update wecom_conversations
          set mapping_status = $2,
              mapping_matched_by = $3,
              updated_at = now()
        where conversation_id = $1`,
      [conversationId, mappingStatus, matchedBy]
    );
  }

  return {
    mapping,
    mappingStatus,
    matchedBy
  };
}
