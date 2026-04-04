import { env } from '../../../infra/config/env.js';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { sendWecomTextMessageService } from './wecom-message-sender.service.js';
import { createOutreachDeliveryLogService } from './outreach-delivery-log.service.js';
import type { AutoSendResult, OutreachActionRecord } from '../../wecom-intelligence/service/wecom-automation.types.js';

type WecomBindingRecord = {
  id: string;
  bindingType: string;
  wecomUserId: string | null;
  externalUserId: string | null;
  bindingStatus: string;
};

async function findOutreachActionById(actionId: string): Promise<OutreachActionRecord | null> {
  const result = await db.query(
    `select id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"
     from patient_outreach_action
     where id = $1
     limit 1`,
    [actionId]
  );

  return result.rows[0] || null;
}

async function findActiveWecomBinding(patientId: string): Promise<WecomBindingRecord | null> {
  const result = await db.query(
    `select id, binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus"
     from patient_wecom_binding
     where patient_id = $1
       and binding_status = 'bound'
     order by created_at desc
     limit 1`,
    [patientId]
  );

  return result.rows[0] || null;
}

function hasWecomConfig() {
  return Boolean(env.wecom.corpId && env.wecom.agentId && env.wecom.secret);
}

function stripInternalPrefix(summary: string) {
  return summary
    .replace(/^【[^】]+】/, '')
    .replace(/｜优先级:[^｜]+$/u, '')
    .trim();
}

function buildCustomerReadableMessage(action: OutreachActionRecord) {
  const businessSummary = stripInternalPrefix(action.summary);

  if (action.actionType === 'welcome_followup') {
    return '您好，欢迎来到慢病管理服务。我会先帮您记录当前情况，您可以直接告诉我最近最想解决的问题、测量数据或用药情况。';
  }

  if (action.actionType === 'profile_completion') {
    return `您好，为了更准确地继续支持您，想补充确认一些信息。${businessSummary ? `当前已记录到：${businessSummary}。` : ''}如果方便，可以再告诉我最近的情况变化、测量结果或最需要帮助的点。`;
  }

  return `您好，收到您最近的消息了。${businessSummary ? `我们关注到：${businessSummary}。` : ''}为了更好地继续帮助您，方便的话请再补充一下最近最想优先处理的问题或测量数据。`;
}

function resolveWecomReceiver(binding: WecomBindingRecord | null) {
  if (!binding) {
    return {
      ok: false,
      reason: 'wecom binding not found',
      receiverType: null,
      receiverId: null
    };
  }

  if (binding.bindingType === 'wecom_user' && binding.wecomUserId) {
    return {
      ok: true,
      reason: null,
      receiverType: 'wecom_user',
      receiverId: binding.wecomUserId
    };
  }

  if (binding.bindingType === 'external_user' && binding.externalUserId) {
    return {
      ok: true,
      reason: null,
      receiverType: 'external_user',
      receiverId: binding.externalUserId
    };
  }

  return {
    ok: false,
    reason: 'wecom receiver not resolvable from binding',
    receiverType: null,
    receiverId: null
  };
}

export async function markOutreachActionFailedService(actionId: string, reason: string) {
  const result = await db.query(
    `update patient_outreach_action
     set status = 'failed', sent_at = null, failure_reason = $2
     where id = $1
     returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
    [actionId, reason]
  );

  return result.rows[0] || null;
}

export async function markOutreachActionSentService(actionId: string) {
  const result = await db.query(
    `update patient_outreach_action
     set status = 'done', sent_at = now(), failure_reason = null
     where id = $1
     returning id, patient_id as "patientId", action_type as "actionType", trigger_source as "triggerSource", summary, status, sent_at as "sentAt", failure_reason as "failureReason", created_at as "createdAt"`,
    [actionId]
  );

  return result.rows[0] || null;
}

export async function previewWecomOutreachActionService(actionId: string) {
  const action = await findOutreachActionById(actionId);
  if (!action) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'outreach action not found');
  }

  const binding = await findActiveWecomBinding(action.patientId);
  const receiver = resolveWecomReceiver(binding);

  return {
    action,
    binding,
    wecomConfigReady: hasWecomConfig(),
    receiver,
    messagePreview: action.summary,
    externalMessagePreview: buildCustomerReadableMessage(action),
    sendable: action.status === 'pending' && hasWecomConfig() && receiver.ok
  };
}

export async function sendWecomOutreachActionService(actionId: string, sendMode: 'immediate' | 'debounced' = 'immediate'): Promise<AutoSendResult> {
  const preview = await previewWecomOutreachActionService(actionId);
  const { action, receiver, wecomConfigReady } = preview;
  const externalMessage = buildCustomerReadableMessage(action);

  if (action.status === 'done') {
    return {
      status: 'already_sent',
      reason: 'action_already_done',
      actionId,
      sendAttempted: false,
      retryable: false,
      action,
      receiver,
      previewMessage: action.summary,
      externalMessage,
      nextStep: 'no-op'
    };
  }

  if (action.status === 'closed') {
    return {
      status: 'not_sendable',
      reason: 'action_closed',
      actionId,
      sendAttempted: false,
      retryable: false,
      action,
      receiver,
      previewMessage: action.summary,
      externalMessage,
      nextStep: 'manual review if needed'
    };
  }

  if (action.status === 'failed') {
    return {
      status: 'not_sendable',
      reason: 'action_failed',
      actionId,
      sendAttempted: false,
      retryable: true,
      action,
      receiver,
      previewMessage: action.summary,
      externalMessage,
      nextStep: 'repair send condition before retry'
    };
  }

  if (!receiver.ok) {
    const failedAction = await markOutreachActionFailedService(actionId, receiver.reason || 'wecom receiver invalid');
    const deliveryLog = await createOutreachDeliveryLogService({
      actionId,
      channel: 'wecom',
      receiverType: 'unknown',
      receiverId: 'unknown',
      deliveryStatus: 'failed',
      failureReason: receiver.reason || 'wecom receiver invalid'
    });
    return {
      status: 'not_sendable',
      reason: receiver.reason || 'wecom_receiver_invalid',
      actionId,
      sendAttempted: false,
      retryable: true,
      action: failedAction,
      receiver,
      deliveryLog,
      previewMessage: action.summary,
      externalMessage,
      deliveryStatus: 'failed',
      nextStep: 'fix wecom binding before retry',
      sendMode
    };
  }

  if (!wecomConfigReady) {
    const failedAction = await markOutreachActionFailedService(actionId, 'wecom config missing');
    const deliveryLog = await createOutreachDeliveryLogService({
      actionId,
      channel: 'wecom',
      receiverType: receiver.receiverType as string,
      receiverId: receiver.receiverId as string,
      deliveryStatus: 'failed',
      failureReason: 'wecom config missing'
    });
    return {
      status: 'not_sendable',
      reason: 'wecom_config_missing',
      actionId,
      sendAttempted: false,
      retryable: true,
      action: failedAction,
      receiver,
      deliveryLog,
      previewMessage: action.summary,
      externalMessage,
      deliveryStatus: 'failed',
      nextStep: 'fill wecom corpId / agentId / secret before retry',
      sendMode
    };
  }

  const sendResult = await sendWecomTextMessageService({
    receiverType: receiver.receiverType as string,
    receiverId: receiver.receiverId as string,
    message: externalMessage
  });

  if (!sendResult.success) {
    const failedAction = await markOutreachActionFailedService(actionId, sendResult.failureReason || 'wecom send failed');
    const deliveryLog = await createOutreachDeliveryLogService({
      actionId,
      channel: 'wecom',
      receiverType: receiver.receiverType as string,
      receiverId: receiver.receiverId as string,
      deliveryStatus: 'failed',
      failureReason: sendResult.failureReason || 'wecom send failed'
    });
    return {
      status: 'exception',
      reason: sendResult.failureReason || 'wecom_send_failed',
      actionId,
      sendAttempted: true,
      retryable: true,
      action: failedAction,
      receiver,
      deliveryLog,
      previewMessage: action.summary,
      externalMessage,
      deliveryStatus: 'failed',
      nextStep: sendResult.nextStep,
      errorMessage: sendResult.failureReason || 'wecom send failed',
      sendMode
    };
  }

  const sentAction = await markOutreachActionSentService(actionId);
  const deliveryLog = await createOutreachDeliveryLogService({
    actionId,
    channel: 'wecom',
    receiverType: receiver.receiverType as string,
    receiverId: receiver.receiverId as string,
    deliveryStatus: 'sent',
    platformMessageId: sendResult.platformResult?.msgId || null
  });
  return {
    status: 'sent',
    reason: 'send_success',
    actionId,
    sendAttempted: true,
    retryable: false,
    action: sentAction,
    receiver,
    deliveryLog,
    previewMessage: action.summary,
    externalMessage,
    deliveryStatus: 'sent',
    nextStep: sendResult.nextStep,
    sendMode
  };
}
