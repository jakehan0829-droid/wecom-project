import { AppError } from '../../../shared/errors/app-error.js';
import {
  getWecomConversationOpsViewService,
  listWecomAutomationAuditService,
  listWecomEventStateService
} from '../service/automation-query.service.js';

export async function listWecomEventState(query: Record<string, unknown>) {
  return listWecomEventStateService(query);
}

export async function listWecomAutomationAudit(query: Record<string, unknown>) {
  return listWecomAutomationAuditService(query);
}

export async function getWecomConversationOpsView(conversationId: string) {
  if (!conversationId) {
    throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  }
  return getWecomConversationOpsViewService(conversationId);
}
