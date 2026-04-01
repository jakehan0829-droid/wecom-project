import { findLatestInsightV1ByConversationId, listInsightsV1 } from './insight-v1-repository.service.js';

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

export async function generateBusinessFeedback(conversationId: string, customerId?: string) {
  const latestInsight = await findLatestInsightV1ByConversationId(conversationId);
  if (!latestInsight) {
    return {
      conversationId,
      customerId: customerId || null,
      status: 'no_insight',
      customerNeedSummary: null,
      riskSignals: [],
      followupSuggestions: [],
      planUpdateSuggestions: []
    };
  }

  const needPoints = (latestInsight.needs || []).map((item) => ({ title: 'need', description: String(item) }));
  const concernPoints = (latestInsight.concerns || []).map((item) => ({ title: 'concern', description: String(item) }));
  const objectionPoints = (latestInsight.objections || []).map((item) => ({ title: 'objection', description: String(item) }));
  const riskSignals = (latestInsight.risks || []).map((item) => ({ title: 'risk', description: String(item) }));
  const followupSuggestions: FeedbackItem[] = latestInsight.d4Summary?.actionSuggestion ? [latestInsight.d4Summary.actionSuggestion as FeedbackItem] : [];
  const planUpdateSuggestions: FeedbackItem[] = latestInsight.d4Summary?.proposalSuggestion ? [latestInsight.d4Summary.proposalSuggestion as FeedbackItem] : [];

  return {
    conversationId: latestInsight.conversationId,
    customerId: latestInsight.customerRef || latestInsight.customerId || customerId || null,
    status: 'ready',
    customerNeedSummary: {
      summaryText: latestInsight.summaryText,
      keyNeedCount: needPoints.length,
      concernCount: concernPoints.length,
      objectionCount: objectionPoints.length,
      intentLevel: latestInsight.confidence || 'unknown',
      stageJudgement: latestInsight.stage || 'unknown'
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
