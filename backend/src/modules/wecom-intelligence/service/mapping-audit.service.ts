import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { applyMappingAuditTimePreset } from './mapping-audit-time-preset.service.js';

export async function createWecomMappingAuditService(payload: {
  conversationId: string;
  platformChatId?: string | null;
  action: 'manual_confirm' | 'manual_unconfirm' | 'promote_binding' | 'reassign';
  fromPatientId?: string | null;
  toPatientId?: string | null;
  mappingStatus?: string | null;
  matchedBy?: string | null;
  bindingType?: string | null;
  operatorNote?: string | null;
  operatorName?: string | null;
  detail?: Record<string, unknown>;
}) {
  await db.query(
    `insert into wecom_mapping_audit (
      id, conversation_id, platform_chat_id, action,
      from_patient_id, to_patient_id, mapping_status, matched_by,
      binding_type, operator_note, payload_json
    ) values (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11::jsonb
    )`,
    [
      randomUUID(),
      payload.conversationId,
      payload.platformChatId || null,
      payload.action,
      payload.fromPatientId || null,
      payload.toPatientId || null,
      payload.mappingStatus || null,
      payload.matchedBy || null,
      payload.bindingType || null,
      payload.operatorNote || null,
      JSON.stringify({ ...(payload.detail || {}), operatorName: payload.operatorName || null })
    ]
  );
}

export async function listWecomMappingAuditService(query: Record<string, unknown>) {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (typeof query.conversationId === 'string' && query.conversationId.trim()) {
    values.push(query.conversationId.trim());
    conditions.push(`conversation_id = $${values.length}`);
  }

  if (typeof query.action === 'string' && query.action.trim()) {
    values.push(query.action.trim());
    conditions.push(`action = $${values.length}`);
  }

  if (typeof query.mappingStatus === 'string' && query.mappingStatus.trim()) {
    values.push(query.mappingStatus.trim());
    conditions.push(`mapping_status = $${values.length}`);
  }

  if (typeof query.matchedBy === 'string' && query.matchedBy.trim()) {
    values.push(query.matchedBy.trim());
    conditions.push(`matched_by = $${values.length}`);
  }

  if (typeof query.bindingType === 'string' && query.bindingType.trim()) {
    values.push(query.bindingType.trim());
    conditions.push(`binding_type = $${values.length}`);
  }

  if (typeof query.operatorNote === 'string' && query.operatorNote.trim()) {
    values.push(`%${query.operatorNote.trim()}%`);
    conditions.push(`operator_note ilike $${values.length}`);
  }

  if (typeof query.startTime === 'string' && query.startTime.trim()) {
    values.push(query.startTime.trim());
    conditions.push(`created_at >= $${values.length}`);
  }

  if (typeof query.endTime === 'string' && query.endTime.trim()) {
    values.push(query.endTime.trim());
    conditions.push(`created_at <= $${values.length}`);
  }

  applyMappingAuditTimePreset(query, values, conditions);

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  values.push(typeof query.limit === 'string' ? Number(query.limit) : 50);

  const { rows } = await db.query(
    `select conversation_id, platform_chat_id, action, from_patient_id as "fromPatientId",
            to_patient_id as "toPatientId", mapping_status as "mappingStatus",
            matched_by as "matchedBy", binding_type as "bindingType",
            operator_note as "operatorNote", payload_json as detail,
            payload_json->>'operatorName' as "operatorName",
            created_at as "createdAt"
       from wecom_mapping_audit
       ${where}
      order by created_at desc
      limit $${values.length}`,
    values
  );

  return rows;
}
