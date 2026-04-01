import { env } from '../../../infra/config/env.js';
import { sendWecomAppMessageService } from './wecom-api-client.service.js';

type SendWecomTextMessageInput = {
  receiverType: string;
  receiverId: string;
  message: string;
};

type SendWecomTextMessageResult = {
  success: boolean;
  mode: 'real-api' | 'config-missing';
  failureReason: string | null;
  requestPreview: {
    corpIdReady: boolean;
    agentIdReady: boolean;
    secretReady: boolean;
    receiverType: string;
    receiverId: string;
    message: string;
  };
  nextStep: string;
  platformResult?: {
    errorCode?: number;
    errorMessage?: string;
    msgId?: string;
    requestBody?: Record<string, unknown>;
  };
};

function hasCoreWecomConfig() {
  return Boolean(env.wecom.corpId && env.wecom.agentId && env.wecom.secret);
}

export async function sendWecomTextMessageService(input: SendWecomTextMessageInput): Promise<SendWecomTextMessageResult> {
  const requestPreview = {
    corpIdReady: Boolean(env.wecom.corpId),
    agentIdReady: Boolean(env.wecom.agentId),
    secretReady: Boolean(env.wecom.secret),
    receiverType: input.receiverType,
    receiverId: input.receiverId,
    message: input.message
  };

  if (!hasCoreWecomConfig()) {
    return {
      success: false,
      mode: 'config-missing',
      failureReason: 'wecom config missing',
      requestPreview,
      nextStep: 'fill corpId / agentId / secret before real api send'
    };
  }

  const sendResult = await sendWecomAppMessageService(
    input.receiverType === 'wecom_user'
      ? { toUser: input.receiverId, content: input.message }
      : { toExternalUser: input.receiverId, content: input.message }
  );

  if (!sendResult.ok) {
    return {
      success: false,
      mode: 'real-api',
      failureReason: sendResult.errorMessage || 'wecom send failed',
      requestPreview,
      platformResult: {
        errorCode: sendResult.errorCode,
        errorMessage: sendResult.errorMessage,
        requestBody: sendResult.requestBody
      },
      nextStep: 'check wecom receiver type, app scope, secret, and external contact permissions'
    };
  }

  return {
    success: true,
    mode: 'real-api',
    failureReason: null,
    requestPreview,
    platformResult: {
      msgId: sendResult.data?.msgId,
      requestBody: sendResult.requestBody
    },
    nextStep: 'real wecom api send completed'
  };
}
