import { db } from '../../../infra/db/pg.js';

let mappingColumnsCache: boolean | null = null;

export async function hasWecomConversationMappingColumns() {
  if (mappingColumnsCache !== null) return mappingColumnsCache;

  const result = await db.query(
    `select count(*)::int as total
       from information_schema.columns
      where table_name = 'wecom_conversations'
        and column_name in ('mapping_status', 'mapping_matched_by')`
  );

  mappingColumnsCache = Number(result.rows[0]?.total || 0) >= 2;
  return mappingColumnsCache;
}

export function resetSchemaCapabilityCache() {
  mappingColumnsCache = null;
}
