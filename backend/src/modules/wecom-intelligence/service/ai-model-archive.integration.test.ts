import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { analyzeMessageAndUpdateArchive } from '../../archive/service/archive.service.js';
import { aiModelService } from './ai-model.service.js';
import type { MemberArchiveRecord } from '../../archive/service/archive.service.js';
import * as archiveService from '../../archive/service/archive.service.js';


// Mock dependencies
jest.mock('./ai-model.service.js', () => {
  const original = jest.requireActual('./ai-model.service.js') as any;
  return {
    ...original,
    aiModelService: {
      ...original.aiModelService,
      analyzeMessage: jest.fn()
    }
  };
});


describe('AI Model and Archive Integration', () => {
  let upsertMemberArchiveServiceMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the upsertMemberArchiveService function
    upsertMemberArchiveServiceMock = jest.spyOn(archiveService, 'upsertMemberArchiveService')
      .mockImplementation((userId: string, payload: Record<string, unknown>, operatorId?: string) =>
        Promise.resolve({
          id: 'mock-id',
          userId,
          conversationId: null,
          basicInfo: null,
          preferences: null,
          coreProblem: null,
          communicationSummary: null,
          followupFocus: null,
          personaSummary: null,
          recentIssueSummary: null,
          followupPlan: null,
          sourceConversations: null,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        } as MemberArchiveRecord)
      );
  });

  describe('analyzeMessageAndUpdateArchive', () => {
    it('should analyze customer message and update member archive', async () => {
      // Arrange
      const messageInput = {
        messageId: 'test-message-1',
        conversationId: 'conv-1',
        senderId: 'customer-123',
        senderRole: 'customer',
        content: '我有糖尿病，最近血糖控制不好，早上空腹血糖8.5，需要调整用药吗？',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const mockAnalysisResult = {
        messageId: 'test-message-1',
        conversationId: 'conv-1',
        senderId: 'customer-123',
        understanding: {
          userQuestion: '血糖控制不好需要调整用药吗？',
          userState: '担忧血糖控制',
          newNeeds: ['血糖监测指导', '用药调整建议'],
          concerns: ['空腹血糖偏高'],
          risks: ['高血糖风险'],
          informationWorthy: ['当前用药方案', '饮食运动情况']
        },
        extraction: {
          basicInfoUpdates: {
            medicalCondition: '糖尿病',
            recentIssue: '血糖控制不好'
          },
          newRequirements: ['需要用药调整建议'],
          keyStateChanges: ['空腹血糖8.5偏高'],
          riskPoints: ['高血糖风险'],
          followupItems: ['调整用药方案', '加强血糖监测']
        },
        archiveUpdates: {
          memberArchiveUpdates: {
            basicInfo: '糖尿病患者，近期血糖控制不佳',
            coreProblem: '空腹血糖偏高（8.5），需要用药调整',
            recentIssueSummary: '早上空腹血糖8.5，血糖控制不稳定'
          },
          patientArchiveUpdates: {}
        },
        confidence: 0.85,
        analysisTimestamp: '2024-01-01T10:00:00Z'
      };

      const mockUpdatedArchive = {
        id: 'archive-123',
        userId: 'customer-123',
        conversationId: 'conv-1',
        basicInfo: '糖尿病患者，近期血糖控制不佳',
        preferences: null,
        coreProblem: '空腹血糖偏高（8.5），需要用药调整',
        communicationSummary: null,
        followupFocus: null,
        personaSummary: null,
        recentIssueSummary: '早上空腹血糖8.5，血糖控制不稳定',
        followupPlan: null,
        sourceConversations: null,
        updatedAt: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T09:00:00Z'
      };

      // Mock AI service response
      (aiModelService.analyzeMessage as any).mockResolvedValue(mockAnalysisResult);

      // Mock archive service response
      upsertMemberArchiveServiceMock.mockResolvedValue(mockUpdatedArchive);

      // Act
      const result = await analyzeMessageAndUpdateArchive(messageInput);

      // Assert
      expect(aiModelService.analyzeMessage as any).toHaveBeenCalledWith(messageInput);
      expect(upsertMemberArchiveServiceMock).toHaveBeenCalledWith(
        'customer-123',
        {
          basicInfo: '糖尿病患者，近期血糖控制不佳',
          coreProblem: '空腹血糖偏高（8.5），需要用药调整',
          recentIssueSummary: '早上空腹血糖8.5，血糖控制不稳定'
        },
        'ai-system'
      );
      expect(result.analysis).toEqual(mockAnalysisResult);
      expect(result.archiveUpdated).toBe(true);
      expect(result.updatedArchive).toEqual(mockUpdatedArchive);
    });

    it('should not update archive for non-customer messages', async () => {
      // Arrange
      const messageInput = {
        messageId: 'test-message-2',
        conversationId: 'conv-1',
        senderId: 'doctor-456',
        senderRole: 'doctor',
        content: '建议您监测血糖一周，记录饮食和用药情况',
        timestamp: '2024-01-01T10:05:00Z'
      };

      const mockAnalysisResult = {
        messageId: 'test-message-2',
        conversationId: 'conv-1',
        senderId: 'doctor-456',
        understanding: {
          userQuestion: null,
          userState: '提供医疗建议',
          newNeeds: [],
          concerns: [],
          risks: [],
          informationWorthy: []
        },
        extraction: {
          basicInfoUpdates: {},
          newRequirements: [],
          keyStateChanges: [],
          riskPoints: [],
          followupItems: ['监测血糖', '记录饮食用药']
        },
        archiveUpdates: {
          memberArchiveUpdates: {},
          patientArchiveUpdates: {}
        },
        confidence: 0.9,
        analysisTimestamp: '2024-01-01T10:05:00Z'
      };

      (aiModelService.analyzeMessage as any).mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await analyzeMessageAndUpdateArchive(messageInput);

      // Assert
      expect(aiModelService.analyzeMessage as any).toHaveBeenCalledWith(messageInput);
      expect(upsertMemberArchiveServiceMock).not.toHaveBeenCalled();
      expect(result.analysis).toEqual(mockAnalysisResult);
      expect(result.archiveUpdated).toBe(false);
      expect(result.updatedArchive).toBeUndefined();
    });

    it('should handle empty archive updates gracefully', async () => {
      // Arrange
      const messageInput = {
        messageId: 'test-message-3',
        conversationId: 'conv-1',
        senderId: 'customer-123',
        senderRole: 'customer',
        content: '你好，今天天气不错',
        timestamp: '2024-01-01T10:10:00Z'
      };

      const mockAnalysisResult = {
        messageId: 'test-message-3',
        conversationId: 'conv-1',
        senderId: 'customer-123',
        understanding: {
          userQuestion: null,
          userState: '日常问候',
          newNeeds: [],
          concerns: [],
          risks: [],
          informationWorthy: []
        },
        extraction: {
          basicInfoUpdates: {},
          newRequirements: [],
          keyStateChanges: [],
          riskPoints: [],
          followupItems: []
        },
        archiveUpdates: {
          memberArchiveUpdates: {}, // Empty updates
          patientArchiveUpdates: {}
        },
        confidence: 0.7,
        analysisTimestamp: '2024-01-01T10:10:00Z'
      };

      (aiModelService.analyzeMessage as any).mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await analyzeMessageAndUpdateArchive(messageInput);

      // Assert
      expect(aiModelService.analyzeMessage as any).toHaveBeenCalledWith(messageInput);
      expect(upsertMemberArchiveServiceMock).not.toHaveBeenCalled();
      expect(result.archiveUpdated).toBe(false);
    });

    it('should handle archive update errors gracefully', async () => {
      // Arrange
      const messageInput = {
        messageId: 'test-message-4',
        conversationId: 'conv-1',
        senderId: 'customer-123',
        senderRole: 'customer',
        content: '我最近血压有点高，150/95',
        timestamp: '2024-01-01T10:15:00Z'
      };

      const mockAnalysisResult = {
        messageId: 'test-message-4',
        conversationId: 'conv-1',
        senderId: 'customer-123',
        understanding: {
          userQuestion: null,
          userState: '报告血压问题',
          newNeeds: ['血压管理建议'],
          concerns: ['高血压'],
          risks: ['心血管风险'],
          informationWorthy: ['当前血压值', '用药情况']
        },
        extraction: {
          basicInfoUpdates: {
            medicalCondition: '高血压'
          },
          newRequirements: ['血压管理'],
          keyStateChanges: ['血压150/95偏高'],
          riskPoints: ['心血管风险'],
          followupItems: ['监测血压', '调整治疗方案']
        },
        archiveUpdates: {
          memberArchiveUpdates: {
            coreProblem: '血压偏高（150/95）',
            recentIssueSummary: '近期血压偏高，150/95'
          },
          patientArchiveUpdates: {}
        },
        confidence: 0.8,
        analysisTimestamp: '2024-01-01T10:15:00Z'
      };

      (aiModelService.analyzeMessage as any).mockResolvedValue(mockAnalysisResult);
      upsertMemberArchiveServiceMock.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(analyzeMessageAndUpdateArchive(messageInput))
        .rejects
        .toThrow('Database connection failed');

      expect(aiModelService.analyzeMessage as any).toHaveBeenCalledWith(messageInput);
      expect(upsertMemberArchiveServiceMock).toHaveBeenCalled();
    });
  });
});