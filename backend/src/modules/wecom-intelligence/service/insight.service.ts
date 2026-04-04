import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { findInsightV1ById, findLatestInsightV1ByConversationId, listInsightsV1, saveInsightV1 } from './insight-v1-repository.service.js';
import type { InsightEvaluation } from './wecom-automation.types.js';

type InsightListItem = {
  title: string;
  description: string;
  [key: string]: unknown;
};

type MessageRow = {
  message_id: string;
  sender_role: string;
  content_type: string;
  chat_type: string;
  content_text: string;
  sent_at: string;
  metadata_json?: Record<string, unknown>;
};

const DEFAULT_PRIVATE_MERGE_WINDOW_MS = Number(process.env.WECOM_PRIVATE_MERGE_WINDOW_MS || 20_000);
const DEFAULT_RECENT_MESSAGE_LIMIT = Number(process.env.WECOM_INSIGHT_RECENT_MESSAGE_LIMIT || 80);
const INSIGHT_RISK_KEYWORDS = [
  '胸痛',
  '呼吸困难',
  '喘不上气',
  '晕厥',
  '昏迷',
  '抽搐',
  '意识模糊',
  '剧烈疼痛',
  '低血糖',
  '血糖太低',
  '血糖太高',
  '酮症',
  '呕吐',
  '黑便',
  '便血',
  '120'
];
const INSIGHT_CONCERN_KEYWORDS = ['担心', '害怕', '顾虑', '不确定', '怎么办', '要不要'];

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

function normalizeMessageCategory(message: MessageRow) {
  const metadata = message.metadata_json;
  if (metadata && typeof metadata === 'object' && typeof metadata.messageCategory === 'string') {
    return metadata.messageCategory;
  }
  return null;
}

function isEffectiveCustomerExpression(message: MessageRow) {
  const messageCategory = normalizeMessageCategory(message);
  if (messageCategory) return messageCategory === 'customer_text';

  return (
    message.sender_role === 'customer'
    && message.content_type === 'text'
    && Boolean(message.content_text?.trim())
  );
}

function pickEffectiveCustomerMessages(messages: MessageRow[]) {
  return messages.filter((item) => isEffectiveCustomerExpression(item));
}

function buildInsightEvaluation(messages: MessageRow[]): InsightEvaluation {
  const effectiveCustomerMessages = pickEffectiveCustomerMessages(messages);
  if (!effectiveCustomerMessages.length) {
    return {
      customerExpressionStatus: 'absent',
      latestCustomerExpression: null,
      latestCustomerMessageId: null,
      evidenceMessageIds: [],
      sourceMessageCount: 0
    };
  }

  const latestMessage = effectiveCustomerMessages[effectiveCustomerMessages.length - 1];
  const latestTimestamp = Date.parse(latestMessage.sent_at) || 0;
  const mergeWindowMessages = latestMessage.chat_type === 'private'
    ? effectiveCustomerMessages.filter((item) => {
        const timestamp = Date.parse(item.sent_at) || 0;
        return latestTimestamp - timestamp <= DEFAULT_PRIVATE_MERGE_WINDOW_MS;
      })
    : effectiveCustomerMessages.slice(-3);
  const windowMessages = mergeWindowMessages.length ? mergeWindowMessages : [latestMessage];

  return {
    customerExpressionStatus: 'present',
    latestCustomerExpression: windowMessages.map((item) => item.content_text.trim()).join('；'),
    latestCustomerMessageId: latestMessage.message_id,
    evidenceMessageIds: windowMessages.map((item) => item.message_id),
    sourceMessageCount: windowMessages.length
  };
}

function buildSummary(evaluation: InsightEvaluation) {
  const summaryText = evaluation.customerExpressionStatus === 'present' && evaluation.latestCustomerExpression
    ? `客户最新表达：${evaluation.latestCustomerExpression}`
    : '当前消息中暂无足够客户表达内容';

  return {
    summaryText,
    summaryShort: evaluation.latestCustomerExpression || '暂无摘要',
    interactionStage: evaluation.customerExpressionStatus === 'present' ? 'consulting' : 'unknown',
    overallSignal: evaluation.customerExpressionStatus === 'present' ? 'fresh_customer_expression' : 'unclear'
  };
}

function buildNeedPoints(evaluation: InsightEvaluation) {
  if (evaluation.customerExpressionStatus !== 'present' || !evaluation.latestCustomerExpression) return [];

  return evaluation.latestCustomerExpression
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildConcernPoints(evaluation: InsightEvaluation) {
  if (evaluation.customerExpressionStatus !== 'present' || !evaluation.latestCustomerExpression) return [] as string[];
  return INSIGHT_CONCERN_KEYWORDS.filter((keyword) => evaluation.latestCustomerExpression?.includes(keyword));
}

function buildRiskSignals(evaluation: InsightEvaluation) {
  if (evaluation.customerExpressionStatus !== 'present' || !evaluation.latestCustomerExpression) return [] as string[];
  return INSIGHT_RISK_KEYWORDS.filter((keyword) => evaluation.latestCustomerExpression?.includes(keyword));
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

  values.push(Math.max(payload.limit || DEFAULT_RECENT_MESSAGE_LIMIT, DEFAULT_RECENT_MESSAGE_LIMIT / 2));

  const { rows } = await db.query(
    `select message_id, sender_role, content_type, chat_type, content_text, sent_at, metadata_json
       from wecom_messages
      where ${conditions.join(' and ')}
      order by sent_at desc
      limit $${values.length}`,
    values
  );

  const messageRows = (rows as MessageRow[]).reverse();
  const evaluation = buildInsightEvaluation(messageRows);
  const summary = buildSummary(evaluation);
  const sourceWindowMessages = pickEffectiveCustomerMessages(messageRows)
    .filter((item) => evaluation.evidenceMessageIds.includes(item.message_id));
  const sourceWindowStartAt = sourceWindowMessages[0]?.sent_at || null;
  const sourceWindowEndAt = sourceWindowMessages[sourceWindowMessages.length - 1]?.sent_at || null;
  const needPoints = buildNeedPoints(evaluation);
  const concernPoints = buildConcernPoints(evaluation);
  const objectionPoints: string[] = [];
  const riskSignals = buildRiskSignals(evaluation);
  const evidenceMessageIds = evaluation.evidenceMessageIds;
  const intentAssessment = {
    intentLevel: evaluation.customerExpressionStatus === 'present' ? 'medium' : 'unclear',
    intentReasoning: evaluation.customerExpressionStatus === 'present' ? '已基于最近客户表达生成初步判断' : '消息不足',
    stageJudgement: summary.interactionStage,
    isReadyForNextStep: evaluation.customerExpressionStatus === 'present'
  };
  const nextActionSuggestions = evaluation.customerExpressionStatus === 'present'
    ? [
        {
          actionType: 'manual_followup',
          actionText: '基于客户最新表达继续跟进，并确认当前最需要优先处理的问题。',
          priority: 'medium',
          reason: '已识别到最新客户表达，可进入统一跟进',
          relatedNeedOrRisk: needPoints[0] || '客户最新表达诉求'
        }
      ]
    : [];
  const planUpdateSuggestions = evaluation.customerExpressionStatus === 'present'
    ? [
        {
          suggestionType: 'need_update',
          suggestionText: '根据最新客户表达补充患者当前需求和后续跟进重点。',
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

  const persisted = await saveInsightV1({
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
    confidence: evaluation.customerExpressionStatus === 'present' ? 'medium' : 'low',
    evidenceMessageIds,
    sourceMessageCount: evaluation.sourceMessageCount,
    sourceWindowStartAt,
    sourceWindowEndAt
  });
  const persistedInsightId = persisted && typeof persisted === 'object' && 'id' in persisted
    ? String((persisted as { id: unknown }).id)
    : insightId;

  return {
    insightId: persistedInsightId,
    conversationId,
    customerId: resolvedCustomerId,
    patientId: null,
    analysisVersion: 'v1',
    messageCount: messageRows.length,
    summary,
    summaryText: summary.summaryText,
    stage: summary.interactionStage,
    needs: needPoints,
    concerns: concernPoints,
    objections: objectionPoints,
    risks: riskSignals,
    nextActions: nextActionSuggestions.map((item) => item.actionText),
    confidence: evaluation.customerExpressionStatus === 'present' ? 'medium' : 'low',
    evidenceMessageIds,
    customerExpressionStatus: evaluation.customerExpressionStatus,
    latestCustomerExpression: evaluation.latestCustomerExpression,
    latestCustomerMessageId: evaluation.latestCustomerMessageId,
    sourceMessageCount: evaluation.sourceMessageCount,
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
