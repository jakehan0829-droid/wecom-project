import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { login } from './modules/auth/controller/auth.controller.js';
import { listPatients, createPatient, getPatientDetail, updatePatientProfile } from './modules/patient/controller/patient.controller.js';
import { createPatientTag, bindPatientTag } from './modules/patient/controller/patient-tag.controller.js';
import { bindWecom, getWecomBinding } from './modules/enrollment/controller/wecom-binding.controller.js';
import { createPatientOutreachAction, getPatientOutreachAction, listPatientOutreachAction, updatePatientOutreachActionStatus } from './modules/enrollment/controller/outreach-action.controller.js';
import { listConversationActionHistory, listConversationPendingOutreachActions } from './modules/enrollment/controller/outreach-action-query.controller.js';
import { getOutreachDeliveryLogDetail, listOutreachDeliveryLogs } from './modules/enrollment/controller/outreach-delivery-log.controller.js';
import { previewWecomOutreachAction, sendWecomOutreachAction } from './modules/enrollment/controller/wecom-outreach.controller.js';
import { ensureWorkbenchV1TrialSample } from './modules/wecom-intelligence/service/workbench-trial-bootstrap.service.js';
import { createWecomMessageIntake, createRealWecomMessageIntake } from './modules/wecom-intelligence/controller/message-intake.controller.js';
import { verifyWecomWebhook, receiveWecomWebhook } from './modules/wecom-intelligence/controller/wecom-webhook.controller.js';
import { getCustomerPatientMapping } from './modules/wecom-intelligence/controller/patient-mapping.controller.js';
import { submitOutreachActionFeedback, submitDoctorReviewTaskFeedback } from './modules/wecom-intelligence/controller/action-feedback.controller.js';
import { getWecomConversationDetail, getWecomConversationLatestInsight, listWecomConversationMessages } from './modules/wecom-intelligence/controller/conversation.controller.js';
import { listWecomConversations } from './modules/wecom-intelligence/controller/conversation-list.controller.js';
import {
  confirmConversationPatientMapping,
  confirmConversationPatientMappingByPath,
  listConflictWecomCustomers,
  listUnmappedWecomCustomers,
  getWecomMappingAuditSummary,
  getWecomMappingGovernanceDashboard,
  listWecomMappingAudit,
  promoteConversationMappingToBindingByPath,
  reassignConversationPatientMappingByPath,
  unconfirmConversationPatientMappingByPath
} from './modules/wecom-intelligence/controller/mapping-management.controller.js';
import { createWecomConversationInsight, getConversationInsightDetail, listConversationInsights } from './modules/wecom-intelligence/controller/insight.controller.js';
import { generateConversationBusinessFeedback, getCustomerFeedback } from './modules/wecom-intelligence/controller/business-feedback.controller.js';
import { createBusinessActionsFromConversation } from './modules/wecom-intelligence/controller/business-action.controller.js';
import { getWecomConversationOpsView, listWecomAutomationAudit, listWecomEventState } from './modules/wecom-intelligence/controller/automation-query.controller.js';
import {
  processMessageWithBusinessRouting,
  processConversationWithBusinessRouting,
  processMessageWithSpecificHandler,
  getMessageBusinessProcessingResult
} from './modules/wecom-intelligence/controller/business-routing.controller.js';
import { getWecomOpsSummary } from './modules/wecom-intelligence/controller/ops-dashboard.controller.js';
import { createGlucoseRecord, createBloodPressureRecord, createWeightRecord, getPatientHealthRecords } from './modules/health-record/controller/health-record.controller.js';
import { createDoctorReviewTask, listDoctorReviewTask, updateDoctorReviewTaskStatus } from './modules/dashboard/controller/doctor-review.controller.js';
import { getDashboardOverview } from './modules/dashboard/controller/dashboard.controller.js';
import { getWecomDashboardMetrics } from './modules/dashboard/controller/dashboard-metrics.controller.js';
import {
  getMemberArchive,
  upsertMemberArchive,
  searchMemberArchives,
  getConversationMemberArchives,
  getPatientArchiveChangeLog,
  batchUpdateMemberArchives,
  analyzeArchiveForImprovementsController
} from './modules/archive/controller/archive.controller.js';
import { authGuard } from './shared/middleware/auth.guard.js';
import { ok, created } from './shared/utils/http.js';

export const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

// 健康检查端点
import { healthCheck, livenessProbe, readinessProbe, metrics } from './infra/monitoring/health-check.controller.js';

router.get('/health', asyncHandler(healthCheck));
router.get('/health/liveness', asyncHandler(livenessProbe));
router.get('/health/readiness', asyncHandler(readinessProbe));
router.get('/health/metrics', asyncHandler(metrics));
router.get('/health/simple', asyncHandler(async (_req, res) => ok(res, { status: 'ok', timestamp: new Date().toISOString() })));
router.post('/api/v1/auth/login', asyncHandler(async (req, res) => ok(res, await login(req.body))));
router.post('/api/v1/workbench/trial-bootstrap', asyncHandler(async (_req, res) => ok(res, await ensureWorkbenchV1TrialSample())));
router.get('/api/v1/wecom/webhook', asyncHandler(async (req, res) => {
  const result = await verifyWecomWebhook(req.query as Record<string, unknown>);
  res.status(200).type('text/plain').send(result.plainText);
}));
router.post('/api/v1/wecom/webhook', asyncHandler(async (req, res) => {
  const result = await receiveWecomWebhook(req.body, req.query as Record<string, unknown>);
  res.status(200).type('text/plain').send(result.plainText);
}));
router.get('/api/wecom/callback', asyncHandler(async (req, res) => {
  const result = await verifyWecomWebhook(req.query as Record<string, unknown>);
  res.status(200).type('text/plain').send(result.plainText);
}));
router.post('/api/wecom/callback', asyncHandler(async (req, res) => {
  const result = await receiveWecomWebhook(req.body, req.query as Record<string, unknown>);
  res.status(200).type('text/plain').send(result.plainText);
}));

router.use('/api/v1', authGuard);

router.get('/api/v1/patients', asyncHandler(async (_req, res) => ok(res, await listPatients())));
router.post('/api/v1/patients', asyncHandler(async (req, res) => created(res, await createPatient(req.body))));
router.get('/api/v1/patients/:id', asyncHandler(async (req, res) => ok(res, await getPatientDetail(getParam(req, 'id')))));
router.patch('/api/v1/patients/:id/profile', asyncHandler(async (req, res) => ok(res, await updatePatientProfile(getParam(req, 'id'), req.body))));
router.post('/api/v1/patients/:id/tags', asyncHandler(async (req, res) => created(res, await bindPatientTag(getParam(req, 'id'), req.body))));
router.post('/api/v1/tags', asyncHandler(async (req, res) => created(res, await createPatientTag(req.body))));

router.post('/api/v1/patients/:id/wecom-binding', asyncHandler(async (req, res) => created(res, await bindWecom(getParam(req, 'id'), req.body))));
router.get('/api/v1/patients/:id/wecom-binding', asyncHandler(async (req, res) => ok(res, await getWecomBinding(getParam(req, 'id')))));
router.get('/api/v1/patient-outreach-actions', asyncHandler(async (_req, res) => ok(res, await listPatientOutreachAction())));
router.get('/api/v1/wecom/conversations/:conversationId/pending-actions', asyncHandler(async (req, res) => ok(res, await listConversationPendingOutreachActions(getParam(req, 'conversationId')))));
router.get('/api/v1/wecom/conversations/:conversationId/action-history', asyncHandler(async (req, res) => ok(res, await listConversationActionHistory(getParam(req, 'conversationId')))));
router.post('/api/v1/patient-outreach-actions', asyncHandler(async (req, res) => created(res, await createPatientOutreachAction(req.body))));
router.get('/api/v1/patient-outreach-actions/:id', asyncHandler(async (req, res) => ok(res, await getPatientOutreachAction(getParam(req, 'id')))));
router.patch('/api/v1/patient-outreach-actions/:id/status', asyncHandler(async (req, res) => ok(res, await updatePatientOutreachActionStatus(getParam(req, 'id'), req.body))));
router.post('/api/v1/patient-outreach-actions/:id/feedback', asyncHandler(async (req, res) => ok(res, await submitOutreachActionFeedback(getParam(req, 'id'), req.body))));
router.get('/api/v1/patient-outreach-actions/:id/send-preview', asyncHandler(async (req, res) => ok(res, await previewWecomOutreachAction(getParam(req, 'id')))));
router.post('/api/v1/patient-outreach-actions/:id/send', asyncHandler(async (req, res) => ok(res, await sendWecomOutreachAction(getParam(req, 'id')))));
router.get('/api/v1/patient-outreach-delivery-logs', asyncHandler(async (req, res) => ok(res, await listOutreachDeliveryLogs(req.query as Record<string, unknown>))));
router.get('/api/v1/patient-outreach-delivery-logs/:id', asyncHandler(async (req, res) => ok(res, await getOutreachDeliveryLogDetail(getParam(req, 'id')))));
router.post('/api/v1/wecom/messages/intake', asyncHandler(async (req, res) => created(res, await createWecomMessageIntake(req.body))));
router.post('/api/v1/wecom/messages/intake/real', asyncHandler(async (req, res) => created(res, await createRealWecomMessageIntake(req.body))));
router.get('/api/v1/wecom/customer-mappings/unmapped', asyncHandler(async (req, res) => ok(res, await listUnmappedWecomCustomers(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/customer-mappings/conflicts', asyncHandler(async (req, res) => ok(res, await listConflictWecomCustomers(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/mapping-audit/summary', asyncHandler(async (req, res) => ok(res, await getWecomMappingAuditSummary(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/mapping-governance/dashboard', asyncHandler(async (req, res) => ok(res, await getWecomMappingGovernanceDashboard(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/mapping-audit', asyncHandler(async (req, res) => ok(res, await listWecomMappingAudit(req.query as Record<string, unknown>))));
router.post('/api/v1/wecom/customer-mappings/confirm', asyncHandler(async (req, res) => ok(res, await confirmConversationPatientMapping(req.body))));
router.get('/api/v1/wecom/customer-mappings/:customerId', asyncHandler(async (req, res) => ok(res, await getCustomerPatientMapping(
  getParam(req, 'customerId'),
  typeof req.query.conversationId === 'string' ? req.query.conversationId : undefined
))));
router.post('/api/v1/wecom/conversations/:conversationId/mapping/confirm', asyncHandler(async (req, res) => ok(res, await confirmConversationPatientMappingByPath(getParam(req, 'conversationId'), req.body))));
router.post('/api/v1/wecom/conversations/:conversationId/mapping/unconfirm', asyncHandler(async (req, res) => ok(res, await unconfirmConversationPatientMappingByPath(getParam(req, 'conversationId'), req.body || {}))));
router.post('/api/v1/wecom/conversations/:conversationId/mapping/reassign', asyncHandler(async (req, res) => ok(res, await reassignConversationPatientMappingByPath(getParam(req, 'conversationId'), req.body))));
router.post('/api/v1/wecom/conversations/:conversationId/mapping/promote-binding', asyncHandler(async (req, res) => ok(res, await promoteConversationMappingToBindingByPath(getParam(req, 'conversationId'), req.body))));
router.get('/api/v1/wecom/conversations', asyncHandler(async (req, res) => ok(res, await listWecomConversations(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/conversations/:conversationId', asyncHandler(async (req, res) => ok(res, await getWecomConversationDetail(getParam(req, 'conversationId')))));
router.get('/api/v1/wecom/conversations/:conversationId/messages', asyncHandler(async (req, res) => ok(res, await listWecomConversationMessages(getParam(req, 'conversationId'), req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/conversations/:conversationId/insight', asyncHandler(async (req, res) => ok(res, await getWecomConversationLatestInsight(getParam(req, 'conversationId')))));
router.post('/api/v1/wecom/conversations/:conversationId/analyze', asyncHandler(async (req, res) => created(res, await createWecomConversationInsight(getParam(req, 'conversationId'), req.body))));
router.get('/api/v1/wecom/insights', asyncHandler(async (req, res) => ok(res, await listConversationInsights(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/insights/:insightId', asyncHandler(async (req, res) => ok(res, await getConversationInsightDetail(getParam(req, 'insightId')))));
router.post('/api/v1/wecom/conversations/:conversationId/business-feedback', asyncHandler(async (req, res) => created(res, await generateConversationBusinessFeedback(getParam(req, 'conversationId'), req.body))));
router.get('/api/v1/wecom/customers/:customerId/business-feedback', asyncHandler(async (req, res) => ok(res, await getCustomerFeedback(getParam(req, 'customerId')))));
router.post('/api/v1/wecom/conversations/:conversationId/business-actions', asyncHandler(async (req, res) => created(res, await createBusinessActionsFromConversation(getParam(req, 'conversationId'), req.body))));
router.get('/api/v1/wecom/event-states', asyncHandler(async (req, res) => ok(res, await listWecomEventState(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/automation-audit', asyncHandler(async (req, res) => ok(res, await listWecomAutomationAudit(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/conversations/:conversationId/ops-view', asyncHandler(async (req, res) => ok(res, await getWecomConversationOpsView(getParam(req, 'conversationId')))));
router.get('/api/v1/wecom/ops-summary', asyncHandler(async (_req, res) => ok(res, await getWecomOpsSummary())));

router.post('/api/v1/patients/:id/glucose-records', asyncHandler(async (req, res) => created(res, await createGlucoseRecord(getParam(req, 'id'), req.body))));
router.post('/api/v1/patients/:id/blood-pressure-records', asyncHandler(async (req, res) => created(res, await createBloodPressureRecord(getParam(req, 'id'), req.body))));
router.post('/api/v1/patients/:id/weight-records', asyncHandler(async (req, res) => created(res, await createWeightRecord(getParam(req, 'id'), req.body))));
router.get('/api/v1/patients/:id/health-records', asyncHandler(async (req, res) => ok(res, await getPatientHealthRecords(getParam(req, 'id'), typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined))));

router.get('/api/v1/dashboard/overview', asyncHandler(async (_req, res) => ok(res, await getDashboardOverview())));
router.get('/api/v1/dashboard/wecom-metrics', asyncHandler(async (_req, res) => ok(res, await getWecomDashboardMetrics())));
router.get('/api/v1/doctor-review-tasks', asyncHandler(async (_req, res) => ok(res, await listDoctorReviewTask())));
router.post('/api/v1/doctor-review-tasks', asyncHandler(async (req, res) => created(res, await createDoctorReviewTask(req.body))));
router.patch('/api/v1/doctor-review-tasks/:id', asyncHandler(async (req, res) => ok(res, await updateDoctorReviewTaskStatus(getParam(req, 'id'), req.body))));
router.post('/api/v1/doctor-review-tasks/:id/feedback', asyncHandler(async (req, res) => ok(res, await submitDoctorReviewTaskFeedback(getParam(req, 'id'), req.body))));

// Archive routes
router.get('/api/v1/member-archives/:userId', asyncHandler(async (req, res) => ok(res, await getMemberArchive(getParam(req, 'userId')))));
router.put('/api/v1/member-archives/:userId', asyncHandler(async (req, res) => ok(res, await upsertMemberArchive(getParam(req, 'userId'), req.body))));
router.get('/api/v1/member-archives', asyncHandler(async (req, res) => ok(res, await searchMemberArchives(req.query as Record<string, unknown>))));
router.get('/api/v1/wecom/conversations/:conversationId/member-archives', asyncHandler(async (req, res) => ok(res, await getConversationMemberArchives(getParam(req, 'conversationId')))));
router.get('/api/v1/patients/:patientId/archive-change-log', asyncHandler(async (req, res) => ok(res, await getPatientArchiveChangeLog(getParam(req, 'patientId'), typeof req.query.limit === 'string' ? Number(req.query.limit) : 20))));
router.post('/api/v1/member-archives/batch-update', asyncHandler(async (req, res) => ok(res, await batchUpdateMemberArchives(req.body.updates, req.body.operatorId))));
router.post('/api/v1/archives/analyze', asyncHandler(async (req, res) => ok(res, await analyzeArchiveForImprovementsController(
  typeof req.body.archiveType === 'string' ? req.body.archiveType : 'member',
  typeof req.body.archiveId === 'string' ? req.body.archiveId : '',
  req.body
))));

// 业务路由处理
router.post('/api/v1/business-routing/messages/process', asyncHandler(async (req, res) => ok(res, await processMessageWithBusinessRouting(req.body))));
router.post('/api/v1/business-routing/conversations/process', asyncHandler(async (req, res) => ok(res, await processConversationWithBusinessRouting(req.body))));
router.post('/api/v1/business-routing/messages/process-with-handler', asyncHandler(async (req, res) => ok(res, await processMessageWithSpecificHandler(req.body))));
router.get('/api/v1/business-routing/messages/:messageId/result', asyncHandler(async (req, res) => ok(res, await getMessageBusinessProcessingResult({ messageId: getParam(req, 'messageId') }))));
