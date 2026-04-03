import { createBloodPressureRecordService, createGlucoseRecordService, createWeightRecordService, getPatientHealthRecordsService } from '../service/health-record.service.js';

export async function createGlucoseRecord(patientId: string, payload: Record<string, unknown>) {
  return createGlucoseRecordService(patientId, payload);
}

export async function createBloodPressureRecord(patientId: string, payload: Record<string, unknown>) {
  return createBloodPressureRecordService(patientId, payload);
}

export async function createWeightRecord(patientId: string, payload: Record<string, unknown>) {
  return createWeightRecordService(patientId, payload);
}

export async function getPatientHealthRecords(patientId: string, limit?: number) {
  return getPatientHealthRecordsService(patientId, limit);
}
