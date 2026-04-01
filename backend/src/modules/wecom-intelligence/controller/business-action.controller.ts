import { AppError } from '../../../shared/errors/app-error.js';
import { generateBusinessActions } from '../service/business-action.service.js';

export async function createBusinessActionsFromConversation(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) {
    throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  }

  if (typeof payload.customerId !== 'string') {
    throw new AppError(400, 'INVALID_WECOM_BUSINESS_ACTION_INPUT', '缺少 customerId');
  }

  const patientId = typeof payload.patientId === 'string' ? payload.patientId : undefined;
  return generateBusinessActions(conversationId, payload.customerId, patientId);
}
