import { env } from '../../../infra/config/env.js';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { sendWecomTextMessageService } from './wecom-message-sender.service.js';
import { createOutreachDeliveryLogService } from './outreach-delivery-log.service.js';

type OutreachActionRecord = {
  id: string;
  patientId: string;
  actionType: string;
  triggerSource: string;
  summary: string;
  status: string;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

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
    sendable: action.status === 'pending' && hasWecomConfig() && receiver.ok
  };
}

export async function sendWecomOutreachActionService(actionId: string) {
  const preview = await previewWecomOutreachActionService(actionId);
  const { action, receiver, wecomConfigReady } = preview;

  if (action.status !== 'pending') {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, 'outreach action is not pending');
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
      action: failedAction,
      mode: 'failed',
      receiver,
      deliveryLog,
      message: action.summary,
      nextStep: 'fix wecom binding before retry'
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
      action: failedAction,
      mode: 'failed',
      receiver,
      deliveryLog,
      message: action.summary,
      nextStep: 'fill wecom corpId / agentId / secret before retry'
    };
  }

  const sendResult = await sendWecomTextMessageService({
    receiverType: receiver.receiverType as string,
    receiverId: receiver.receiverId as string,
    message: action.summary
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
      action: failedAction,
      mode: 'failed',
      receiver,
      deliveryLog,
      message: action.summary,
      sender: sendResult,
      nextStep: sendResult.nextStep
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
    action: sentAction,
    mode: 'sent',
    receiver,
    deliveryLog,
    message: action.summary,
    sender: sendResult,
    nextStep: sendResult.nextStep
  };
}
