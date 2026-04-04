import { ensurePriorityPatientOutreachActionService } from '../../enrollment/service/outreach-action.service.js';
import { ensurePriorityDoctorReviewTaskForAlert } from '../../dashboard/service/doctor-review.service.js';
import { generateBusinessFeedback } from './business-feedback.service.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';
import type { ActionGenerationDecision, BusinessActionResult, DoctorReviewTaskRecord, OutreachActionRecord } from './wecom-automation.types.js';

type WecomAutomationContext = {
  triggerSource?: 'wecom_event' | 'wecom_automation' | 'system' | 'manual' | 'doctor_task';
  actionTypeHint?: 'welcome_followup' | 'profile_completion' | 'manual_followup';
  summaryPrefix?: string;
};

function buildOutreachSummary(feedback: Awaited<ReturnType<typeof generateBusinessFeedback>>, priority: string) {
  const summaryText = feedback.customerNeedSummary?.summaryText || '客户有新的会话分析结果待跟进';
  return `【企微跟进】${summaryText}｜优先级:${priority}`;
}

function buildDoctorReviewSummary(feedback: Awaited<ReturnType<typeof generateBusinessFeedback>>, priority: string) {
  const summaryText = feedback.customerNeedSummary?.summaryText || '客户会话出现新的分析结果';
  return `【企微分析复核】${summaryText}｜优先级:${priority}`;
}

function detectPriority(feedback: Awaited<ReturnType<typeof generateBusinessFeedback>>) {
  if ((feedback.riskSignals || []).length > 0) return 'high' as const;
  if ((feedback.followupSuggestions || []).length > 0) return 'medium' as const;
  return 'low' as const;
}

function detectActionMode(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'doctor_review_and_followup';
  if (priority === 'medium') return 'followup_only';
  return 'observe';
}

function resolveActionType(context?: WecomAutomationContext) {
  return context?.actionTypeHint || 'manual_followup';
}

function resolveTriggerSource(context?: WecomAutomationContext) {
  return context?.triggerSource || 'wecom_automation';
}

function normalizeDecision(created: boolean, upgraded: boolean): ActionGenerationDecision {
  if (upgraded) return 'upgraded';
  if (created) return 'created';
  return 'reused';
}

export async function generateBusinessActions(conversationId: string, customerId: string, patientId?: string, context?: WecomAutomationContext): Promise<BusinessActionResult> {
  const feedback = await generateBusinessFeedback(conversationId, customerId);
  const mappingLookup = patientId
    ? {
        status: 'matched' as const,
        mapping: { patientId, patientName: '', matchedBy: 'patient_id' as const }
      }
    : await lookupCustomerMapping(customerId, conversationId);

  const patientMapping = mappingLookup?.status === 'matched' ? mappingLookup.mapping : null;

  if (feedback.status !== 'ready' || feedback.customerExpressionStatus !== 'present' || !patientMapping?.patientId) {
    return {
      feedback,
      patientMapping,
      customerLookup: mappingLookup || null,
      outreachAction: null as OutreachActionRecord | null,
      outreachActionDecision: 'skipped' as ActionGenerationDecision,
      supersededOutreachActions: [] as OutreachActionRecord[],
      doctorReviewTask: null as DoctorReviewTaskRecord | null,
      doctorReviewDecision: 'skipped' as ActionGenerationDecision,
      automation: {
        status: 'skipped',
        reason: !patientMapping?.patientId
          ? 'patient_not_mapped'
          : feedback.customerExpressionStatus !== 'present'
            ? 'no_effective_customer_expression'
            : 'feedback_not_ready',
        priority: 'low',
        actionMode: 'observe'
      }
    };
  }

  const priority = detectPriority(feedback);
  const actionMode = detectActionMode(priority);

  const outreachActionResult = actionMode === 'observe'
    ? null
    : await ensurePriorityPatientOutreachActionService({
        patientId: patientMapping.patientId,
        actionType: resolveActionType(context),
        triggerSource: resolveTriggerSource(context),
        summary: buildOutreachSummary(feedback, priority),
        priority
      });

  const doctorReviewTaskResult = actionMode === 'doctor_review_and_followup'
    ? await ensurePriorityDoctorReviewTaskForAlert(
        patientMapping.patientId,
        '【企微分析复核】',
        buildDoctorReviewSummary(feedback, priority),
        priority
      )
    : null;

  return {
    feedback,
    patientMapping,
    customerLookup: mappingLookup,
    outreachAction: outreachActionResult?.action || null,
    outreachActionDecision: outreachActionResult ? normalizeDecision(outreachActionResult.created, outreachActionResult.upgraded) : 'skipped',
    supersededOutreachActions: outreachActionResult?.closedActions || [],
    doctorReviewTask: doctorReviewTaskResult?.task || null,
    doctorReviewDecision: doctorReviewTaskResult ? normalizeDecision(doctorReviewTaskResult.created, doctorReviewTaskResult.upgraded) : 'skipped',
    automation: {
      status: outreachActionResult ? normalizeDecision(outreachActionResult.created, outreachActionResult.upgraded) : 'skipped',
      reason: 'feedback_ready',
      priority,
      actionMode
    }
  };
}
