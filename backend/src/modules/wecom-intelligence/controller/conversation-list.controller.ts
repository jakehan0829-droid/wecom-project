import { listWecomConversationsService } from '../service/conversation-list.service.js';

export async function listWecomConversations(query: Record<string, unknown>) {
  return listWecomConversationsService(query);
}
