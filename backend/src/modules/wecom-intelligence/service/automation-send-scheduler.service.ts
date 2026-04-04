import { sendWecomOutreachActionService } from '../../enrollment/service/wecom-outreach.service.js';
import { createWecomAutomationAuditService } from './automation-audit.service.js';
import type { AutoSendResult } from './wecom-automation.types.js';

type ScheduleAutomationSendInput = {
  conversationId: string;
  messageId?: string;
  customerId?: string;
  triggerEvent?: string;
  triggerAction?: string;
  lifecycleStatus?: string;
  stateTransition?: string;
  actionId: string;
  mergeWindowMs: number;
};

const scheduledConversationTimers = new Map<string, NodeJS.Timeout>();

function scheduleTimer(conversationId: string, timer: NodeJS.Timeout) {
  const existing = scheduledConversationTimers.get(conversationId);
  if (existing) clearTimeout(existing);
  scheduledConversationTimers.set(conversationId, timer);
}

function clearScheduledConversation(conversationId: string) {
  const existing = scheduledConversationTimers.get(conversationId);
  if (existing) {
    clearTimeout(existing);
    scheduledConversationTimers.delete(conversationId);
  }
}

async function writeDelayedSendAudit(input: ScheduleAutomationSendInput, result: AutoSendResult) {
  await createWecomAutomationAuditService({
    conversationId: input.conversationId,
    messageId: input.messageId,
    customerId: input.customerId,
    triggerEvent: input.triggerEvent,
    triggerAction: input.triggerAction,
    lifecycleStatus: input.lifecycleStatus,
    stateTransition: input.stateTransition,
    triggered: result.status === 'sent' || result.status === 'already_sent',
    reason: `merge_window_flush:${result.reason}`,
    feedbackStatus: null,
    actionStatus: result.status,
    closureStatus: null,
    payload: {
      autoSendResult: result,
      scheduled: true,
      mergeWindowMs: input.mergeWindowMs
    }
  });
}

export async function scheduleAutomationAutoSend(input: ScheduleAutomationSendInput): Promise<AutoSendResult> {
  const timer = setTimeout(async () => {
    try {
      const result = await sendWecomOutreachActionService(input.actionId, 'debounced');
      await writeDelayedSendAudit(input, result);
    } catch (error) {
      await createWecomAutomationAuditService({
        conversationId: input.conversationId,
        messageId: input.messageId,
        customerId: input.customerId,
        triggerEvent: input.triggerEvent,
        triggerAction: input.triggerAction,
        lifecycleStatus: input.lifecycleStatus,
        stateTransition: input.stateTransition,
        triggered: false,
        reason: 'merge_window_flush_exception',
        feedbackStatus: null,
        actionStatus: 'exception',
        closureStatus: null,
        payload: {
          scheduled: true,
          mergeWindowMs: input.mergeWindowMs,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      clearScheduledConversation(input.conversationId);
    }
  }, input.mergeWindowMs);

  scheduleTimer(input.conversationId, timer);

  return {
    status: 'merge_window_waiting',
    reason: 'waiting_for_private_text_merge_window',
    actionId: input.actionId,
    sendAttempted: false,
    retryable: true,
    nextStep: 'send will be attempted after merge window',
    sendMode: 'debounced'
  };
}

export function resetAutomationSendSchedulerForTest() {
  for (const [conversationId, timer] of scheduledConversationTimers.entries()) {
    clearTimeout(timer);
    scheduledConversationTimers.delete(conversationId);
  }
}
