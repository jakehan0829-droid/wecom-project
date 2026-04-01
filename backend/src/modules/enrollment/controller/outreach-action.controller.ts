import {
  createPatientOutreachActionService,
  findOutreachActionByIdService,
  listPatientOutreachActionService,
  updatePatientOutreachActionStatusService
} from '../service/outreach-action.service.js';

export async function createPatientOutreachAction(payload: Record<string, unknown>) {
  return createPatientOutreachActionService(payload);
}

export async function listPatientOutreachAction() {
  return listPatientOutreachActionService();
}

export async function getPatientOutreachAction(actionId: string) {
  return findOutreachActionByIdService(actionId);
}

export async function updatePatientOutreachActionStatus(actionId: string, payload: Record<string, unknown>) {
  return updatePatientOutreachActionStatusService(actionId, payload);
}
