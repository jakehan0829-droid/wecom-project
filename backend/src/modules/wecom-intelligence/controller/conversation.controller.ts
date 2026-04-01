import { getConversationDetail } from '../service/conversation.service.js';
import { getLatestConversationInsight } from '../service/insight.service.js';
import { listWecomMessages } from '../service/message-query.service.js';

export async function getWecomConversationDetail(conversationId: string) {
  return getConversationDetail(conversationId);
}

export async function listWecomConversationMessages(conversationId: string, query: Record<string, unknown>) {
  return listWecomMessages({
    conversationId,
    startTime: typeof query.startTime === 'string' ? query.startTime : undefined,
    endTime: typeof query.endTime === 'string' ? query.endTime : undefined,
    limit: typeof query.limit === 'string' ? Number(query.limit) : undefined
  });
}

export async function getWecomConversationLatestInsight(conversationId: string) {
  return getLatestConversationInsight(conversationId);
}
