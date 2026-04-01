import { bindPatientTagService, createPatientTagService } from '../service/patient-tag.service.js';

export async function createPatientTag(payload: Record<string, unknown>) {
  return createPatientTagService(payload);
}

export async function bindPatientTag(patientId: string, payload: Record<string, unknown>) {
  return bindPatientTagService(patientId, payload);
}
