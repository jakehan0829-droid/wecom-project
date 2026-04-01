import { AppError } from '../../../shared/errors/app-error.js';
import { requireEnum, requireString } from '../../../shared/utils/validators.js';
import {
  confirmConversationPatientMappingService,
  listConflictWecomCustomersManagementService,
  listUnmappedWecomCustomersManagementService,
  promoteConversationMappingToBindingService,
  reassignConversationPatientMappingService,
  unconfirmConversationPatientMappingService
} from '../service/mapping-management.service.js';
import { listWecomMappingAuditService } from '../service/mapping-audit.service.js';
import { getWecomMappingAuditSummaryService } from '../service/mapping-audit-summary.service.js';
import { getWecomMappingGovernanceDashboardService } from '../service/mapping-governance-dashboard.service.js';

export async function listUnmappedWecomCustomers(query: Record<string, unknown>) {
  return listUnmappedWecomCustomersManagementService(query);
}

export async function listConflictWecomCustomers(query: Record<string, unknown>) {
  return listConflictWecomCustomersManagementService(query);
}

export async function listWecomMappingAudit(query: Record<string, unknown>) {
  return listWecomMappingAuditService(query);
}

export async function getWecomMappingAuditSummary(query: Record<string, unknown>) {
  return getWecomMappingAuditSummaryService(query);
}

export async function getWecomMappingGovernanceDashboard(query: Record<string, unknown>) {
  return getWecomMappingGovernanceDashboardService(query);
}

export async function confirmConversationPatientMapping(payload: Record<string, unknown>) {
  const conversationId = requireString(payload.conversationId, 'conversationId');
  const patientId = requireString(payload.patientId, 'patientId');
  const operatorNote = typeof payload.operatorNote === 'string' ? payload.operatorNote : undefined;

  return confirmConversationPatientMappingService({ conversationId, patientId, operatorNote });
}

export async function confirmConversationPatientMappingByPath(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  const patientId = requireString(payload.patientId, 'patientId');
  const operatorNote = typeof payload.operatorNote === 'string' ? payload.operatorNote : undefined;
  const operatorName = typeof payload.operatorName === 'string' ? payload.operatorName : undefined;
  return confirmConversationPatientMappingService({ conversationId, patientId, operatorNote, operatorName });
}

export async function unconfirmConversationPatientMappingByPath(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  const operatorNote = typeof payload.operatorNote === 'string' ? payload.operatorNote : undefined;
  const operatorName = typeof payload.operatorName === 'string' ? payload.operatorName : undefined;
  return unconfirmConversationPatientMappingService({ conversationId, operatorNote, operatorName });
}

export async function reassignConversationPatientMappingByPath(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  const toPatientId = requireString(payload.toPatientId, 'toPatientId');
  const fromPatientId = typeof payload.fromPatientId === 'string' ? payload.fromPatientId : undefined;
  const operatorNote = typeof payload.operatorNote === 'string' ? payload.operatorNote : undefined;
  const operatorName = typeof payload.operatorName === 'string' ? payload.operatorName : undefined;
  return reassignConversationPatientMappingService({ conversationId, fromPatientId, toPatientId, operatorNote, operatorName });
}

export async function promoteConversationMappingToBindingByPath(conversationId: string, payload: Record<string, unknown>) {
  if (!conversationId) throw new AppError(400, 'INVALID_WECOM_CONVERSATION_ID', '缺少 conversationId');
  const patientId = requireString(payload.patientId, 'patientId');
  const bindingType = requireEnum(payload.bindingType, 'bindingType', ['wecom_user', 'external_user']) as 'wecom_user' | 'external_user';
  const operatorNote = typeof payload.operatorNote === 'string' ? payload.operatorNote : undefined;
  const operatorName = typeof payload.operatorName === 'string' ? payload.operatorName : undefined;
  return promoteConversationMappingToBindingService({ conversationId, patientId, bindingType, operatorNote, operatorName });
}
