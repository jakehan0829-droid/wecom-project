import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireNumberLike } from '../../../shared/utils/validators.js';
import { ensureDoctorReviewTaskForAlert } from '../../dashboard/service/doctor-review.service.js';
import { ensurePatientOutreachActionService } from '../../enrollment/service/outreach-action.service.js';

const GLUCOSE_ALERT_THRESHOLD = 11.1;
const BLOOD_PRESSURE_SYSTOLIC_ALERT_THRESHOLD = 140;
const BLOOD_PRESSURE_DIASTOLIC_ALERT_THRESHOLD = 90;

function ensureRange(value: number, fieldName: string, min: number, max: number) {
  if (value < min || value > max) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `${fieldName} must be between ${min} and ${max}`);
  }
  return value;
}

export async function createGlucoseRecordService(patientId: string, payload: Record<string, unknown>) {
  const glucoseValue = ensureRange(requireNumberLike(payload.glucoseValue, 'glucoseValue'), 'glucoseValue', 0, 50);
  const id = randomUUID();
  const result = await db.query(
    `insert into health_record_glucose (id, patient_id, measure_time, glucose_value, measure_scene, source)
     values ($1,$2,$3,$4,$5,$6)
     returning id, patient_id as "patientId", measure_time as "measureTime", glucose_value as "glucoseValue", measure_scene as "measureScene", source`,
    [id, patientId, payload.measureTime || new Date().toISOString(), glucoseValue, payload.measureScene || null, payload.source || 'manual']
  );

  const record = result.rows[0];
  if (glucoseValue >= GLUCOSE_ALERT_THRESHOLD) {
    await ensureDoctorReviewTaskForAlert(
      patientId,
      '血糖异常自动触发',
      `血糖异常自动触发：glucoseValue=${glucoseValue}，建议医生复核`
    );
    await ensurePatientOutreachActionService({
      patientId,
      actionType: 'manual_followup',
      triggerSource: 'system',
      summary: `血糖异常后建议尽快联系患者：glucoseValue=${glucoseValue}`
    });
  }

  return record;
}

export async function createBloodPressureRecordService(patientId: string, payload: Record<string, unknown>) {
  const systolicValue = ensureRange(requireNumberLike(payload.systolicValue, 'systolicValue'), 'systolicValue', 40, 300);
  const diastolicValue = ensureRange(requireNumberLike(payload.diastolicValue, 'diastolicValue'), 'diastolicValue', 20, 200);
  const id = randomUUID();
  const result = await db.query(
    `insert into health_record_blood_pressure (id, patient_id, measure_time, systolic_value, diastolic_value, source)
     values ($1,$2,$3,$4,$5,$6)
     returning id, patient_id as "patientId", measure_time as "measureTime", systolic_value as "systolicValue", diastolic_value as "diastolicValue", source`,
    [id, patientId, payload.measureTime || new Date().toISOString(), systolicValue, diastolicValue, payload.source || 'manual']
  );

  const record = result.rows[0];
  if (
    systolicValue >= BLOOD_PRESSURE_SYSTOLIC_ALERT_THRESHOLD ||
    diastolicValue >= BLOOD_PRESSURE_DIASTOLIC_ALERT_THRESHOLD
  ) {
    await ensureDoctorReviewTaskForAlert(
      patientId,
      '血压异常自动触发',
      `血压异常自动触发：systolic=${systolicValue}, diastolic=${diastolicValue}，建议医生复核`
    );
    await ensurePatientOutreachActionService({
      patientId,
      actionType: 'manual_followup',
      triggerSource: 'system',
      summary: `血压异常后建议尽快联系患者：systolic=${systolicValue}, diastolic=${diastolicValue}`
    });
  }

  return record;
}

export async function createWeightRecordService(patientId: string, payload: Record<string, unknown>) {
  const weightValue = ensureRange(requireNumberLike(payload.weightValue, 'weightValue'), 'weightValue', 1, 500);
  const id = randomUUID();
  const result = await db.query(
    `insert into health_record_weight (id, patient_id, measure_time, weight_value, source)
     values ($1,$2,$3,$4,$5)
     returning id, patient_id as "patientId", measure_time as "measureTime", weight_value as "weightValue", source`,
    [id, patientId, payload.measureTime || new Date().toISOString(), weightValue, payload.source || 'manual']
  );
  return result.rows[0];
}
