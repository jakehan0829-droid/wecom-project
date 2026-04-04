import { db } from '../../../infra/db/pg.js';

type SaveInsightV1Payload = {
  conversationId: string;
  customerId?: string | null;
  patientId?: string | null;
  customerRef?: string | null;
  patientRef?: string | null;
  analysisVersion?: string;
  summary: string;
  stage: string;
  needs: string[];
  concerns: string[];
  objections: string[];
  risks: string[];
  nextActions: string[];
  confidence: 'high' | 'medium' | 'low';
  evidenceMessageIds: string[];
  sourceMessageCount: number;
  sourceWindowStartAt?: string | null;
  sourceWindowEndAt?: string | null;
};

function confidenceToText(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

export async function saveInsightV1(payload: SaveInsightV1Payload) {
  const { rows } = await db.query(
    `insert into wecom_conversation_insights_v1 (
      conversation_id, customer_id, patient_id, customer_ref, patient_ref, analysis_version,
      summary, stage, needs_json, concerns_json, objections_json,
      risks_json, next_actions_json, confidence, evidence_message_ids_json,
      source_message_count, source_window_start_at, source_window_end_at
    ) values (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9::jsonb, $10::jsonb, $11::jsonb,
      $12::jsonb, $13::jsonb, $14, $15::jsonb,
      $16, $17, $18
    )
    returning id, conversation_id, created_at`,
    [
      payload.conversationId,
      payload.customerId || null,
      payload.patientId || null,
      payload.customerRef || null,
      payload.patientRef || null,
      payload.analysisVersion || 'v1',
      payload.summary,
      payload.stage,
      JSON.stringify(payload.needs || []),
      JSON.stringify(payload.concerns || []),
      JSON.stringify(payload.objections || []),
      JSON.stringify(payload.risks || []),
      JSON.stringify(payload.nextActions || []),
      payload.confidence,
      JSON.stringify(payload.evidenceMessageIds || []),
      payload.sourceMessageCount || 0,
      payload.sourceWindowStartAt || null,
      payload.sourceWindowEndAt || null
    ]
  );

  return rows[0] || null;
}

function mapInsightV1Row(row: Record<string, unknown>) {
  const needs = Array.isArray(row.needs_json) ? row.needs_json : [];
  const nextActions = Array.isArray(row.next_actions_json) ? row.next_actions_json : [];

  return {
    insightId: String(row.id),
    conversationId: row.conversation_id,
    customerId: row.customer_id || null,
    patientId: row.patient_id || null,
    customerRef: row.customer_ref || null,
    patientRef: row.patient_ref || null,
    analysisVersion: row.analysis_version || 'v1',
    summaryText: row.summary,
    stage: row.stage || 'unknown',
    needs,
    concerns: Array.isArray(row.concerns_json) ? row.concerns_json : [],
    objections: Array.isArray(row.objections_json) ? row.objections_json : [],
    risks: Array.isArray(row.risks_json) ? row.risks_json : [],
    nextActions,
    confidence: confidenceToText(row.confidence),
    evidenceMessageIds: Array.isArray(row.evidence_message_ids_json) ? row.evidence_message_ids_json : [],
    sourceMessageCount: Number(row.source_message_count || 0),
    d4Summary: {
      proposalSuggestion: needs.length ? {
        suggestionType: 'need_update',
        suggestionText: `建议把“${String(needs[0])}”纳入客户方案/沟通重点。`,
        priority: 'medium'
      } : null,
      actionSuggestion: nextActions.length ? {
        actionType: 'manual_followup',
        actionText: String(nextActions[0]),
        priority: 'medium'
      } : null
    },
    generatedAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findLatestInsightV1ByConversationId(conversationId: string) {
  const { rows } = await db.query(
    `select id, conversation_id, customer_id, patient_id, customer_ref, patient_ref, analysis_version,
            summary, stage, needs_json, concerns_json, objections_json,
            risks_json, next_actions_json, confidence, evidence_message_ids_json,
            source_message_count, source_window_start_at, source_window_end_at,
            created_at, updated_at
       from wecom_conversation_insights_v1
      where conversation_id = $1
      order by created_at desc
      limit 1`,
    [conversationId]
  );

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return mapInsightV1Row(row);
}

export async function listInsightsV1(filters: { conversationId?: string; customerRef?: string; limit?: number }) {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (filters.customerRef) {
    values.push(filters.customerRef);
    conditions.push(`customer_ref = $${values.length}`);
  }
  if (filters.conversationId) {
    values.push(filters.conversationId);
    conditions.push(`conversation_id = $${values.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  values.push(filters.limit || 20);

  const { rows } = await db.query(
    `select id, conversation_id, customer_id, patient_id, customer_ref, patient_ref, analysis_version,
            summary, stage, needs_json, concerns_json, objections_json,
            risks_json, next_actions_json, confidence, evidence_message_ids_json,
            source_message_count, source_window_start_at, source_window_end_at,
            created_at, updated_at
       from wecom_conversation_insights_v1
       ${where}
      order by created_at desc
      limit $${values.length}`,
    values
  );

  return rows.map((row) => mapInsightV1Row(row as Record<string, unknown>));
}

export async function findInsightV1ById(insightId: string) {
  const { rows } = await db.query(
    `select id, conversation_id, customer_id, patient_id, customer_ref, patient_ref, analysis_version,
            summary, stage, needs_json, concerns_json, objections_json,
            risks_json, next_actions_json, confidence, evidence_message_ids_json,
            source_message_count, source_window_start_at, source_window_end_at,
            created_at, updated_at
       from wecom_conversation_insights_v1
      where id = $1
      limit 1`,
    [insightId]
  );

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapInsightV1Row(row);
}
