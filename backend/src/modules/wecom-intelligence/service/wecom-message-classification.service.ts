import type { SenderClassification, WecomMessageCategory, WecomSenderRole } from './wecom-automation.types.js';

type ResolveSenderClassificationInput = {
  chatType: 'private' | 'group';
  contentType?: string;
  event?: string;
  externalUserId?: string;
  senderRoleHint?: string;
};

function normalizeString(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export function isEventLikeMessage(contentType?: string, event?: string) {
  return normalizeString(contentType) === 'event' || Boolean(normalizeString(event));
}

export function isTextLikeMessage(contentType?: string) {
  const normalized = normalizeString(contentType);
  return normalized === '' || normalized === 'text';
}

function classifyMessageCategory(senderRole: WecomSenderRole, isEventMessage: boolean, isTextMessage: boolean): WecomMessageCategory {
  if (isEventMessage) return 'system_event';
  if (senderRole === 'system') return 'system_message';
  if (senderRole === 'customer') return isTextMessage ? 'customer_text' : 'customer_non_text';
  if (senderRole === 'staff') return isTextMessage ? 'staff_text' : 'staff_non_text';
  return 'unknown';
}

export function resolveSenderClassification(input: ResolveSenderClassificationInput): SenderClassification {
  const hint = normalizeString(input.senderRoleHint);
  const isEventMessage = isEventLikeMessage(input.contentType, input.event);
  const isTextMessage = isTextLikeMessage(input.contentType);

  let senderRole: WecomSenderRole = 'unknown';
  let senderRoleReason = 'unresolved_default_unknown';

  if (hint === 'customer' || hint === 'staff' || hint === 'system') {
    senderRole = hint;
    senderRoleReason = `sender_role_hint_${hint}`;
  } else if (isEventMessage) {
    senderRole = 'system';
    senderRoleReason = 'event_message_classified_as_system';
  } else if (input.externalUserId) {
    senderRole = 'customer';
    senderRoleReason = 'external_user_id_present';
  } else if (input.chatType === 'private') {
    senderRole = 'customer';
    senderRoleReason = isTextMessage
      ? 'private_text_default_customer'
      : 'private_non_text_default_customer';
  } else if (input.chatType === 'group' && isTextMessage) {
    senderRole = 'customer';
    senderRoleReason = 'group_text_default_customer';
  }

  const messageCategory = classifyMessageCategory(senderRole, isEventMessage, isTextMessage);

  return {
    senderRole,
    senderRoleReason,
    messageCategory,
    isEventMessage,
    isTextMessage,
    isCustomerExpression: messageCategory === 'customer_text'
  };
}

export function isCustomerExpressionCategory(category?: string | null) {
  return category === 'customer_text';
}
