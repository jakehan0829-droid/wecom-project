import { container } from '../../../shared/di/container.js';
import { PatientService } from '../service/patient.service.new.js';

// 获取PatientService实例
const patientService = container.resolve(PatientService);

export async function listPatients() {
  return patientService.listPatients();
}

export async function createPatient(payload: Record<string, unknown>) {
  return patientService.createPatient(payload);
}

export async function getPatientDetail(id: string) {
  return patientService.getPatientDetail(id);
}

export async function updatePatientProfile(id: string, payload: Record<string, unknown>) {
  return patientService.updatePatientProfile(id, payload);
}

// 保持向后兼容的函数名
export async function getPatientHealthRecords(id: string) {
  // TODO: 实现健康记录查询
  throw new Error('Not implemented yet');
}