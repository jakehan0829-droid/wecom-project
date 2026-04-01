import { createDoctorReviewTaskService, listDoctorReviewTaskService, updateDoctorReviewTaskStatusService } from '../service/doctor-review.service.js';

export async function createDoctorReviewTask(payload: Record<string, unknown>) {
  return createDoctorReviewTaskService(payload);
}

export async function listDoctorReviewTask() {
  return listDoctorReviewTaskService();
}

export async function updateDoctorReviewTaskStatus(id: string, payload: Record<string, unknown>) {
  return updateDoctorReviewTaskStatusService(id, payload);
}
