import { AppError } from '../../../shared/errors/app-error.js';
import { lookupCustomerMapping } from '../service/patient-mapping.service.js';

export async function getCustomerPatientMapping(customerId: string, conversationId?: string) {
  if (!customerId && !conversationId) {
    throw new AppError(400, 'INVALID_CUSTOMER_ID', '缺少 customerId 或 conversationId');
  }

  return lookupCustomerMapping(customerId, conversationId);
}
