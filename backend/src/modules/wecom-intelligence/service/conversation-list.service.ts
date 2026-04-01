import { db } from '../../../infra/db/pg.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';
import { hasWecomConversationMappingColumns } from './schema-capability.service.js';

export async function listWecomConversationsService(query: Record<string, unknown>) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const hasStableMappingColumns = await hasWecomConversationMappingColumns();

  if (typeof query.status === 'string' && query.status.trim()) {
    values.push(query.status.trim());
    conditions.push(`status = $${values.length}`);
  }

  if (typeof query.keyword === 'string' && query.keyword.trim()) {
    values.push(`%${query.keyword.trim()}%`);
    conditions.push(`(conversation_name ilike $${values.length} or platform_chat_id ilike $${values.length} or primary_customer_id ilike $${values.length})`);
  }

  if (hasStableMappingColumns && typeof query.mappingStatus === 'string' && query.mappingStatus.trim()) {
    values.push(query.mappingStatus.trim());
    conditions.push(`coalesce(mapping_status, 'unknown') = $${values.length}`);
  }

  if (hasStableMappingColumns && typeof query.matchedBy === 'string' && query.matchedBy.trim()) {
    values.push(query.matchedBy.trim());
    conditions.push(`coalesce(mapping_matched_by, 'unknown') = $${values.length}`);
  }

  const selectFields = hasStableMappingColumns
    ? `conversation_id, chat_type, platform_chat_id, conversation_name,
       primary_customer_id, mapping_status, mapping_matched_by,
       status, message_count, started_at, last_message_at,
       created_at, updated_at`
    : `conversation_id, chat_type, platform_chat_id, conversation_name,
       primary_customer_id,
       status, message_count, started_at, last_message_at,
       created_at, updated_at`;

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  values.push(typeof query.limit === 'string' ? Number(query.limit) : 50);

  const { rows } = await db.query(
    `select ${selectFields}
       from wecom_conversations
       ${where}
      order by last_message_at desc nulls last, updated_at desc
      limit $${values.length}`,
    values
  );

  const withMapping = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      mapping: await lookupCustomerMapping(
        row.platform_chat_id as string,
        row.conversation_id as string
      )
    }))
  );

  if (!hasStableMappingColumns && (query.mappingStatus || query.matchedBy)) {
    return withMapping.filter((row) => {
      if (typeof query.mappingStatus === 'string' && query.mappingStatus.trim()) {
        if ((row.mapping?.status || 'unknown') !== query.mappingStatus.trim()) return false;
      }

      if (typeof query.matchedBy === 'string' && query.matchedBy.trim()) {
        const matchedBy = row.mapping && row.mapping.status === 'matched'
          ? row.mapping.mapping.matchedBy
          : row.mapping && row.mapping.status === 'conflict'
            ? row.mapping.matchedBy
            : 'unknown';
        if (matchedBy !== query.matchedBy.trim()) return false;
      }

      return true;
    });
  }

  return withMapping;
}
