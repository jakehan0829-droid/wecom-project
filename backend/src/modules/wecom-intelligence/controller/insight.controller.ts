import { AppError } from '../../../shared/errors/app-error.js';
import { analyzeConversationMessages, getWecomInsightDetail, listWecomInsights } from '../service/insight.service.js';

export async function createWecomConversationInsight(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) {
    throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  }

  return analyzeConversationMessages(conversationId, payload as never);
}

export async function listConversationInsights(query: Record<string, unknown>) {
  return listWecomInsights(query);
}

export async function getConversationInsightDetail(insightId: string) {
  if (!insightId) {
    throw new AppError(400, 'INVALID_WECOM_INSIGHT_ID', '缺少 insightId');
  }

  return getWecomInsightDetail(insightId);
}
