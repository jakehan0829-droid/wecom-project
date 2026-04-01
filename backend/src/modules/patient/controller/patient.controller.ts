import { createPatientService, getPatientDetailService, listPatientsService, updatePatientProfileService } from '../service/patient.service.js';

export async function listPatients() {
  return listPatientsService();
}

export async function createPatient(payload: Record<string, unknown>) {
  return createPatientService(payload);
}

export async function getPatientDetail(id: string) {
  return getPatientDetailService(id);
}

export async function updatePatientProfile(id: string, payload: Record<string, unknown>) {
  return updatePatientProfileService(id, payload);
}
