import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { router } from '../../../routes.js';
import { aiModelService } from '../service/ai-model.service.js';

// Mock AI service
jest.mock('../service/ai-model.service.js');

// Mock auth guard to bypass authentication in tests
jest.mock('../../../shared/middleware/auth.guard.js', () => ({
  authGuard: jest.fn((req: any, res: any, next: any) => next())
}));

// Mock database
jest.mock('../../../infra/db/pg.js', () => ({
  db: {
    query: jest.fn()
  }
}));

// Import the mocked db
import { db } from '../../../infra/db/pg.js';
const mockDb = db as any;

const mockAiModelService = aiModelService as any;

describe('Business Routing API Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create new express app for each test
    app = express();
    app.use(express.json());
    app.use(router);
  });

  describe('POST /api/v1/business-routing/messages/process', () => {
    it('should process message with business routing successfully', async () => {
      // Arrange
      const mockResult = {
        success: true,
        archiveUpdated: true,
        archiveType: 'member' as const,
        targetId: 'customer-123',
        analysis: {
          understanding: {
            userQuestion: '血糖控制问题',
            userState: '担忧',
            newNeeds: ['血糖监测指导'],
            concerns: ['高血糖'],
            risks: ['糖尿病并发症'],
            informationWorthy: ['当前用药']
          },
          extraction: {
            basicInfoUpdates: { medicalCondition: '糖尿病' },
            newRequirements: ['用药调整'],
            keyStateChanges: ['空腹血糖偏高'],
            riskPoints: ['高血糖风险'],
            followupItems: ['监测血糖']
          },
          confidence: 0.85
        }
      };

      mockAiModelService.processMessageWithBusinessRouting.mockResolvedValue(mockResult);

      const requestBody = {
        messageId: 'test-message-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/messages/process')
        .send(requestBody)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(mockAiModelService.processMessageWithBusinessRouting).toHaveBeenCalledWith('test-message-123');
    });

    it('should return 400 when messageId is missing', async () => {
      // Arrange
      const requestBody = {};

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/messages/process')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      // Error response structure depends on Express error handling
      // For now, just verify the status code
    });

    it('should return 500 when AI service fails', async () => {
      // Arrange
      mockAiModelService.processMessageWithBusinessRouting.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const requestBody = {
        messageId: 'test-message-123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/messages/process')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(500);
      // Error response structure depends on Express error handling
      // For now, just verify the status code
    });
  });

  describe('POST /api/v1/business-routing/conversations/process', () => {
    it('should process conversation successfully', async () => {
      // Arrange
      const mockMessages = [
        {
          message_id: 'msg1',
          sender_id: 'user1',
          sender_role: 'customer',
          content_text: '血糖问题',
          sent_at: '2024-01-01T00:00:00Z',
          chat_type: 'group'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages });

      const mockGroupResult = {
        archiveUpdated: false,
        archiveType: 'member' as const,
        analysis: {
          understanding: {},
          extraction: {},
          confidence: 0.8
        }
      };

      mockAiModelService.processGroupMessageForCustomerService.mockResolvedValue(mockGroupResult);

      const requestBody = {
        conversationId: 'conv-123',
        messageLimit: 10
      };

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/conversations/process')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.conversationId).toBe('conv-123');
      expect(response.body.data.totalMessages).toBe(1);
      expect(response.body.data.processedMessages).toBe(1);
      expect(response.body.data.groupCustomerServiceMessages).toBe(1);
    });

    it('should handle empty conversation gracefully', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [] });

      const requestBody = {
        conversationId: 'empty-conv'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/conversations/process')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.totalMessages).toBe(0);
      expect(response.body.data.processedMessages).toBe(0);
      expect(response.body.data.processingSummary).toContain('No messages found');
    });
  });

  describe('POST /api/v1/business-routing/messages/process-with-handler', () => {
    it('should process message with specific handler successfully', async () => {
      // Arrange
      const mockMessage = {
        message_id: 'test-msg',
        conversation_id: 'conv-1',
        sender_id: 'customer-123',
        sender_role: 'customer',
        content_text: '血糖控制问题',
        sent_at: '2024-01-01T00:00:00Z'
      };

      const mockContext = [
        { sender_role: 'customer', content_text: 'Previous message', sent_at: '2024-01-01T00:00:00Z' }
      ];

      mockAiModelService.getMessageDetails.mockResolvedValue(mockMessage);
      mockAiModelService.getConversationContext.mockResolvedValue(mockContext);

      const mockResult = {
        archiveUpdated: true,
        archiveType: 'member' as const,
        targetId: 'customer-123',
        analysis: {
          understanding: {},
          extraction: {},
          confidence: 0.9
        }
      };

      mockAiModelService.processGroupMessageForCustomerService.mockResolvedValue(mockResult);

      const requestBody = {
        messageId: 'test-msg',
        handlerType: 'group-customer-service'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/messages/process-with-handler')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.handlerType).toBe('group-customer-service');
      expect(response.body.data.archiveUpdated).toBe(true);
    });

    it('should return 404 when message not found', async () => {
      // Arrange
      mockAiModelService.getMessageDetails.mockResolvedValue(null);

      const requestBody = {
        messageId: 'non-existent',
        handlerType: 'group-customer-service'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/business-routing/messages/process-with-handler')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(404);
      // Error response structure depends on Express error handling
      // For now, just verify the status code
    });
  });

  describe('GET /api/v1/business-routing/messages/:messageId/result', () => {
    it('should return message processing result', async () => {
      // Arrange
      const messageId = 'test-message-123';

      // Act
      const response = await request(app)
        .get(`/api/v1/business-routing/messages/${messageId}/result`)
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messageId).toBe(messageId);
      expect(response.body.data.processed).toBe(false);
      expect(response.body.data.processingStatus).toBe('not_processed');
    });
  });
});