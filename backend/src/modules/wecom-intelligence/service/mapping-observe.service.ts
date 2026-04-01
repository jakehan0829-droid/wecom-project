import { db } from '../../../infra/db/pg.js';

export async function listUnmappedWecomCustomersService(limit = 20) {
  const { rows } = await db.query(
    `with latest as (
       select distinct on (m.conversation_id)
         m.conversation_id,
         c.platform_chat_id as customer_id,
         m.sent_at as last_message_at,
         m.metadata_json -> 'customerLookup' as customer_lookup,
         m.metadata_json -> 'patientMapping' as patient_mapping
       from wecom_messages m
       join wecom_conversations c on c.conversation_id = m.conversation_id
      where m.chat_type = 'private'
        and (m.linked_customer_id is null or m.linked_customer_id = '')
      order by m.conversation_id, m.sent_at desc
     ), counts as (
       select conversation_id, count(*)::int as message_count
         from wecom_messages
        where chat_type = 'private'
          and (linked_customer_id is null or linked_customer_id = '')
        group by conversation_id
     )
     select l.conversation_id, l.customer_id, l.last_message_at, c.message_count, l.customer_lookup, l.patient_mapping
       from latest l
       join counts c on c.conversation_id = l.conversation_id
      order by l.last_message_at desc
      limit $1`,
    [limit]
  );

  return rows.map((row) => ({
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    lastMessageAt: row.last_message_at,
    messageCount: row.message_count,
    customerLookup: row.customer_lookup,
    patientMapping: row.patient_mapping,
    status: 'unmapped'
  }));
}

export async function listMappingConflictWecomCustomersService(limit = 20) {
  const { rows } = await db.query(
    `with latest as (
       select distinct on (m.conversation_id)
         m.conversation_id,
         c.platform_chat_id as customer_id,
         m.sent_at as last_message_at,
         m.metadata_json -> 'customerLookup' as customer_lookup
       from wecom_messages m
       join wecom_conversations c on c.conversation_id = m.conversation_id
      where m.chat_type = 'private'
        and jsonb_extract_path_text(m.metadata_json, 'customerLookup', 'status') = 'conflict'
      order by m.conversation_id, m.sent_at desc
     ), counts as (
       select conversation_id, count(*)::int as message_count
         from wecom_messages
        where chat_type = 'private'
          and jsonb_extract_path_text(metadata_json, 'customerLookup', 'status') = 'conflict'
        group by conversation_id
     )
     select l.conversation_id, l.customer_id, l.last_message_at, c.message_count, l.customer_lookup
       from latest l
       join counts c on c.conversation_id = l.conversation_id
      order by l.last_message_at desc
      limit $1`,
    [limit]
  );

  return rows.map((row) => ({
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    lastMessageAt: row.last_message_at,
    messageCount: row.message_count,
    customerLookup: row.customer_lookup,
    status: 'conflict'
  }));
}

export async function getWecomMappingSummaryService() {
  const [matchedByRows, unmappedTotalRows, conflictTotalRows] = await Promise.all([
    db.query(
      `select
          coalesce(jsonb_extract_path_text(metadata_json, 'patientMapping', 'matchedBy'), 'unknown') as matched_by,
          count(*)::int as total
         from wecom_messages
        where metadata_json ? 'patientMapping'
        group by coalesce(jsonb_extract_path_text(metadata_json, 'patientMapping', 'matchedBy'), 'unknown')
        order by total desc`
    ),
    db.query(
      `select count(distinct conversation_id)::int as total
         from wecom_messages
        where chat_type = 'private'
          and (linked_customer_id is null or linked_customer_id = '')`
    ),
    db.query(
      `select count(distinct conversation_id)::int as total
         from wecom_messages
        where chat_type = 'private'
          and jsonb_extract_path_text(metadata_json, 'customerLookup', 'status') = 'conflict'`
    )
  ]);

  return {
    matchedBy: matchedByRows.rows,
    unmappedConversationTotal: unmappedTotalRows.rows[0]?.total || 0,
    conflictConversationTotal: conflictTotalRows.rows[0]?.total || 0
  };
}
