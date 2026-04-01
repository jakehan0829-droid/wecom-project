import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireString } from '../../../shared/utils/validators.js';
import { completePendingManualFollowupOutreachActionsService } from '../../enrollment/service/outreach-action.service.js';

async function findPendingDoctorReviewTaskBySummary(patientId: string, summaryPrefix: string) {
  const result = await db.query(
    `select id, patient_id as "patientId", summary, status, created_at as "createdAt"
     from doctor_review_task
     where patient_id = $1
       and status = 'pending'
       and summary like $2
       and created_at::date = current_date
     order by created_at desc
     limit 1`,
    [patientId, `${summaryPrefix}%`]
  );

  return result.rows[0] || null;
}

async function closePendingDoctorReviewTasks(patientId: string, summaryPrefix: string) {
  const result = await db.query(
    `update doctor_review_task
     set status = 'closed'
     where patient_id = $1
       and status = 'pending'
       and summary like $2
       and created_at::date = current_date
     returning id, patient_id as "patientId", summary, status, created_at as "createdAt"`,
    [patientId, `${summaryPrefix}%`]
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function closePendingDoctorReviewTasksForLifecycleService(patientId: string) {
  const result = await db.query(
    `update doctor_review_task
     set status = 'closed'
     where patient_id = $1
       and status = 'pending'
       and created_at::date = current_date
     returning id, patient_id as "patientId", summary, status, created_at as "createdAt"`,
    [patientId]
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function ensureDoctorReviewTaskForAlert(patientId: string, summaryPrefix: string, summary: string) {
  const existingTask = await findPendingDoctorReviewTaskBySummary(patientId, summaryPrefix);
  if (existingTask) {
    return {
      created: false,
      upgraded: false,
      task: existingTask,
      closedTasks: []
    };
  }

  const id = randomUUID();
  const result = await db.query(
    `insert into doctor_review_task (id, patient_id, summary, status)
     values ($1,$2,$3,'pending')
     returning id, patient_id as "patientId", summary, status, created_at as "createdAt"`,
    [id, patientId, summary]
  );

  return {
    created: true,
    upgraded: false,
    task: result.rows[0],
    closedTasks: []
  };
}

export async function ensurePriorityDoctorReviewTaskForAlert(patientId: string, summaryPrefix: string, summary: string, priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') {
    const closed = await closePendingDoctorReviewTasks(patientId, summaryPrefix);
    const id = randomUUID();
    const result = await db.query(
      `insert into doctor_review_task (id, patient_id, summary, status)
       values ($1,$2,$3,'pending')
       returning id, patient_id as "patientId", summary, status, created_at as "createdAt"`,
      [id, patientId, summary]
    );

    return {
      created: true,
      upgraded: closed.total > 0,
      task: result.rows[0],
      closedTasks: closed.items
    };
  }

  return ensureDoctorReviewTaskForAlert(patientId, summaryPrefix, summary);
}

export async function createDoctorReviewTaskService(payload: Record<string, unknown>) {
  const patientId = requireString(payload.patientId, 'patientId');
  const summary = requireString(payload.summary, 'summary');
  const id = randomUUID();
  const result = await db.query(
    `insert into doctor_review_task (id, patient_id, summary, status)
     values ($1,$2,$3,'pending')
     returning id, patient_id as "patientId", summary, status, created_at as "createdAt"`,
    [id, patientId, summary]
  );
  return result.rows[0];
}

export async function listDoctorReviewTaskService() {
  const result = await db.query(
    `select id, patient_id as "patientId", summary, status, created_at as "createdAt"
     from doctor_review_task
     order by created_at desc
     limit 50`
  );
  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function updateDoctorReviewTaskStatusService(id: string, payload: Record<string, unknown>) {
  const status = requireString(payload.status, 'status');
  const result = await db.query(
    `update doctor_review_task
     set status = $2
     where id = $1
     returning id, patient_id as "patientId", summary, status, created_at as "createdAt"`,
    [id, status]
  );

  const task = result.rows[0] || null;
  if (!task) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'doctor review task not found');
  }

  if (status !== 'pending') {
    await completePendingManualFollowupOutreachActionsService(task.patientId);
  }

  return task;
}
