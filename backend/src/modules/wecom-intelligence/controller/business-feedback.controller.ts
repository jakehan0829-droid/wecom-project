import { AppError } from '../../../shared/errors/app-error.js';
import { generateBusinessFeedback, getCustomerBusinessFeedback } from '../service/business-feedback.service.js';

export async function generateConversationBusinessFeedback(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) {
    throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  }

  const customerId = typeof payload.customerId === 'string' ? payload.customerId : undefined;
  return generateBusinessFeedback(conversationId, customerId);
}

export async function getCustomerFeedback(customerId: string) {
  if (!customerId) {
    throw new AppError(400, 'INVALID_CUSTOMER_ID', '缺少 customerId');
  }

  return getCustomerBusinessFeedback(customerId);
}
