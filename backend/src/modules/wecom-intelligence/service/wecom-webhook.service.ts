import { AppError } from '../../../shared/errors/app-error.js';
import {
  decryptWecomMessage,
  extractXmlValue,
  parseSimpleXml,
  verifyWecomCallbackSignature,
  verifyWecomMsgSignature
} from './wecom-crypto.service.js';
import { env } from '../../../infra/config/env.js';

type VerifyUrlPayload = {
  msg_signature?: string;
  timestamp?: string;
  nonce?: string;
  echostr?: string;
};

type ReceivePayload = Record<string, unknown>;

type NormalizedWecomWebhookPayload = {
  msgid: string;
  chatid: string;
  chatType: string;
  chatName: string;
  sender: string;
  senderName: string;
  externalUserId?: string;
  msgtype: string;
  content: string;
  sendTime: string;
  event?: string;
  changeType?: string;
  welcomeCode?: string;
  eventCategory?: string;
  eventAction?: string;
  lifecycleStatus?: string;
  rawXml?: string;
  eventPayload?: Record<string, unknown>;
};

const WEBHOOK_TAGS = [
  'ToUserName',
  'FromUserName',
  'CreateTime',
  'MsgType',
  'Content',
  'MsgId',
  'AgentID',
  'ChatId',
  'ChatType',
  'ChatName',
  'ExternalUserID',
  'SenderName',
  'Event',
  'ChangeType',
  'WelcomeCode',
  'UpdateTime',
  'UserID',
  'ExternalUserID',
  'State',
  'FailReason',
  'ChatStatus',
  'JoinScene',
  'MemChangeCnt'
];

function normalizeChatType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'group' || normalized === '1') {
    return 'group';
  }
  return 'private';
}

function normalizeIncomingTimestamp(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  if (/^\d+$/.test(value)) {
    const millis = value.length <= 10 ? Number(value) * 1000 : Number(value);
    return new Date(millis).toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function classifyWecomEvent(event?: string, changeType?: string) {
  if (!event) {
    return {
      eventCategory: undefined,
      eventAction: undefined,
      lifecycleStatus: 'message_received'
    };
  }

  if (event === 'change_external_contact') {
    return {
      eventCategory: 'external_contact',
      eventAction: changeType || 'change_external_contact',
      lifecycleStatus: changeType === 'del_external_contact' ? 'contact_lost' : 'contact_changed'
    };
  }

  if (event === 'change_external_chat') {
    return {
      eventCategory: 'external_chat',
      eventAction: changeType || 'change_external_chat',
      lifecycleStatus: changeType?.includes('dismiss') ? 'group_closed' : 'group_changed'
    };
  }

  if (event === 'enter_agent') {
    return {
      eventCategory: 'agent',
      eventAction: 'enter_agent',
      lifecycleStatus: 'welcome_pending'
    };
  }

  if (event === 'batch_job_result') {
    return {
      eventCategory: 'batch_job',
      eventAction: 'batch_job_result',
      lifecycleStatus: 'async_job_finished'
    };
  }

  return {
    eventCategory: 'unknown_event',
    eventAction: changeType || event,
    lifecycleStatus: 'event_received'
  };
}

function normalizePlainWebhookPayload(payload: ReceivePayload): NormalizedWecomWebhookPayload {
  const event = payload.event || payload.Event ? String(payload.event || payload.Event) : undefined;
  const changeType = payload.changeType || payload.ChangeType ? String(payload.changeType || payload.ChangeType) : undefined;
  const classified = classifyWecomEvent(event, changeType);

  return {
    msgid: String(payload.msgid || payload.MsgId || payload.msgId || ''),
    chatid: String(payload.chatid || payload.ChatId || payload.chatId || ''),
    chatType: normalizeChatType(String(payload.chatType || payload.ChatType || 'private')),
    chatName: String(payload.chatName || payload.ChatName || ''),
    sender: String(payload.sender || payload.From || payload.FromUserName || ''),
    senderName: String(payload.senderName || payload.FromName || payload.SenderName || ''),
    externalUserId: payload.externalUserId || payload.ExternalUserID ? String(payload.externalUserId || payload.ExternalUserID) : undefined,
    msgtype: String(payload.msgtype || payload.MsgType || 'text'),
    content: String(payload.content || payload.Content || ''),
    sendTime: normalizeIncomingTimestamp(String(payload.sendTime || payload.CreateTime || new Date().toISOString())),
    event,
    changeType,
    welcomeCode: payload.welcomeCode || payload.WelcomeCode ? String(payload.welcomeCode || payload.WelcomeCode) : undefined,
    eventCategory: classified.eventCategory,
    eventAction: classified.eventAction,
    lifecycleStatus: classified.lifecycleStatus,
    eventPayload: event ? {
      event,
      changeType,
      externalUserId: payload.externalUserId || payload.ExternalUserID ? String(payload.externalUserId || payload.ExternalUserID) : undefined,
      state: payload.state || payload.State ? String(payload.state || payload.State) : undefined,
      welcomeCode: payload.welcomeCode || payload.WelcomeCode ? String(payload.welcomeCode || payload.WelcomeCode) : undefined
    } : undefined
  };
}

function parseEncryptedXmlEnvelope(xml: string) {
  return {
    encrypt: extractXmlValue(xml, 'Encrypt'),
    toUserName: extractXmlValue(xml, 'ToUserName'),
    agentId: extractXmlValue(xml, 'AgentID')
  };
}

function normalizeDecryptedXmlPayload(xml: string): NormalizedWecomWebhookPayload {
  const parsed = parseSimpleXml(xml, WEBHOOK_TAGS);
  const classified = classifyWecomEvent(parsed.Event || undefined, parsed.ChangeType || undefined);
  const eventPayload = parsed.Event ? {
    event: parsed.Event || undefined,
    changeType: parsed.ChangeType || undefined,
    userId: parsed.UserID || undefined,
    externalUserId: parsed.ExternalUserID || undefined,
    state: parsed.State || undefined,
    welcomeCode: parsed.WelcomeCode || undefined,
    failReason: parsed.FailReason || undefined,
    chatStatus: parsed.ChatStatus || undefined,
    joinScene: parsed.JoinScene || undefined,
    memChangeCnt: parsed.MemChangeCnt || undefined,
    updateTime: parsed.UpdateTime || undefined
  } : undefined;

  return {
    msgid: parsed.MsgId || `${parsed.FromUserName || 'unknown'}_${parsed.CreateTime || Date.now()}`,
    chatid: parsed.ChatId || parsed.FromUserName || parsed.ExternalUserID || '',
    chatType: normalizeChatType(parsed.ChatType || ''),
    chatName: parsed.ChatName || '',
    sender: parsed.FromUserName || parsed.UserID || parsed.ExternalUserID || '',
    senderName: parsed.SenderName || '',
    externalUserId: parsed.ExternalUserID || undefined,
    msgtype: parsed.MsgType || (parsed.Event ? 'event' : 'text'),
    content: parsed.Content || parsed.Event || parsed.ChangeType || '',
    sendTime: normalizeIncomingTimestamp(parsed.CreateTime || parsed.UpdateTime || ''),
    event: parsed.Event || undefined,
    changeType: parsed.ChangeType || undefined,
    welcomeCode: parsed.WelcomeCode || undefined,
    eventCategory: classified.eventCategory,
    eventAction: classified.eventAction,
    lifecycleStatus: classified.lifecycleStatus,
    rawXml: xml,
    eventPayload
  };
}

export function verifyWecomCallback(payload: VerifyUrlPayload) {
  const result = verifyWecomCallbackSignature(payload);
  return {
    ...result,
    received: {
      msgSignature: payload.msg_signature || '',
      timestamp: payload.timestamp || '',
      nonce: payload.nonce || ''
    }
  };
}

export function normalizeWecomWebhookPayload(payload: ReceivePayload) {
  if (typeof payload.xml === 'string' && payload.xml.trim()) {
    return normalizeDecryptedXmlPayload(payload.xml);
  }

  if (typeof payload.Encrypt === 'string' || typeof payload.encrypt === 'string') {
    const encrypted = String(payload.Encrypt || payload.encrypt || '');
    const signature = typeof payload.msg_signature === 'string' ? payload.msg_signature : undefined;
    const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : '';
    const nonce = typeof payload.nonce === 'string' ? payload.nonce : '';

    if (!signature || !timestamp || !nonce) {
      throw new AppError(400, 'INVALID_WECOM_WEBHOOK_QUERY', '企微回调缺少签名参数');
    }

    const ok = verifyWecomMsgSignature({
      token: env.wecom.token,
      timestamp,
      nonce,
      encrypted,
      signature
    });

    if (!ok) {
      throw new AppError(400, 'INVALID_WECOM_SIGNATURE', '企微回调签名失败');
    }

    const xml = decryptWecomMessage(encrypted);
    return normalizeDecryptedXmlPayload(xml);
  }

  if (typeof payload.body === 'string' && payload.body.trim().startsWith('<xml>')) {
    const envelope = parseEncryptedXmlEnvelope(payload.body);
    if (!envelope.encrypt) {
      throw new AppError(400, 'INVALID_WECOM_XML_ENVELOPE', '企微回调 XML 中缺少 Encrypt');
    }

    const signature = typeof payload.msg_signature === 'string' ? payload.msg_signature : undefined;
    const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : '';
    const nonce = typeof payload.nonce === 'string' ? payload.nonce : '';

    if (!signature || !timestamp || !nonce) {
      throw new AppError(400, 'INVALID_WECOM_WEBHOOK_QUERY', '企微回调缺少签名参数');
    }

    const ok = verifyWecomMsgSignature({
      token: env.wecom.token,
      timestamp,
      nonce,
      encrypted: envelope.encrypt,
      signature
    });

    if (!ok) {
      throw new AppError(400, 'INVALID_WECOM_SIGNATURE', '企微回调签名失败');
    }

    const xml = decryptWecomMessage(envelope.encrypt);
    return normalizeDecryptedXmlPayload(xml);
  }

  return normalizePlainWebhookPayload(payload);
}
