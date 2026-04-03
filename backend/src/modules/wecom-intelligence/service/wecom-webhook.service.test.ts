import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  verifyWecomCallback,
  normalizeWecomWebhookPayload,
  normalizeChatType,
  normalizeIncomingTimestamp,
  classifyWecomEvent
} from './wecom-webhook.service.js';
import {
  decryptWecomMessage,
  verifyWecomCallbackSignature,
  verifyWecomMsgSignature,
  parseSimpleXml
} from './wecom-crypto.service.js';
import { AppError } from '../../../shared/errors/app-error.js';

// Mock dependencies
jest.mock('./wecom-crypto.service.js');
jest.mock('../../../infra/config/env.js', () => ({
  env: {
    wecom: {
      token: 'test-token',
      encodingAesKey: 'test-aes-key',
      corpId: 'test-corp-id'
    }
  }
}));

const mockDecryptWecomMessage = decryptWecomMessage as jest.MockedFunction<typeof decryptWecomMessage>;
const mockVerifyWecomCallbackSignature = verifyWecomCallbackSignature as jest.MockedFunction<typeof verifyWecomCallbackSignature>;
const mockVerifyWecomMsgSignature = verifyWecomMsgSignature as jest.MockedFunction<typeof verifyWecomMsgSignature>;
const mockParseSimpleXml = parseSimpleXml as jest.MockedFunction<typeof parseSimpleXml>;

describe('Wecom Webhook Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Helper Functions', () => {
    describe('normalizeChatType', () => {
      it('should normalize "group" to group', () => {
        expect(normalizeChatType('group')).toBe('group');
        expect(normalizeChatType('GROUP')).toBe('group');
        expect(normalizeChatType('Group')).toBe('group');
      });

      it('should normalize "1" to group', () => {
        expect(normalizeChatType('1')).toBe('group');
      });

      it('should normalize other values to private', () => {
        expect(normalizeChatType('private')).toBe('private');
        expect(normalizeChatType('single')).toBe('private');
        expect(normalizeChatType('')).toBe('private');
        expect(normalizeChatType('unknown')).toBe('private');
      });

      it('should trim whitespace', () => {
        expect(normalizeChatType('  group  ')).toBe('group');
        expect(normalizeChatType('  1  ')).toBe('group');
      });
    });

    describe('normalizeIncomingTimestamp', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should handle empty string', () => {
        expect(normalizeIncomingTimestamp('')).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle Unix timestamp in seconds', () => {
        expect(normalizeIncomingTimestamp('1704067200')).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle Unix timestamp in milliseconds', () => {
        expect(normalizeIncomingTimestamp('1704067200000')).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle ISO date string', () => {
        expect(normalizeIncomingTimestamp('2024-01-01T00:00:00Z')).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle invalid date string', () => {
        expect(normalizeIncomingTimestamp('invalid-date')).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should use current time for invalid input', () => {
        const result = normalizeIncomingTimestamp('not-a-date');
        expect(result).toBe('2024-01-01T00:00:00.000Z');
      });
    });

    describe('classifyWecomEvent', () => {
      it('should return default values when no event', () => {
        const result = classifyWecomEvent();
        expect(result).toEqual({
          eventCategory: undefined,
          eventAction: undefined,
          lifecycleStatus: 'message_received'
        });
      });

      it('should classify external contact events', () => {
        const result = classifyWecomEvent('change_external_contact', 'add_external_contact');
        expect(result.eventCategory).toBe('external_contact');
        expect(result.eventAction).toBe('add_external_contact');
        expect(result.lifecycleStatus).toBe('contact_changed');
      });

      it('should classify external contact del events', () => {
        const result = classifyWecomEvent('change_external_contact', 'del_external_contact');
        expect(result.eventCategory).toBe('external_contact');
        expect(result.lifecycleStatus).toBe('contact_lost');
      });

      it('should classify external chat events', () => {
        const result = classifyWecomEvent('change_external_chat', 'create');
        expect(result.eventCategory).toBe('external_chat');
        expect(result.eventAction).toBe('create');
        expect(result.lifecycleStatus).toBe('group_changed');
      });

      it('should classify enter agent events', () => {
        const result = classifyWecomEvent('enter_agent');
        expect(result.eventCategory).toBe('agent');
        expect(result.eventAction).toBe('enter_agent');
        expect(result.lifecycleStatus).toBe('welcome_pending');
      });

      it('should classify batch job events', () => {
        const result = classifyWecomEvent('batch_job_result');
        expect(result.eventCategory).toBe('batch_job');
        expect(result.eventAction).toBe('batch_job_result');
        expect(result.lifecycleStatus).toBe('async_job_finished');
      });

      it('should handle unknown events', () => {
        const result = classifyWecomEvent('unknown_event');
        expect(result.eventCategory).toBe('unknown_event');
        expect(result.lifecycleStatus).toBe('event_received');
      });
    });
  });

  describe('verifyWecomCallback', () => {
    it('should return verification result with received fields', () => {
      const payload = {
        msg_signature: 'valid-signature',
        timestamp: '1234567890',
        nonce: 'nonce123',
        echostr: 'encrypted-echo'
      };

      mockVerifyWecomCallbackSignature.mockReturnValue({ verified: true, mode: 'real', echoStr: 'decrypted-echo' } as any);

      const result = verifyWecomCallback(payload);

      expect(result.verified).toBe(true);
      expect(result.received).toEqual({
        msgSignature: 'valid-signature',
        timestamp: '1234567890',
        nonce: 'nonce123'
      });
    });

    it('should return failure when signature verification fails', () => {
      const payload = {
        msg_signature: 'invalid-signature',
        timestamp: '1234567890',
        nonce: 'nonce123',
        echostr: 'encrypted-echo'
      };

      mockVerifyWecomCallbackSignature.mockImplementation(() => { throw new Error('signature failed'); });

      expect(() => verifyWecomCallback(payload)).toThrow();
    });
  });

  describe('normalizeWecomWebhookPayload', () => {
    it('should process plain JSON payload', () => {
      const payload = {
        MsgId: 'msg123',
        FromUserName: 'user1',
        MsgType: 'text',
        Content: 'Hello',
        CreateTime: '1704067200'
      };

      const result = normalizeWecomWebhookPayload(payload);

      expect(result.msgid).toBe('msg123');
      expect(result.content).toBe('Hello');
      expect(result.msgtype).toBe('text');
      expect(result.sender).toBe('user1');
    });

    it('should process plain JSON body payload', () => {
      const payload = {
        MsgId: 'msg123',
        FromUserName: 'user',
        MsgType: 'text',
        Content: 'Hello',
        CreateTime: '1234567890'
      };

      const result = normalizeWecomWebhookPayload(payload);
      expect(result).toBeDefined();
      expect(result.msgid).toBe('msg123');
    });

    it('should process encrypted payload', () => {
      const parsedXml = {
        MsgId: 'msg123', FromUserName: 'user', MsgType: 'text', Content: 'Hello',
        CreateTime: '1234567890', ToUserName: 'corp', AgentID: 'agent1',
        ChatId: '', ChatType: '', ChatName: '', SenderName: '', ExternalUserID: '',
        Event: '', ChangeType: '', WelcomeCode: '', UpdateTime: '', UserID: '',
        State: '', FailReason: '', ChatStatus: '', JoinScene: '', MemChangeCnt: ''
      };

      mockVerifyWecomMsgSignature.mockReturnValue(true);
      mockDecryptWecomMessage.mockReturnValue('<xml>...</xml>');
      mockParseSimpleXml.mockReturnValue(parsedXml as any);

      const payload = {
        Encrypt: 'encrypted-content',
        msg_signature: 'valid-sig',
        timestamp: '1234567890',
        nonce: 'nonce123'
      };

      const result = normalizeWecomWebhookPayload(payload);
      expect(result.msgid).toBe('msg123');
      expect(result.content).toBe('Hello');
    });

    it('should throw AppError when encrypted payload has invalid signature', () => {
      mockVerifyWecomMsgSignature.mockReturnValue(false);

      const payload = {
        Encrypt: 'encrypted-content',
        msg_signature: 'bad-sig',
        timestamp: '1234567890',
        nonce: 'nonce123'
      };

      expect(() => normalizeWecomWebhookPayload(payload)).toThrow(AppError);
    });

    it('should throw AppError when encrypted payload missing signature params', () => {
      const payload = {
        Encrypt: 'encrypted-content'
        // missing msg_signature, timestamp, nonce
      };

      expect(() => normalizeWecomWebhookPayload(payload)).toThrow(AppError);
    });

    it('should handle event messages', () => {
      const payload = {
        MsgId: 'msg789',
        FromUserName: 'user1',
        MsgType: 'event',
        Event: 'change_external_contact',
        ChangeType: 'add_external_contact',
        WelcomeCode: 'welcome123',
        CreateTime: '1234567890'
      };

      const result = normalizeWecomWebhookPayload(payload);
      expect(result.msgtype).toBe('event');
      expect(result.event).toBe('change_external_contact');
      expect(result.changeType).toBe('add_external_contact');
      expect(result.welcomeCode).toBe('welcome123');
    });
  });
});
