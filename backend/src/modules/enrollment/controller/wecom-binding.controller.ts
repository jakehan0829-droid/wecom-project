import { bindWecomService, getWecomBindingService } from '../service/wecom-binding.service.js';

export async function bindWecom(patientId: string, payload: Record<string, unknown>) {
  return bindWecomService(patientId, payload);
}

export async function getWecomBinding(patientId: string) {
  return getWecomBindingService(patientId);
}
