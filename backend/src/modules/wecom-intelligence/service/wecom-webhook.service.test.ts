import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  verifyWecomWebhook,
  receiveWecomWebhook,
  normalizeChatType,
  normalizeIncomingTimestamp,
  classifyWecomEvent
} from './wecom-webhook.service.js';
import {
  decryptWecomMessage,
  verifyWecomCallbackSignature,
  verifyWecomMsgSignature
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

const mockCryptoService = {
  decryptWecomMessage,
  verifyWecomCallbackSignature,
  verifyWecomMsgSignature
} as any;

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
        expect(result.eventAction).toBe('added');
        expect(result.lifecycleStatus).toBe('external_contact_added');
      });

      it('should classify external chat events', () => {
        const result = classifyWecomEvent('change_external_chat', 'create');
        expect(result.eventCategory).toBe('external_chat');
        expect(result.eventAction).toBe('created');
        expect(result.lifecycleStatus).toBe('external_chat_created');
      });

      it('should classify enter app events', () => {
        const result = classifyWecomEvent('enter_agent');
        expect(result.eventCategory).toBe('enter_app');
        expect(result.eventAction).toBe('entered');
        expect(result.lifecycleStatus).toBe('enter_app_event');
      });

      it('should classify batch job events', () => {
        const result = classifyWecomEvent('batch_job_result');
        expect(result.eventCategory).toBe('batch_job');
        expect(result.eventAction).toBe('result');
        expect(result.lifecycleStatus).toBe('batch_job_result');
      });

      it('should handle unknown events', () => {
        const result = classifyWecomEvent('unknown_event');
        expect(result.eventCategory).toBe('unknown');
        expect(result.eventAction).toBe('unknown');
        expect(result.lifecycleStatus).toBe('unknown_event');
      });
    });
  });

  describe('verifyWecomWebhook', () => {
    it('should verify webhook successfully with valid signature', async () => {
      const payload = {
        msg_signature: 'valid-signature',
        timestamp: '1234567890',
        nonce: 'nonce123',
        echostr: 'encrypted-echo'
      };

      mockCryptoService.verifyWecomCallbackSignature.mockReturnValue(true);
      mockCryptoService.decryptWecomMessage.mockReturnValue('decrypted-echo');

      const result = await verifyWecomWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.plainText).toBe('decrypted-echo');
      expect(mockCryptoService.verifyWecomCallbackSignature).toHaveBeenCalledWith(
        'test-token',
        '1234567890',
        'nonce123',
        'valid-signature',
        'encrypted-echo'
      );
      expect(mockCryptoService.decryptWecomMessage).toHaveBeenCalledWith(
        'encrypted-echo',
        'test-aes-key',
        'test-corp-id'
      );
    });

    it('should throw error when signature verification fails', async () => {
      const payload = {
        msg_signature: 'invalid-signature',
        timestamp: '1234567890',
        nonce: 'nonce123',
        echostr: 'encrypted-echo'
      };

      mockCryptoService.verifyWecomCallbackSignature.mockReturnValue(false);

      await expect(verifyWecomWebhook(payload)).rejects.toThrow(AppError);
      await expect(verifyWecomWebhook(payload)).rejects.toThrow('Invalid signature');
    });

    it('should throw error when required fields are missing', async () => {
      await expect(verifyWecomWebhook({})).rejects.toThrow(AppError);
      await expect(verifyWecomWebhook({})).rejects.toThrow('Missing required parameters');

      await expect(verifyWecomWebhook({
        msg_signature: 'sig',
        timestamp: '123',
        nonce: 'nonce'
        // missing echostr
      })).rejects.toThrow(AppError);
    });
  });

  describe('receiveWecomWebhook', () => {
    const mockPayload = {
      msg_signature: 'valid-signature',
      timestamp: '1234567890',
      nonce: 'nonce123',
      body: '<xml><ToUserName>corp</ToUserName><FromUserName>user</FromUserName><CreateTime>1234567890</CreateTime><MsgType>text</MsgType><Content>Hello</Content><MsgId>msg123</MsgId><AgentID>agent1</AgentID></xml>'
    };

    beforeEach(() => {
      mockCryptoService.verifyWecomMsgSignature.mockReturnValue(true);
      mockCryptoService.decryptWecomMessage.mockImplementation((encrypted) =>
        encrypted === 'encrypted-xml' ? mockPayload.body : 'decrypted-content'
      );
    });

    it('should receive and process webhook message successfully', async () => {
      const result = await receiveWecomWebhook(mockPayload, {});

      expect(result.success).toBe(true);
      expect(result.plainText).toBe('');
      expect(result.normalizedPayload).toBeDefined();
      expect(result.normalizedPayload?.msgid).toBe('msg123');
      expect(result.normalizedPayload?.content).toBe('Hello');
      expect(result.normalizedPayload?.msgtype).toBe('text');
    });

    it('should throw error when signature verification fails', async () => {
      mockCryptoService.verifyWecomMsgSignature.mockReturnValue(false);

      await expect(receiveWecomWebhook(mockPayload, {})).rejects.toThrow(AppError);
      await expect(receiveWecomWebhook(mockPayload, {})).rejects.toThrow('Invalid signature');
    });

    it('should handle different message types', async () => {
      const imagePayload = {
        ...mockPayload,
        body: '<xml><ToUserName>corp</ToUserName><FromUserName>user</FromUserName><CreateTime>1234567890</CreateTime><MsgType>image</MsgType><PicUrl>http://example.com/image.jpg</PicUrl><MsgId>msg456</MsgId><AgentID>agent1</AgentID></xml>'
      };

      const result = await receiveWecomWebhook(imagePayload, {});

      expect(result.success).toBe(true);
      expect(result.normalizedPayload?.msgtype).toBe('image');
      expect(result.normalizedPayload?.content).toBe('http://example.com/image.jpg');
    });

    it('should handle event messages', async () => {
      const eventPayload = {
        ...mockPayload,
        body: '<xml><ToUserName>corp</ToUserName><FromUserName>user</FromUserName><CreateTime>1234567890</CreateTime><MsgType>event</MsgType><Event>change_external_contact</Event><ChangeType>add_external_contact</ChangeType><WelcomeCode>welcome123</WelcomeCode><MsgId>msg789</MsgId><AgentID>agent1</AgentID></xml>'
      };

      const result = await receiveWecomWebhook(eventPayload, {});

      expect(result.success).toBe(true);
      expect(result.normalizedPayload?.msgtype).toBe('event');
      expect(result.normalizedPayload?.event).toBe('change_external_contact');
      expect(result.normalizedPayload?.changeType).toBe('add_external_contact');
      expect(result.normalizedPayload?.welcomeCode).toBe('welcome123');
    });

    it('should handle missing required fields', async () => {
      const invalidPayload = {
        ...mockPayload,
        body: '<xml><ToUserName>corp</ToUserName></xml>' // Missing required fields
      };

      await expect(receiveWecomWebhook(invalidPayload, {})).rejects.toThrow(AppError);
    });

    it('should handle XML parsing errors', async () => {
      const invalidXmlPayload = {
        ...mockPayload,
        body: 'invalid-xml'
      };

      mockCryptoService.decryptWecomMessage.mockReturnValue('invalid-xml');

      await expect(receiveWecomWebhook(invalidXmlPayload, {})).rejects.toThrow(AppError);
      await expect(receiveWecomWebhook(invalidXmlPayload, {})).rejects.toThrow('Failed to parse XML');
    });
  });
});