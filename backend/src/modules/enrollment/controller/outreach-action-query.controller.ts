import { listConversationActionHistoryService, listConversationPendingOutreachActionsService } from '../service/outreach-action-query.service.js';

export async function listConversationPendingOutreachActions(conversationId: string) {
  return listConversationPendingOutreachActionsService(conversationId);
}

export async function listConversationActionHistory(conversationId: string) {
  return listConversationActionHistoryService(conversationId);
}
