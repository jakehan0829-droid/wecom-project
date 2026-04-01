import { db } from '../../../infra/db/pg.js';
import { applyMappingAuditTimePreset } from './mapping-audit-time-preset.service.js';

export async function getWecomMappingAuditSummaryService(query: Record<string, unknown>) {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (typeof query.startTime === 'string' && query.startTime.trim()) {
    values.push(query.startTime.trim());
    conditions.push(`created_at >= $${values.length}`);
  }

  if (typeof query.endTime === 'string' && query.endTime.trim()) {
    values.push(query.endTime.trim());
    conditions.push(`created_at <= $${values.length}`);
  }

  if (typeof query.conversationId === 'string' && query.conversationId.trim()) {
    values.push(query.conversationId.trim());
    conditions.push(`conversation_id = $${values.length}`);
  }

  if (typeof query.bindingType === 'string' && query.bindingType.trim()) {
    values.push(query.bindingType.trim());
    conditions.push(`binding_type = $${values.length}`);
  }

  if (typeof query.operatorNote === 'string' && query.operatorNote.trim()) {
    values.push(`%${query.operatorNote.trim()}%`);
    conditions.push(`operator_note ilike $${values.length}`);
  }

  applyMappingAuditTimePreset(query, values, conditions);

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 10;

  const [byAction, byConversation, byMatchedBy, cards, recent] = await Promise.all([
    db.query(
      `select action, count(*)::int as total
         from wecom_mapping_audit
         ${where}
        group by action
        order by total desc, action asc`,
      values
    ),
    db.query(
      `select conversation_id as "conversationId", max(platform_chat_id) as "platformChatId", count(*)::int as total,
              max(created_at) as "lastActionAt"
         from wecom_mapping_audit
         ${where}
        group by conversation_id
        order by max(created_at) desc
        limit ${Number(limit)}`,
      values
    ),
    db.query(
      `select coalesce(matched_by, 'unknown') as "matchedBy", count(*)::int as total
         from wecom_mapping_audit
         ${where}
        group by coalesce(matched_by, 'unknown')
        order by total desc, "matchedBy" asc`,
      values
    ),
    db.query(
      `select
          count(*)::int as "totalActions",
          count(*) filter (where action = 'manual_confirm')::int as "manualConfirmTotal",
          count(*) filter (where action = 'manual_unconfirm')::int as "manualUnconfirmTotal",
          count(*) filter (where action = 'reassign')::int as "reassignTotal",
          count(*) filter (where action = 'promote_binding')::int as "promoteBindingTotal",
          count(distinct conversation_id)::int as "conversationTouchedTotal"
         from wecom_mapping_audit
         ${where}`,
      values
    ),
    db.query(
      `select conversation_id as "conversationId", platform_chat_id as "platformChatId", action,
              from_patient_id as "fromPatientId", to_patient_id as "toPatientId",
              mapping_status as "mappingStatus", matched_by as "matchedBy",
              binding_type as "bindingType", operator_note as "operatorNote",
              payload_json, created_at as "createdAt"
         from wecom_mapping_audit
         ${where}
        order by created_at desc
        limit ${Number(limit)}`,
      values
    )
  ]);

  return {
    cards: cards.rows[0] || {
      totalActions: 0,
      manualConfirmTotal: 0,
      manualUnconfirmTotal: 0,
      reassignTotal: 0,
      promoteBindingTotal: 0,
      conversationTouchedTotal: 0
    },
    byAction: byAction.rows,
    byMatchedBy: byMatchedBy.rows,
    byConversation: byConversation.rows,
    recent: recent.rows
  };
}
