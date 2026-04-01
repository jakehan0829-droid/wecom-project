import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireEnum, requireString } from '../../../shared/utils/validators.js';

type CreateOutreachActionPayload = {
  patientId?: string;
  actionType?: string;
  triggerSource?: string;
  summary?: string;
};

type UpdateOutreachActionStatusPayload = {
  status?: string;
  failureReason?: string;
};

async function ensurePatientExists(patientId: string) {
  const result = await db.query(
    `select id from patient where id = $1 limit 1`,
    [patientId]
  );

  if (!result.rows[0]) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
  }
}

export async function findOutreachActionByIdService(actionId: string) {
  const result = await db.query(
    `select id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"
     from patient_outreach_action
     where id = $1
     limit 1`,
    [actionId]
  );

  const row = result.rows[0] || null;
  if (!row) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'outreach action not found');
  }

  return row;
}

async function findPendingOutreachAction(patientId: string, actionType: string, triggerSource?: string) {
  const values: unknown[] = [patientId, actionType];
  const sourceFilter = triggerSource ? `and trigger_source = $3` : '';
  if (triggerSource) {
    values.push(triggerSource);
  }

  const result = await db.query(
    `select id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"
     from patient_outreach_action
     where patient_id = $1
       and action_type = $2
       ${sourceFilter}
       and status = 'pending'
       and created_at::date = current_date
     order by created_at desc
     limit 1`,
    values
  );

  return result.rows[0] || null;
}

async function closePendingOutreachActionsByTypes(patientId: string, actionTypes: string[], failureReason = 'superseded_by_higher_priority_action') {
  if (!actionTypes.length) return { items: [], total: 0 };

  const result = await db.query(
    `update patient_outreach_action
     set status = 'closed', failure_reason = $3
     where patient_id = $1
       and action_type = any($2::text[])
       and status = 'pending'
       and created_at::date = current_date
     returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
    [patientId, actionTypes, failureReason]
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function ensurePatientOutreachActionService(payload: CreateOutreachActionPayload) {
  const patientId = requireString(payload.patientId, 'patientId');
  const actionType = requireEnum(payload.actionType, 'actionType', ['welcome_followup', 'profile_completion', 'manual_followup']);
  const triggerSource = requireEnum(payload.triggerSource, 'triggerSource', ['system', 'doctor_task', 'manual', 'wecom_event', 'wecom_automation']);
  const summary = requireString(payload.summary, 'summary');

  await ensurePatientExists(patientId);

  const existingAction = await findPendingOutreachAction(patientId, actionType, triggerSource);
  if (existingAction) {
    return {
      created: false,
      upgraded: false,
      action: existingAction,
      closedActions: []
    };
  }

  const id = randomUUID();
  const result = await db.query(
    `insert into patient_outreach_action (id, patient_id, action_type, trigger_source, summary, status, sent_at, failure_reason)
     values ($1,$2,$3,$4,$5,'pending', null, null)
     returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
    [id, patientId, actionType, triggerSource, summary]
  );

  return {
    created: true,
    upgraded: false,
    action: result.rows[0],
    closedActions: []
  };
}

export async function ensurePriorityPatientOutreachActionService(payload: CreateOutreachActionPayload & { priority: 'high' | 'medium' | 'low' }) {
  const patientId = requireString(payload.patientId, 'patientId');
  const actionType = requireEnum(payload.actionType, 'actionType', ['welcome_followup', 'profile_completion', 'manual_followup']);
  const triggerSource = requireEnum(payload.triggerSource, 'triggerSource', ['system', 'doctor_task', 'manual', 'wecom_event', 'wecom_automation']);
  const summary = requireString(payload.summary, 'summary');

  await ensurePatientExists(patientId);

  const existingAction = await findPendingOutreachAction(patientId, actionType, triggerSource);
  if (existingAction) {
    return {
      created: false,
      upgraded: false,
      action: existingAction,
      closedActions: []
    };
  }

  if (payload.priority === 'high') {
    const closed = await closePendingOutreachActionsByTypes(patientId, ['welcome_followup', 'profile_completion', 'manual_followup']);
    const id = randomUUID();
    const result = await db.query(
      `insert into patient_outreach_action (id, patient_id, action_type, trigger_source, summary, status, sent_at, failure_reason)
       values ($1,$2,$3,$4,$5,'pending', null, null)
       returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
      [id, patientId, actionType, triggerSource, summary]
    );

    return {
      created: true,
      upgraded: closed.total > 0,
      action: result.rows[0],
      closedActions: closed.items
    };
  }

  return ensurePatientOutreachActionService(payload);
}

export async function createPatientOutreachActionService(payload: CreateOutreachActionPayload) {
  const result = await ensurePatientOutreachActionService(payload);
  return result.action;
}

export async function completePendingManualFollowupOutreachActionsService(patientId: string) {
  const result = await db.query(
    `update patient_outreach_action
     set status = 'done', sent_at = coalesce(sent_at, now()), failure_reason = null
     where patient_id = $1
       and action_type = 'manual_followup'
       and status = 'pending'
       and created_at::date = current_date
     returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
    [patientId]
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function closePendingOutreachActionsForLifecycleService(patientId: string, reason: 'contact_lost' | 'group_closed') {
  return closePendingOutreachActionsByTypes(
    patientId,
    ['welcome_followup', 'profile_completion', 'manual_followup'],
    reason === 'contact_lost' ? 'closed_by_contact_lost' : 'closed_by_group_closed'
  );
}

export async function listPatientOutreachActionService() {
  const result = await db.query(
    `select id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"
     from patient_outreach_action
     order by created_at desc
     limit 50`
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function updatePatientOutreachActionStatusService(actionId: string, payload: UpdateOutreachActionStatusPayload) {
  await findOutreachActionByIdService(actionId);

  const status = requireEnum(payload.status, 'status', ['pending', 'done', 'failed', 'closed']);
  const failureReason = typeof payload.failureReason === 'string' ? payload.failureReason.trim() || null : null;

  const sentAtExpr = status === 'done' ? 'coalesce(sent_at, now())' : 'null';
  const nextFailureReason = status === 'failed'
    ? failureReason || 'manual mark failed'
    : status === 'closed'
      ? failureReason || 'manual mark closed'
      : null;

  const result = await db.query(
    `update patient_outreach_action
     set status = $2,
         sent_at = ${sentAtExpr},
         failure_reason = $3
     where id = $1
     returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
    [actionId, status, nextFailureReason]
  );

  return result.rows[0];
}
