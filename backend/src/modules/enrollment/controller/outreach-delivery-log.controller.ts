import { getOutreachDeliveryLogDetailService, listOutreachDeliveryLogsService } from '../service/outreach-delivery-log.service.js';

export async function listOutreachDeliveryLogs(query: Record<string, unknown>) {
  const actionId = typeof query.actionId === 'string' ? query.actionId : undefined;
  return listOutreachDeliveryLogsService(actionId);
}

export async function getOutreachDeliveryLogDetail(id: string) {
  return getOutreachDeliveryLogDetailService(id);
}
