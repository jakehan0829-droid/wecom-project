import { AppError } from '../../../shared/errors/app-error.js';
import { intakeWecomMessage } from '../service/message-intake.service.js';

export async function createWecomMessageIntake(payload: Record<string, unknown>) {
  if (!payload.chatType || !payload.platformChatId || !payload.senderId || !payload.sentAt) {
    throw new AppError(400, 'INVALID_WECOM_MESSAGE_INPUT', '缺少必要字段：chatType/platformChatId/senderId/sentAt');
  }

  return intakeWecomMessage(payload as never);
}

export async function createRealWecomMessageIntake(payload: Record<string, unknown>) {
  if (!payload.msgid || !payload.chatid || !payload.sender || !payload.sendTime) {
    throw new AppError(400, 'INVALID_REAL_WECOM_EVENT', '缺少必要字段：msgid/chatid/sender/sendTime');
  }

  const chatType = payload.chatType === 'group' ? 'group' : 'private';
  const content = typeof payload.content === 'string' ? payload.content : '';
  const externalUserId = typeof payload.externalUserId === 'string' ? payload.externalUserId : undefined;

  return intakeWecomMessage({
    messageId: String(payload.msgid),
    chatType,
    platformChatId: String(payload.chatid),
    conversationName: typeof payload.chatName === 'string' ? payload.chatName : undefined,
    senderId: String(payload.sender),
    senderName: typeof payload.senderName === 'string' ? payload.senderName : undefined,
    senderRole: externalUserId ? 'customer' : 'staff',
    contentType: typeof payload.msgtype === 'string' ? payload.msgtype : 'text',
    contentRaw: content,
    contentText: content,
    sentAt: String(payload.sendTime),
    linkedCustomerId: externalUserId,
    metadata: {
      source: 'real_wecom_event',
      event: typeof payload.event === 'string' ? payload.event : undefined,
      changeType: typeof payload.changeType === 'string' ? payload.changeType : undefined,
      eventCategory: typeof payload.eventCategory === 'string' ? payload.eventCategory : undefined,
      eventAction: typeof payload.eventAction === 'string' ? payload.eventAction : undefined,
      lifecycleStatus: typeof payload.lifecycleStatus === 'string' ? payload.lifecycleStatus : undefined,
      eventPayload: typeof payload.eventPayload === 'object' && payload.eventPayload ? payload.eventPayload : undefined,
      originalPayload: payload
    }
  });
}
