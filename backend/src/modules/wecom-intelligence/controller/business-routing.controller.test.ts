import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { processMessageWithBusinessRouting, processConversationWithBusinessRouting, processMessageWithSpecificHandler, getMessageBusinessProcessingResult } from './business-routing.controller.js';
import { aiModelService } from '../service/ai-model.service.js';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';

// Mock dependencies
jest.mock('../service/ai-model.service.js');
jest.mock('../../../infra/db/pg.js');

const mockAiModelService = aiModelService as any;
const mockDb = db as any;

describe('Business Routing Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessageWithBusinessRouting', () => {
    it('should process message successfully', async () => {
      const mockResult = {
        success: true,
        archiveUpdated: false,
        analysis: {
          understanding: { userQuestion: 'test' },
          extraction: { basicInfoUpdates: {} },
          confidence: 0.8
        }
      };

      mockAiModelService.processMessageWithBusinessRouting.mockResolvedValue(mockResult);

      const result = await processMessageWithBusinessRouting({ messageId: 'test-message-id' });

      expect(result).toEqual(mockResult);
      expect(mockAiModelService.processMessageWithBusinessRouting).toHaveBeenCalledWith('test-message-id');
    });

    it('should throw error when messageId is missing', async () => {
      await expect(processMessageWithBusinessRouting({ messageId: '' }))
        .rejects
        .toThrow('缺少必要字段：messageId');
    });

    it('should update metrics on failure', async () => {
      mockAiModelService.processMessageWithBusinessRouting.mockRejectedValue(new Error('AI service error'));

      await expect(processMessageWithBusinessRouting({ messageId: 'test-message-id' }))
        .rejects
        .toThrow('AI service error');

      // Metrics should be updated (though we can't directly test the internal metrics)
    });
  });

  describe('processConversationWithBusinessRouting', () => {
    it('should process conversation with messages', async () => {
      const mockMessages = [
        {
          message_id: 'msg1',
          sender_id: 'user1',
          sender_role: 'customer',
          content_text: 'Hello',
          sent_at: '2024-01-01T00:00:00Z',
          chat_type: 'group'
        },
        {
          message_id: 'msg2',
          sender_id: 'user2',
          sender_role: 'customer',
          content_text: 'Hi',
          sent_at: '2024-01-01T00:01:00Z',
          chat_type: 'single'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages } as any);

      const mockGroupResult = {
        archiveUpdated: false,
        archiveType: 'member' as const,
        analysis: { understanding: {}, extraction: {}, confidence: 0.8 }
      };

      const mockPrivateResult = {
        archiveUpdated: true,
        archiveType: 'patient' as const,
        analysis: { understanding: {}, extraction: {}, confidence: 0.9 }
      };

      mockAiModelService.processGroupMessageForCustomerService.mockResolvedValue(mockGroupResult);
      mockAiModelService.processPrivateMessageForMedicalAssistant.mockResolvedValue(mockPrivateResult);

      const result = await processConversationWithBusinessRouting({
        conversationId: 'conv1',
        messageLimit: 10
      });

      expect(result.success).toBe(true);
      expect(result.totalMessages).toBe(2);
      expect(result.processedMessages).toBe(2);
      expect(result.groupCustomerServiceMessages).toBe(1);
      expect(result.medicalAssistantMessages).toBe(1);
      expect(result.memberArchivesUpdated).toBe(0);
      expect(result.patientProfilesUpdated).toBe(1);
      expect(result.processingErrors).toBeUndefined();
    });

    it('should handle empty conversation', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await processConversationWithBusinessRouting({
        conversationId: 'empty-conv'
      });

      expect(result.success).toBe(true);
      expect(result.totalMessages).toBe(0);
      expect(result.processedMessages).toBe(0);
      expect(result.processingSummary).toContain('No messages found');
    });

    it('should handle processing errors gracefully', async () => {
      const mockMessages = [
        {
          message_id: 'msg1',
          sender_id: 'user1',
          sender_role: 'customer',
          content_text: 'Hello',
          sent_at: '2024-01-01T00:00:00Z',
          chat_type: 'group'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages } as any);
      mockAiModelService.processGroupMessageForCustomerService.mockRejectedValue(new Error('Processing failed'));

      const result = await processConversationWithBusinessRouting({
        conversationId: 'conv-with-error'
      });

      expect(result.success).toBe(false);
      expect(result.processingErrors).toHaveLength(1);
      expect(result.processingErrors![0].messageId).toBe('msg1');
    });
  });

  describe('processMessageWithSpecificHandler', () => {
    it('should process message with group-customer-service handler', async () => {
      const mockMessage = {
        message_id: 'test-msg',
        conversation_id: 'conv1',
        sender_id: 'user1',
        sender_role: 'customer',
        content_text: 'Hello',
        sent_at: '2024-01-01T00:00:00Z'
      };

      const mockContext = [
        { sender_role: 'customer', content_text: 'Previous', sent_at: '2024-01-01T00:00:00Z' }
      ];

      mockAiModelService.getMessageDetails.mockResolvedValue(mockMessage);
      mockAiModelService.getConversationContext.mockResolvedValue(mockContext);

      const mockResult = {
        archiveUpdated: true,
        archiveType: 'member' as const,
        targetId: 'user1',
        analysis: {
          understanding: { userQuestion: 'test' },
          extraction: { basicInfoUpdates: {} },
          confidence: 0.8
        }
      };

      mockAiModelService.processGroupMessageForCustomerService.mockResolvedValue(mockResult);

      const result = await processMessageWithSpecificHandler({
        messageId: 'test-msg',
        handlerType: 'group-customer-service'
      });

      expect(result.success).toBe(true);
      expect(result.handlerType).toBe('group-customer-service');
      expect(result.archiveUpdated).toBe(true);
      expect(result.archiveType).toBe('member');
    });

    it('should throw error when message not found', async () => {
      mockAiModelService.getMessageDetails.mockResolvedValue(null);

      await expect(processMessageWithSpecificHandler({
        messageId: 'non-existent',
        handlerType: 'group-customer-service'
      })).rejects.toThrow('消息 non-existent 不存在');
    });
  });

  describe('getMessageBusinessProcessingResult', () => {
    it('should return processing result', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await getMessageBusinessProcessingResult({
        messageId: 'test-msg'
      });

      expect(result.messageId).toBe('test-msg');
      expect(result.processed).toBe(false);
      expect(result.processingStatus).toBe('not_processed');
    });
  });
});