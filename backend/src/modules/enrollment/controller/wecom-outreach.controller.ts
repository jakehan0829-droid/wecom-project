import { previewWecomOutreachActionService, sendWecomOutreachActionService } from '../service/wecom-outreach.service.js';

export async function previewWecomOutreachAction(actionId: string) {
  return previewWecomOutreachActionService(actionId);
}

export async function sendWecomOutreachAction(actionId: string) {
  return sendWecomOutreachActionService(actionId);
}
