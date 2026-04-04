import { findLatestInsightV1ByConversationId, listInsightsV1 } from './insight-v1-repository.service.js';
import type { BusinessFeedbackResult, BusinessFeedbackStatus, CustomerExpressionStatus } from './wecom-automation.types.js';

type FeedbackItem = {
  title?: string;
  description?: string;
  suggestionType?: string;
  suggestionText?: string;
  actionType?: string;
  actionText?: string;
  priority?: string;
  [key: string]: unknown;
};

export async function generateBusinessFeedback(conversationId: string, customerId?: string): Promise<BusinessFeedbackResult> {
  const latestInsight = await findLatestInsightV1ByConversationId(conversationId);
  if (!latestInsight) {
    return {
      conversationId,
      customerId: customerId || null,
      status: 'no_insight' as BusinessFeedbackStatus,
      customerExpressionStatus: 'absent' as CustomerExpressionStatus,
      customerNeedSummary: null,
      needPoints: [],
      concernPoints: [],
      objectionPoints: [],
      riskSignals: [],
      followupSuggestions: [],
      planUpdateSuggestions: []
    };
  }

  const customerExpressionStatus = Number(latestInsight.sourceMessageCount || 0) > 0 ? 'present' as const : 'absent' as const;
  const status: BusinessFeedbackStatus = customerExpressionStatus === 'present' ? 'ready' : 'observe';

  const needPoints = (latestInsight.needs || []).map((item) => ({ title: 'need', description: String(item) }));
  const concernPoints = (latestInsight.concerns || []).map((item) => ({ title: 'concern', description: String(item) }));
  const objectionPoints = (latestInsight.objections || []).map((item) => ({ title: 'objection', description: String(item) }));
  const riskSignals = (latestInsight.risks || []).map((item) => ({ title: 'risk', description: String(item) }));
  const followupSuggestions: FeedbackItem[] = status === 'ready' && latestInsight.d4Summary?.actionSuggestion
    ? [latestInsight.d4Summary.actionSuggestion as FeedbackItem]
    : [];
  const planUpdateSuggestions: FeedbackItem[] = status === 'ready' && latestInsight.d4Summary?.proposalSuggestion
    ? [latestInsight.d4Summary.proposalSuggestion as FeedbackItem]
    : [];

  return {
    conversationId: String(latestInsight.conversationId),
    customerId: latestInsight.customerRef ? String(latestInsight.customerRef) : latestInsight.customerId ? String(latestInsight.customerId) : customerId || null,
    status,
    customerExpressionStatus,
    latestCustomerExpression: latestInsight.summaryText ? String(latestInsight.summaryText) : null,
    customerNeedSummary: {
      summaryText: String(latestInsight.summaryText || ''),
      keyNeedCount: needPoints.length,
      concernCount: concernPoints.length,
      objectionCount: objectionPoints.length,
      intentLevel: String(latestInsight.confidence || 'unknown'),
      stageJudgement: String(latestInsight.stage || 'unknown'),
      customerExpressionStatus,
      sourceMessageCount: latestInsight.sourceMessageCount || 0
    },
    needPoints,
    concernPoints,
    objectionPoints,
    riskSignals,
    followupSuggestions,
    planUpdateSuggestions
  };
}

export async function getCustomerBusinessFeedback(customerId: string) {
  const items = await listInsightsV1({ customerRef: customerId, limit: 20 });

  return items.map((item) => ({
    insightId: item.insightId,
    conversationId: item.conversationId,
    customerId: item.customerRef || item.customerId || null,
    summaryText: item.summaryText,
    needPoints: (item.needs || []).map((v) => ({ title: 'need', description: String(v) })),
    concernPoints: (item.concerns || []).map((v) => ({ title: 'concern', description: String(v) })),
    objectionPoints: (item.objections || []).map((v) => ({ title: 'objection', description: String(v) })),
    riskSignals: (item.risks || []).map((v) => ({ title: 'risk', description: String(v) })),
    intentAssessment: {
      intentLevel: item.confidence || 'unknown',
      stageJudgement: item.stage || 'unknown'
    },
    followupSuggestions: item.d4Summary?.actionSuggestion ? [item.d4Summary.actionSuggestion] : [],
    planUpdateSuggestions: item.d4Summary?.proposalSuggestion ? [item.d4Summary.proposalSuggestion] : [],
    generatedAt: item.generatedAt
  }));
}
