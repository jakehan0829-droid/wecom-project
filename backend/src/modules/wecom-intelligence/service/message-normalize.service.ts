import { randomUUID } from 'node:crypto';
import type { WecomMessageCategory, WecomSenderRole } from './wecom-automation.types.js';

export type WecomMessageIntakeInput = {
  messageId?: string;
  chatType: 'private' | 'group';
  platformChatId: string;
  conversationName?: string;
  senderId: string;
  senderName?: string;
  senderRole?: WecomSenderRole;
  senderRoleReason?: string;
  contentType?: string;
  contentRaw?: string;
  contentText?: string;
  sentAt: string;
  linkedCustomerId?: string;
  messageCategory?: WecomMessageCategory;
  metadata?: Record<string, unknown>;
};

export type NormalizedWecomMessage = {
  messageId: string;
  chatType: 'private' | 'group';
  platformChatId: string;
  conversationId: string;
  conversationName?: string;
  senderId: string;
  senderName?: string;
  senderRole: WecomSenderRole;
  senderRoleReason?: string;
  contentType: string;
  contentRaw: string;
  contentText: string;
  sentAt: string;
  linkedCustomerId?: string;
  messageCategory: WecomMessageCategory;
  metadata: Record<string, unknown>;
};

export function buildConversationId(chatType: 'private' | 'group', platformChatId: string) {
  return `wecom:${chatType}:${platformChatId}`;
}

export function normalizeWecomMessage(input: WecomMessageIntakeInput): NormalizedWecomMessage {
  return {
    messageId: input.messageId?.trim() || randomUUID(),
    chatType: input.chatType,
    platformChatId: input.platformChatId,
    conversationId: buildConversationId(input.chatType, input.platformChatId),
    conversationName: input.conversationName,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole || 'unknown',
    senderRoleReason: input.senderRoleReason,
    contentType: input.contentType || 'text',
    contentRaw: input.contentRaw || input.contentText || '',
    contentText: input.contentText || input.contentRaw || '',
    sentAt: input.sentAt,
    linkedCustomerId: input.linkedCustomerId,
    messageCategory: input.messageCategory || 'unknown',
    metadata: input.metadata || {}
  };
}
