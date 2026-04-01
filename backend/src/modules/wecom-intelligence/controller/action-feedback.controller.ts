import { AppError } from '../../../shared/errors/app-error.js';
import {
  OUTREACH_FEEDBACK_STATUS,
  OUTREACH_FEEDBACK_TYPE,
  type OutreachFeedbackStatus,
  type OutreachFeedbackType,
  writeDoctorReviewTaskFeedback,
  writeOutreachActionFeedback
} from '../service/action-feedback.service.js';

function requireFeedbackStatus(value: unknown, errorCode: string): OutreachFeedbackStatus {
  if (typeof value !== 'string') {
    throw new AppError(400, errorCode, '缺少 status');
  }
  if (!OUTREACH_FEEDBACK_STATUS.includes(value as OutreachFeedbackStatus)) {
    throw new AppError(400, errorCode, `status 非法，允许值：${OUTREACH_FEEDBACK_STATUS.join(', ')}`);
  }
  return value as OutreachFeedbackStatus;
}

function requireFeedbackType(value: unknown, errorCode: string): OutreachFeedbackType {
  if (typeof value !== 'string') {
    throw new AppError(400, errorCode, '缺少 feedbackType');
  }
  if (!OUTREACH_FEEDBACK_TYPE.includes(value as OutreachFeedbackType)) {
    throw new AppError(400, errorCode, `feedbackType 非法，允许值：${OUTREACH_FEEDBACK_TYPE.join(', ')}`);
  }
  return value as OutreachFeedbackType;
}

function normalizeNotes(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export async function submitOutreachActionFeedback(actionId: string, payload: Record<string, unknown>) {
  if (!actionId) {
    throw new AppError(400, 'INVALID_OUTREACH_ACTION_ID', '缺少 actionId');
  }

  return writeOutreachActionFeedback(actionId, {
    status: requireFeedbackStatus(payload.status, 'INVALID_OUTREACH_FEEDBACK_STATUS'),
    feedbackType: requireFeedbackType(payload.feedbackType, 'INVALID_OUTREACH_FEEDBACK_TYPE'),
    notes: normalizeNotes(payload.notes)
  });
}

export async function submitDoctorReviewTaskFeedback(taskId: string, payload: Record<string, unknown>) {
  if (!taskId) {
    throw new AppError(400, 'INVALID_DOCTOR_REVIEW_TASK_ID', '缺少 taskId');
  }

  return writeDoctorReviewTaskFeedback(taskId, {
    status: requireFeedbackStatus(payload.status, 'INVALID_DOCTOR_REVIEW_FEEDBACK_STATUS'),
    feedbackType: requireFeedbackType(payload.feedbackType, 'INVALID_DOCTOR_REVIEW_FEEDBACK_TYPE'),
    notes: normalizeNotes(payload.notes)
  });
}
