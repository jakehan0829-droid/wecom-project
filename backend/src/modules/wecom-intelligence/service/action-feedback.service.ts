import { db } from '../../../infra/db/pg.js';
import { saveInsightV1 } from './insight-v1-repository.service.js';
import { findOutreachActionByIdService, updatePatientOutreachActionStatusService } from '../../enrollment/service/outreach-action.service.js';
import { updateDoctorReviewTaskStatusService } from '../../dashboard/service/doctor-review.service.js';

export const OUTREACH_FEEDBACK_STATUS = ['done', 'closed', 'failed'] as const;
export const OUTREACH_FEEDBACK_TYPE = ['completed', 'failed', 'no_response', 'rescheduled', 'duplicate', 'not_needed'] as const;

export type OutreachFeedbackStatus = typeof OUTREACH_FEEDBACK_STATUS[number];
export type OutreachFeedbackType = typeof OUTREACH_FEEDBACK_TYPE[number];

function buildFeedbackSummary(feedbackType: OutreachFeedbackType, notes?: string) {
  const base = `动作反馈：${feedbackType}`;
  return notes ? `${base}｜${notes}` : base;
}

async function writeFeedbackInsightV1(params: {
  conversationId: string;
  patientRef?: string | null;
  summary: string;
  source: 'outreach_action' | 'doctor_review_task';
  payload: Record<string, unknown>;
}) {
  await saveInsightV1({
    conversationId: params.conversationId,
    customerId: null,
    patientId: null,
    customerRef: params.patientRef || null,
    patientRef: params.patientRef || null,
    analysisVersion: 'v1-feedback',
    summary: params.summary,
    stage: 'feedback',
    needs: [],
    concerns: [],
    objections: [],
    risks: [],
    nextActions: [],
    confidence: 'medium',
    evidenceMessageIds: [],
    sourceMessageCount: 0,
    sourceWindowStartAt: null,
    sourceWindowEndAt: null
  });
}

export async function writeOutreachActionFeedback(actionId: string, payload: { status: OutreachFeedbackStatus; feedbackType: OutreachFeedbackType; notes?: string }) {
  const updatedAction = await updatePatientOutreachActionStatusService(actionId, {
    status: payload.status,
    failureReason: payload.notes
  });

  const action = await findOutreachActionByIdService(actionId);
  const summary = buildFeedbackSummary(payload.feedbackType, payload.notes);

  await writeFeedbackInsightV1({
    conversationId: `action-feedback:${actionId}`,
    patientRef: action.patientId,
    summary,
    source: 'outreach_action',
    payload: {
      actionId,
      status: updatedAction.status,
      feedbackType: payload.feedbackType,
      notes: payload.notes || null
    }
  });

  return updatedAction;
}

export async function writeDoctorReviewTaskFeedback(taskId: string, payload: { status: OutreachFeedbackStatus; feedbackType: OutreachFeedbackType; notes?: string }) {
  const updatedTask = await updateDoctorReviewTaskStatusService(taskId, {
    status: payload.status
  });

  const summary = buildFeedbackSummary(payload.feedbackType, payload.notes);

  await writeFeedbackInsightV1({
    conversationId: `task-feedback:${taskId}`,
    patientRef: updatedTask.patientId,
    summary,
    source: 'doctor_review_task',
    payload: {
      taskId,
      status: updatedTask.status,
      feedbackType: payload.feedbackType,
      notes: payload.notes || null
    }
  });

  return updatedTask;
}
