import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { findInsightV1ById, findLatestInsightV1ByConversationId, listInsightsV1, saveInsightV1 } from './insight-v1-repository.service.js';

type InsightListItem = {
  title: string;
  description: string;
  [key: string]: unknown;
};

type MessageRow = {
  message_id: string;
  sender_role: string;
  content_text: string;
  sent_at: string;
};

async function resolveCustomerIdForConversation(conversationId: string, fallbackCustomerId?: string) {
  if (fallbackCustomerId) return fallbackCustomerId;

  const { rows } = await db.query(
    `select primary_customer_id
       from wecom_conversations
      where conversation_id = $1
      limit 1`,
    [conversationId]
  );

  return (rows[0]?.primary_customer_id as string | null | undefined) || null;
}

function isUuidLike(value: string | null | undefined) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function pickCustomerMessages(messages: MessageRow[]) {
  return messages.filter((item) => item.sender_role === 'customer' && item.content_text);
}

function buildSummary(messages: MessageRow[]) {
  const customerMessages = pickCustomerMessages(messages).map((item) => item.content_text).filter(Boolean);
  const summaryText = customerMessages.length
    ? `客户最近主要表达：${customerMessages.slice(0, 2).join('；')}`
    : '当前消息中暂无足够客户表达内容';

  return {
    summaryText,
    summaryShort: customerMessages[0] || '暂无摘要',
    interactionStage: customerMessages.length ? 'consulting' : 'unknown',
    overallSignal: customerMessages.length ? 'mixed' : 'unclear'
  };
}

function buildNeedPoints(messages: MessageRow[]) {
  const customerMessages = pickCustomerMessages(messages);
  if (!customerMessages.length) return [];

  return [customerMessages[0].content_text];
}

function buildEvidenceMessageIds(messages: MessageRow[]) {
  return pickCustomerMessages(messages).slice(0, 3).map((item) => item.message_id);
}

export async function analyzeConversationMessages(
  conversationId: string,
  payload: {
    customerId?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }
) {
  const resolvedCustomerId = await resolveCustomerIdForConversation(conversationId, payload.customerId);
  const resolvedCustomerUuid = isUuidLike(resolvedCustomerId) ? resolvedCustomerId : null;

  const values: unknown[] = [conversationId];
  const conditions = ['conversation_id = $1'];

  if (payload.startTime) {
    values.push(payload.startTime);
    conditions.push(`sent_at >= $${values.length}`);
  }
  if (payload.endTime) {
    values.push(payload.endTime);
    conditions.push(`sent_at <= $${values.length}`);
  }

  values.push(payload.limit || 50);

  const { rows } = await db.query(
    `select message_id, sender_role, content_text, sent_at
       from wecom_messages
      where ${conditions.join(' and ')}
      order by sent_at asc
      limit $${values.length}`,
    values
  );

  const messageRows = rows as MessageRow[];
  const summary = buildSummary(messageRows);
   const sourceWindowStartAt = messageRows[0]?.sent_at || null;
  const sourceWindowEndAt = messageRows[messageRows.length - 1]?.sent_at || null;
  const needPoints = buildNeedPoints(messageRows);
  const concernPoints: string[] = [];
  const objectionPoints: string[] = [];
  const riskSignals: string[] = [];
  const evidenceMessageIds = buildEvidenceMessageIds(messageRows);
  const intentAssessment = {
    intentLevel: rows.length ? 'medium' : 'unclear',
    intentReasoning: rows.length ? '已基于最近消息生成初步判断' : '消息不足',
    stageJudgement: summary.interactionStage,
    isReadyForNextStep: rows.length > 0
  };
  const nextActionSuggestions = rows.length
    ? [
        {
          actionType: 'manual_followup',
          actionText: '基于客户最新表达继续跟进并确认具体需求。',
          priority: 'medium',
          reason: '已有客户聊天记录可供继续推进',
          relatedNeedOrRisk: needPoints[0] || '客户最新表达诉求'
        }
      ]
    : [];
  const planUpdateSuggestions = rows.length
    ? [
        {
          suggestionType: 'need_update',
          suggestionText: '根据最近客户对话补充客户需求摘要。',
          reason: '最近会话已出现新的客户表达',
          evidenceRefs: evidenceMessageIds,
          priority: 'medium'
        }
      ]
    : [];
  const d4Summary = {
    proposalSuggestion: planUpdateSuggestions[0] || null,
    actionSuggestion: nextActionSuggestions[0] || null
  };

  const insightId = `insight_${randomUUID()}`;

  await saveInsightV1({
    conversationId,
    customerId: resolvedCustomerUuid,
    patientId: null,
    customerRef: resolvedCustomerId,
    patientRef: resolvedCustomerId,
    analysisVersion: 'v1',
    summary: summary.summaryText,
    stage: summary.interactionStage,
    needs: needPoints,
    concerns: concernPoints,
    objections: objectionPoints,
    risks: riskSignals,
    nextActions: nextActionSuggestions.map((item) => item.actionText),
    confidence: rows.length ? 'medium' : 'low',
    evidenceMessageIds,
    sourceMessageCount: rows.length,
    sourceWindowStartAt,
    sourceWindowEndAt
  });

  return {
    insightId,
    conversationId,
    customerId: resolvedCustomerId,
    patientId: null,
    analysisVersion: 'v1',
    messageCount: rows.length,
    summary,
    summaryText: summary.summaryText,
    stage: summary.interactionStage,
    needs: needPoints,
    concerns: concernPoints,
    objections: objectionPoints,
    risks: riskSignals,
    nextActions: nextActionSuggestions.map((item) => item.actionText),
    confidence: rows.length ? 'medium' : 'low',
    evidenceMessageIds,
    d4Summary,
    needPoints,
    concernPoints,
    objectionPoints,
    riskSignals,
    intentAssessment,
    nextActionSuggestions,
    planUpdateSuggestions
  };
}

export async function getLatestConversationInsight(conversationId: string) {
  return findLatestInsightV1ByConversationId(conversationId);
}

export async function listWecomInsights(query: Record<string, unknown>) {
  return listInsightsV1({
    conversationId: typeof query.conversationId === 'string' ? query.conversationId : undefined,
    customerRef: typeof query.customerId === 'string' ? query.customerId : undefined,
    limit: typeof query.limit === 'string' ? Number(query.limit) : 20
  });
}

export async function getWecomInsightDetail(insightId: string) {
  return findInsightV1ById(insightId);
}
