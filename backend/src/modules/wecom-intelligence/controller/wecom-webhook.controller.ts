import { AppError } from '../../../shared/errors/app-error.js';
import { createRealWecomMessageIntake } from './message-intake.controller.js';
import { normalizeWecomWebhookPayload, verifyWecomCallback } from '../service/wecom-webhook.service.js';
import { runWecomEventAutomation } from '../service/wecom-event-automation.service.js';
import { createWecomEventStateService } from '../service/event-state.service.js';
import { updateWecomConversationStatusService } from '../service/conversation-state.service.js';
import { createWecomAutomationAuditService } from '../service/automation-audit.service.js';
import { checkWecomAutomationDedupService } from '../service/automation-idempotency.service.js';
import { buildWecomWebhookObserveContext, logWecomWebhookObserve } from '../service/wecom-webhook-observe.service.js';

export async function verifyWecomWebhook(query: Record<string, unknown>) {
  const observe = buildWecomWebhookObserveContext({ query });
  logWecomWebhookObserve('verify_request', observe);

  try {
    const result = verifyWecomCallback({
      msg_signature: typeof query.msg_signature === 'string' ? query.msg_signature : undefined,
      timestamp: typeof query.timestamp === 'string' ? query.timestamp : undefined,
      nonce: typeof query.nonce === 'string' ? query.nonce : undefined,
      echostr: typeof query.echostr === 'string' ? query.echostr : undefined
    });

    logWecomWebhookObserve('verify_success', {
      ...observe,
      verified: true,
      mode: result.mode
    });

    return {
      plainText: result.echoStr,
      meta: result
    };
  } catch (error) {
    logWecomWebhookObserve('verify_fail', {
      ...observe,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function receiveWecomWebhook(payload: Record<string, unknown>, query?: Record<string, unknown>) {
  const requestBodyType = typeof payload.body === 'string'
    ? 'raw_text_body'
    : typeof payload.xml === 'string'
      ? 'xml_field'
      : typeof payload.Encrypt === 'string' || typeof payload.encrypt === 'string'
        ? 'encrypt_field'
        : 'json_body';

  logWecomWebhookObserve('receive_request', buildWecomWebhookObserveContext({ query, requestBodyType }));

  try {
    const normalized = normalizeWecomWebhookPayload({
      ...payload,
      msg_signature: typeof query?.msg_signature === 'string' ? query.msg_signature : undefined,
      timestamp: typeof query?.timestamp === 'string' ? query.timestamp : undefined,
      nonce: typeof query?.nonce === 'string' ? query.nonce : undefined
    });

    logWecomWebhookObserve('receive_normalized', buildWecomWebhookObserveContext({
      query,
      normalized,
      requestBodyType
    }));

    if (!normalized.msgid || !normalized.chatid || !normalized.sender) {
      throw new AppError(400, 'INVALID_WECOM_WEBHOOK_PAYLOAD', '企微 webhook payload 缺少必要字段');
    }

    const intake = await createRealWecomMessageIntake(normalized);
    const dedup = await checkWecomAutomationDedupService({
      conversationId: intake.conversationId,
      messageId: intake.messageId,
      triggerEvent: normalized.event,
      triggerAction: normalized.changeType || normalized.msgtype,
      stateTransition: normalized.lifecycleStatus || normalized.eventAction
    });

    const automation = dedup.duplicate
      ? {
          triggered: false,
          executionStatus: 'skipped',
          reason: dedup.reason,
          stateTransition: normalized.lifecycleStatus || normalized.eventAction,
          nextConversationStatus: undefined,
          insight: null,
          feedback: null,
          actions: null,
          autoSendResult: null,
          lifecycleClosures: {
            outreach: { items: [], total: 0 },
            doctorReview: { items: [], total: 0 }
          }
        }
      : await runWecomEventAutomation({
          conversationId: intake.conversationId,
          customerId: intake.linkedCustomerId || normalized.externalUserId,
          event: normalized.event,
          changeType: normalized.changeType,
          messageId: intake.messageId,
          chatType: normalized.chatType === 'group' ? 'group' : 'private',
          contentType: normalized.msgtype,
          contentText: normalized.content,
          lifecycleStatus: normalized.lifecycleStatus,
          messageCategory: intake.messageCategory
        });

    const eventState = await createWecomEventStateService({
      conversationId: intake.conversationId,
      messageId: intake.messageId,
      customerId: intake.linkedCustomerId || normalized.externalUserId,
      eventCategory: normalized.eventCategory,
      eventAction: normalized.eventAction,
      lifecycleStatus: normalized.lifecycleStatus,
      stateTransition: automation.stateTransition,
      eventPayload: {
        ...(normalized.eventPayload || {}),
        msgtype: normalized.msgtype,
        content: normalized.content
      }
    });

    const conversationStatus = await updateWecomConversationStatusService(
      intake.conversationId,
      automation.nextConversationStatus || 'active'
    );

    const automationAudit = await createWecomAutomationAuditService({
      conversationId: intake.conversationId,
      messageId: intake.messageId,
      customerId: intake.linkedCustomerId || normalized.externalUserId,
      triggerEvent: normalized.event,
      triggerAction: normalized.changeType || normalized.msgtype,
      lifecycleStatus: normalized.lifecycleStatus,
      stateTransition: automation.stateTransition,
      triggered: automation.triggered,
      reason: automation.executionStatus ? `${automation.executionStatus}:${automation.reason}` : automation.reason,
      insightId: automation.insight?.insightId ? String(automation.insight.insightId) : null,
      feedbackStatus: automation.feedback?.status ? String(automation.feedback.status) : null,
      actionStatus: automation.autoSendResult?.status || automation.actions?.automation?.status || null,
      closureStatus: automation.lifecycleClosures?.outreach?.total ? 'closed_pending_actions' : 'none',
      payload: {
        automation,
        normalized
      }
    });

    logWecomWebhookObserve('receive_success', {
      ...buildWecomWebhookObserveContext({ query, normalized, requestBodyType }),
      accepted: true,
      mode: normalized.rawXml ? 'real-encrypted-webhook' : 'plain-webhook',
      conversationId: intake.conversationId,
      dedupDuplicate: dedup.duplicate,
      dedupReason: dedup.reason,
      automationTriggered: automation.triggered,
      automationStatus: automation.executionStatus,
      nextConversationStatus: automation.nextConversationStatus || 'active'
    });

    return {
      plainText: 'success',
      meta: {
        accepted: true,
        mode: normalized.rawXml ? 'real-encrypted-webhook' : 'plain-webhook',
        intake,
        automation,
        eventState,
        conversationStatus,
        automationAudit
      }
    };
  } catch (error) {
    logWecomWebhookObserve('receive_fail', {
      ...buildWecomWebhookObserveContext({ query, requestBodyType }),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
