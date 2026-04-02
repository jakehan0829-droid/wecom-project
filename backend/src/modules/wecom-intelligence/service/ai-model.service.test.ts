import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { aiModelService, AIModelService } from './ai-model.service.js';
import type { MessageAnalysisInput, ArchiveAnalysisInput } from './ai-model.service.js';
import * as archiveService from '../../archive/service/archive.service.js';
import * as patientMappingService from './patient-mapping.service.js';
import { db } from '../../../infra/db/pg.js';

// Mock dependencies
jest.mock('../../../infra/db/pg.js', () => {
  const mockQuery = jest.fn();
  return {
    db: {
      query: mockQuery
    }
  };
});
jest.mock('../../archive/service/archive.service.js');
jest.mock('./patient-mapping.service.js');
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

// Mock environment variables
const originalEnv = process.env;

describe('AIModelService', () => {
  let service: AIModelService;
  let mockDb: jest.Mocked<typeof db>;
  let mockArchiveService: jest.Mocked<typeof archiveService>;
  let mockPatientMappingService: jest.Mocked<typeof patientMappingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };

    // Setup mocks
    mockDb = db as jest.Mocked<typeof db>;
    mockArchiveService = archiveService as jest.Mocked<typeof archiveService>;
    mockPatientMappingService = patientMappingService as jest.Mocked<typeof patientMappingService>;

    // Default env setup for mock provider
    process.env.AI_PROVIDER = 'mock';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create service with mock provider by default', () => {
      service = new AIModelService();
      expect(service).toBeDefined();
      // Note: private config property, we'll test through public methods
    });

    it('should create service with openai provider when configured', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_API_KEY = 'test-api-key';

      service = new AIModelService();
      expect(service).toBeDefined();
    });

    it('should map openai-codex provider to openai', () => {
      process.env.AI_PROVIDER = 'openai-codex';
      process.env.AI_API_KEY = 'test-key';

      service = new AIModelService();
      expect(service).toBeDefined();
    });

    it('should accept custom config', () => {
      service = new AIModelService({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'custom-key'
      });
      expect(service).toBeDefined();
    });
  });

  describe('analyzeMessage', () => {
    const mockMessageInput: MessageAnalysisInput = {
      messageId: 'msg-123',
      conversationId: 'conv-456',
      senderId: 'user-789',
      senderRole: 'customer',
      content: '我有糖尿病，血糖控制不好',
      timestamp: '2024-01-01T10:00:00Z',
      conversationContext: []
    };

    beforeEach(() => {
      service = new AIModelService();
    });

    it('should return mock analysis when provider is mock', async () => {
      process.env.AI_PROVIDER = 'mock';
      service = new AIModelService();

      const result = await service.analyzeMessage(mockMessageInput);

      expect(result).toBeDefined();
      expect(result.messageId).toBe(mockMessageInput.messageId);
      expect(result.conversationId).toBe(mockMessageInput.conversationId);
      expect(result.senderId).toBe(mockMessageInput.senderId);
      expect(result.understanding).toBeDefined();
      expect(result.extraction).toBeDefined();
      expect(result.archiveUpdates).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.analysisTimestamp).toBeDefined();
    });

    it('should include conversation context in mock analysis', async () => {
      const inputWithContext: MessageAnalysisInput = {
        ...mockMessageInput,
        conversationContext: [
          {
            senderRole: 'customer',
            content: '我之前血糖正常',
            timestamp: '2024-01-01T09:50:00Z'
          },
          {
            senderRole: 'doctor',
            content: '请描述一下具体情况',
            timestamp: '2024-01-01T09:55:00Z'
          }
        ]
      };

      const result = await service.analyzeMessage(inputWithContext);

      expect(result).toBeDefined();
      // Context should influence the analysis
      expect(result.understanding.userState).toBeDefined();
    });

    it('should throw error for unimplemented provider', async () => {
      process.env.AI_PROVIDER = 'anthropic';
      service = new AIModelService();

      await expect(service.analyzeMessage(mockMessageInput))
        .rejects
        .toThrow('AI provider anthropic not yet implemented');
    });

    it('should handle openai provider when api key is missing', async () => {
      process.env.AI_PROVIDER = 'openai';
      delete process.env.AI_API_KEY;
      service = new AIModelService();

      // This will throw when trying to analyze, but constructor should work
      expect(service).toBeDefined();
      // The actual error will come from analyzeMessage
      await expect(service.analyzeMessage(mockMessageInput))
        .rejects
        .toThrow('OpenAI client not initialized');
    });
  });

  describe('analyzeArchive', () => {
    const mockArchiveInput: ArchiveAnalysisInput = {
      archiveType: 'member',
      archiveId: 'archive-123',
      currentArchive: {
        basicInfo: '糖尿病患者',
        coreProblem: '血糖控制不稳定'
      },
      recentConversations: []
    };

    beforeEach(() => {
      process.env.AI_PROVIDER = 'mock';
      service = new AIModelService();
    });

    it('should return mock archive analysis', async () => {
      const result = await service.analyzeArchive(mockArchiveInput);

      expect(result).toBeDefined();
      expect(result.archiveType).toBe(mockArchiveInput.archiveType);
      expect(result.archiveId).toBe(mockArchiveInput.archiveId);
      expect(result.improvements).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.analysisTimestamp).toBeDefined();
    });

    it('should process recent conversations in archive analysis', async () => {
      const inputWithConversations: ArchiveAnalysisInput = {
        ...mockArchiveInput,
        recentConversations: [
          {
            conversationId: 'conv-1',
            messages: [
              {
                senderRole: 'customer',
                content: '血糖控制不好',
                timestamp: '2024-01-01T10:00:00Z'
              },
              {
                senderRole: 'doctor',
                content: '建议监测血糖',
                timestamp: '2024-01-01T10:05:00Z'
              }
            ]
          }
        ]
      };

      const result = await service.analyzeArchive(inputWithConversations);

      expect(result).toBeDefined();
      // Recent conversations should influence the analysis
      expect(result.improvements).toBeDefined();
    });

    it('should throw error for unimplemented provider', async () => {
      process.env.AI_PROVIDER = 'anthropic';
      service = new AIModelService();

      await expect(service.analyzeArchive(mockArchiveInput))
        .rejects
        .toThrow('AI provider anthropic not yet implemented');
    });
  });

  describe('saveAnalysisResult', () => {
    beforeEach(() => {
      service = new AIModelService();
      // @ts-ignore: Mock implementation
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('should save analysis result to database', async () => {
      const mockAnalysis = {
        messageId: 'msg-123',
        conversationId: 'conv-456',
        senderId: 'user-789',
        understanding: {
          userQuestion: '如何控制血糖',
          userState: 'urgent',
          newNeeds: ['用药指导'],
          concerns: ['血糖偏高'],
          risks: ['糖尿病并发症'],
          informationWorthy: ['当前用药方案']
        },
        extraction: {
          basicInfoUpdates: { condition: '糖尿病' },
          newRequirements: ['用药调整'],
          keyStateChanges: ['血糖不稳定'],
          riskPoints: ['并发症风险'],
          followupItems: ['调整用药']
        },
        archiveUpdates: {
          memberArchiveUpdates: { basicInfo: '糖尿病患者' },
          patientArchiveUpdates: {}
        },
        confidence: 0.8,
        analysisTimestamp: '2024-01-01T10:00:00Z'
      };

      const analysisId = await service.saveAnalysisResult(mockAnalysis);

      expect(analysisId).toBeDefined();
      expect(mockDb.query).toHaveBeenCalled();

      // Check that the query contains the expected analysis data
      const queryCall = mockDb.query.mock.calls[0];
      expect(queryCall[0]).toContain('insert into wecom_event_state');
      expect(queryCall[1]).toHaveLength(5); // 5 parameters
      expect(queryCall[1][0]).toMatch(/^ai_analysis_/); // analysis ID
      expect(queryCall[1][1]).toBe(mockAnalysis.conversationId);
      expect(queryCall[1][2]).toBe(mockAnalysis.messageId);
      expect(queryCall[1][3]).toBe(mockAnalysis.senderId);

      // Check payload JSON structure
      const payload = JSON.parse(queryCall[1][4]);
      expect(payload.analysis).toBeDefined();
      expect(payload.analysis.understanding).toEqual(mockAnalysis.understanding);
      expect(payload.analysis.extraction).toEqual(mockAnalysis.extraction);
      expect(payload.analysis.confidence).toBe(mockAnalysis.confidence);
      expect(payload.analysis.archiveUpdates).toEqual(mockAnalysis.archiveUpdates);
    });
  });

  describe('generateConversationSummary', () => {
    beforeEach(() => {
      service = new AIModelService();
    });

    it('should return default summary for empty messages', async () => {
      const result = await service.generateConversationSummary('conv-123', []);

      expect(result).toEqual({
        summary: '暂无对话内容',
        keyTopics: [],
        customerSentiment: 'neutral'
      });
    });

    it('should generate summary for customer messages', async () => {
      const mockMessages = [
        { content_text: '我有糖尿病，血糖控制不好' },
        { content_text: '最近血糖值比较高' },
        { content_text: '需要用药指导' }
      ] as any[];

      const result = await service.generateConversationSummary('conv-123', mockMessages);

      expect(result).toBeDefined();
      expect(result.summary).toContain('对话包含');
      expect(result.keyTopics).toContain('血糖管理');
      expect(result.customerSentiment).toBeDefined();
      expect(result.messageCount).toBe(3);
    });

    it('should extract topics from messages', async () => {
      const mockMessages = [
        { content_text: '血糖高，血压也高' },
        { content_text: '需要饮食建议' }
      ] as any[];

      const result = await service.generateConversationSummary('conv-123', mockMessages);

      expect(result.keyTopics).toContain('血糖管理');
      expect(result.keyTopics).toContain('血压管理');
      expect(result.keyTopics).toContain('饮食咨询');
    });

    it('should assess sentiment correctly', async () => {
      const positiveMessages = [
        { content_text: '谢谢医生，帮助很大' },
        { content_text: '现在感觉好多了' }
      ] as any[];

      const negativeMessages = [
        { content_text: '非常糟糕，很不满意，问题严重' },
        { content_text: '困难很大，非常不满，担心后果' }
      ] as any[];

      const positiveResult = await service.generateConversationSummary('conv-1', positiveMessages);
      const negativeResult = await service.generateConversationSummary('conv-2', negativeMessages);

      expect(positiveResult.customerSentiment).toBe('positive');
      expect(negativeResult.customerSentiment).toBe('negative');
    });
  });

  describe('processGroupMessageForCustomerService', () => {
    const mockMessageInput: MessageAnalysisInput = {
      messageId: 'msg-group-123',
      conversationId: 'conv-group-456',
      senderId: 'user-group-789',
      senderRole: 'customer',
      content: '群聊消息：血糖控制不好需要帮助',
      timestamp: '2024-01-01T10:00:00Z'
    };

    beforeEach(() => {
      process.env.AI_PROVIDER = 'mock';
      service = new AIModelService();

      // Mock analyzeMessage to return specific result
      jest.spyOn(service as any, 'analyzeMessage').mockResolvedValue({
        messageId: 'msg-group-123',
        conversationId: 'conv-group-456',
        senderId: 'user-group-789',
        understanding: {
          userQuestion: '血糖控制不好需要帮助',
          userState: 'urgent',
          newNeeds: ['血糖指导'],
          concerns: ['血糖偏高'],
          risks: ['并发症'],
          informationWorthy: ['当前状态']
        },
        extraction: {
          basicInfoUpdates: { condition: '糖尿病' },
          newRequirements: ['血糖管理'],
          keyStateChanges: ['血糖不稳定'],
          riskPoints: ['高风险'],
          followupItems: ['监测血糖']
        },
        archiveUpdates: {
          memberArchiveUpdates: {
            basicInfo: '糖尿病患者',
            coreProblem: '血糖控制不好'
          },
          patientArchiveUpdates: {}
        },
        confidence: 0.8,
        analysisTimestamp: '2024-01-01T10:00:00Z'
      });

      // Mock saveAnalysisResult
      jest.spyOn(service as any, 'saveAnalysisResult').mockResolvedValue('analysis-id-123');

      // Mock archive service
      mockArchiveService.upsertMemberArchiveService.mockResolvedValue({
        id: 'archive-id-123',
        userId: 'user-group-789',
        conversationId: 'conv-group-456',
        basicInfo: '糖尿病患者',
        coreProblem: '血糖控制不好',
        preferences: null,
        communicationSummary: null,
        followupFocus: null,
        personaSummary: null,
        recentIssueSummary: null,
        followupPlan: null,
        sourceConversations: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as any);
    });

    it('should process group message and update member archive', async () => {
      const result = await service.processGroupMessageForCustomerService(mockMessageInput);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.archiveUpdated).toBe(true);
      expect(result.archiveType).toBe('member');
      expect(result.targetId).toBe(mockMessageInput.senderId);

      expect(mockArchiveService.upsertMemberArchiveService).toHaveBeenCalledWith(
        'user-group-789',
        expect.objectContaining({
          conversationId: 'conv-group-456',
          basicInfo: '糖尿病患者',
          coreProblem: '血糖控制不好'
        }),
        'ai-group-customer-service'
      );
    });

    it('should not update archive for non-customer messages', async () => {
      const doctorMessageInput: MessageAnalysisInput = {
        ...mockMessageInput,
        senderRole: 'doctor'
      };

      // Mock analyzeMessage for doctor
      (service as any).analyzeMessage.mockResolvedValue({
        ...(await (service as any).analyzeMessage()),
        archiveUpdates: {
          memberArchiveUpdates: {},
          patientArchiveUpdates: {}
        }
      });

      const result = await service.processGroupMessageForCustomerService(doctorMessageInput);

      expect(result.archiveUpdated).toBe(false);
      expect(mockArchiveService.upsertMemberArchiveService).not.toHaveBeenCalled();
    });

    it('should handle empty archive updates', async () => {
      // Mock analyzeMessage with empty updates
      (service as any).analyzeMessage.mockResolvedValue({
        ...(await (service as any).analyzeMessage()),
        archiveUpdates: {
          memberArchiveUpdates: {},
          patientArchiveUpdates: {}
        }
      });

      const result = await service.processGroupMessageForCustomerService(mockMessageInput);

      expect(result.archiveUpdated).toBe(false);
      expect(mockArchiveService.upsertMemberArchiveService).not.toHaveBeenCalled();
    });
  });

  describe('processPrivateMessageForMedicalAssistant', () => {
    const mockMessageInput: MessageAnalysisInput = {
      messageId: 'msg-private-123',
      conversationId: 'conv-private-456',
      senderId: 'user-private-789',
      senderRole: 'customer',
      content: '私聊消息：我有高血压需要咨询',
      timestamp: '2024-01-01T10:00:00Z'
    };

    beforeEach(() => {
      process.env.AI_PROVIDER = 'mock';
      service = new AIModelService();

      // Mock analyzeMessage
      jest.spyOn(service as any, 'analyzeMessage').mockResolvedValue({
        messageId: 'msg-private-123',
        conversationId: 'conv-private-456',
        senderId: 'user-private-789',
        understanding: {
          userQuestion: '高血压需要咨询',
          userState: 'concerned',
          newNeeds: ['血压管理'],
          concerns: ['血压偏高'],
          risks: ['心血管风险'],
          informationWorthy: ['当前血压值']
        },
        extraction: {
          basicInfoUpdates: { condition: '高血压' },
          newRequirements: ['血压监测'],
          keyStateChanges: ['血压不稳定'],
          riskPoints: ['中风风险'],
          followupItems: ['调整用药']
        },
        archiveUpdates: {
          memberArchiveUpdates: {
            basicInfo: JSON.stringify({ condition: '高血压' }),
            coreProblem: '血压控制问题'
          },
          patientArchiveUpdates: {}
        },
        confidence: 0.8,
        analysisTimestamp: '2024-01-01T10:00:00Z'
      });

      // Mock other methods
      jest.spyOn(service as any, 'saveAnalysisResult').mockResolvedValue('analysis-id-123');
      jest.spyOn(service as any, 'getPatientIdByWecomUserId').mockResolvedValue('patient-123');
      jest.spyOn(service as any, 'extractMedicalInformation').mockReturnValue({
        '主诉': '高血压',
        '血压信息': '偏高'
      });

      // Mock archive services
      mockArchiveService.upsertPatientProfileService.mockResolvedValue({
        id: 'patient-profile-123',
        patientId: 'patient-123',
        basicInfo: JSON.stringify({ condition: '高血压' }),
        coreProblem: '血压控制问题',
        preferences: null,
        communicationSummary: null,
        followupFocus: null,
        personaSummary: null,
        recentIssueSummary: null,
        followupPlan: null,
        sourceConversations: 'conv-private-456',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as any);

      mockArchiveService.upsertMemberArchiveService.mockResolvedValue({
        id: 'archive-id-123',
        userId: 'user-private-789',
        conversationId: 'conv-private-456',
        basicInfo: JSON.stringify({ condition: '高血压' }),
        coreProblem: '血压控制问题',
        preferences: null,
        communicationSummary: null,
        followupFocus: null,
        personaSummary: null,
        recentIssueSummary: null,
        followupPlan: null,
        sourceConversations: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as any);
    });

    it('should process private message and update patient profile when patient exists', async () => {
      const result = await service.processPrivateMessageForMedicalAssistant(mockMessageInput);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.archiveUpdated).toBe(true);
      expect(result.archiveType).toBe('patient');
      expect(result.targetId).toBe('patient-123');
      expect(result.patientId).toBe('patient-123');

      expect(mockArchiveService.upsertPatientProfileService).toHaveBeenCalledWith(
        'patient-123',
        expect.objectContaining({
          basicInfo: expect.stringContaining('"condition":"高血压"'),
          coreProblem: '血压控制问题',
          sourceConversations: 'conv-private-456'
        }),
        'ai-medical-assistant'
      );
    });

    it('should fall back to member archive when patient not found', async () => {
      // Mock no patient mapping
      (service as any).getPatientIdByWecomUserId.mockResolvedValue(null);

      const result = await service.processPrivateMessageForMedicalAssistant(mockMessageInput);

      expect(result.archiveUpdated).toBe(true);
      expect(result.archiveType).toBe('member');
      expect(result.targetId).toBe(mockMessageInput.senderId);
      expect(result.patientId).toBeNull();

      expect(mockArchiveService.upsertMemberArchiveService).toHaveBeenCalledWith(
        'user-private-789',
        expect.objectContaining({
          conversationId: 'conv-private-456',
          basicInfo: expect.stringContaining('"condition":"高血压"'),
          coreProblem: '血压控制问题'
        }),
        'ai-medical-assistant-fallback'
      );
    });

    it('should not update archive for non-customer messages', async () => {
      const doctorMessageInput: MessageAnalysisInput = {
        ...mockMessageInput,
        senderRole: 'doctor'
      };

      const result = await service.processPrivateMessageForMedicalAssistant(doctorMessageInput);

      expect(result.archiveUpdated).toBe(false);
      expect(result.patientId).toBeNull();
      expect(mockArchiveService.upsertPatientProfileService).not.toHaveBeenCalled();
      expect(mockArchiveService.upsertMemberArchiveService).not.toHaveBeenCalled();
    });
  });

  describe('processMessageWithBusinessRouting', () => {
    beforeEach(() => {
      process.env.AI_PROVIDER = 'mock';
      service = new AIModelService();

      // Mock internal methods
      jest.spyOn(service as any, 'getMessageDetails').mockResolvedValue({
        message_id: 'msg-123',
        conversation_id: 'conv-456',
        sender_id: 'user-789',
        sender_role: 'customer',
        content_text: '测试消息',
        sent_at: '2024-01-01T10:00:00Z',
        chat_type: 'group'
      });

      jest.spyOn(service as any, 'getConversationContext').mockResolvedValue([]);

      // Mock the two business processing methods
      jest.spyOn(service as any, 'processGroupMessageForCustomerService').mockResolvedValue({
        analysis: {},
        archiveUpdated: true,
        archiveType: 'member' as const,
        targetId: 'user-789'
      });

      jest.spyOn(service as any, 'processPrivateMessageForMedicalAssistant').mockResolvedValue({
        analysis: {},
        archiveUpdated: true,
        archiveType: 'patient' as const,
        targetId: 'patient-123',
        patientId: 'patient-123'
      });

      // Mock the fallback function (imported from service)
      // We'll need to mock the imported function
    });

    it('should route group messages to group customer service', async () => {
      (service as any).getMessageDetails.mockResolvedValue({
        message_id: 'msg-group-123',
        conversation_id: 'conv-group-456',
        sender_id: 'user-group-789',
        sender_role: 'customer',
        content_text: '群聊消息',
        sent_at: '2024-01-01T10:00:00Z',
        chat_type: 'group'
      });

      const result = await service.processMessageWithBusinessRouting('msg-group-123');

      expect(result.success).toBe(true);
      expect(result.chatType).toBe('group');
      expect(result.businessHandler).toBe('group-customer-service');
      expect(result.archiveUpdated).toBe(true);
      expect(result.archiveType).toBe('member');
      expect((service as any).processGroupMessageForCustomerService).toHaveBeenCalled();
    });

    it('should route private messages to medical assistant', async () => {
      (service as any).getMessageDetails.mockResolvedValue({
        message_id: 'msg-private-123',
        conversation_id: 'conv-private-456',
        sender_id: 'user-private-789',
        sender_role: 'customer',
        content_text: '私聊消息',
        sent_at: '2024-01-01T10:00:00Z',
        chat_type: 'private'
      });

      const result = await service.processMessageWithBusinessRouting('msg-private-123');

      expect(result.success).toBe(true);
      expect(result.chatType).toBe('private');
      expect(result.businessHandler).toBe('medical-assistant');
      expect(result.archiveUpdated).toBe(true);
      expect(result.archiveType).toBe('patient');
      expect((service as any).processPrivateMessageForMedicalAssistant).toHaveBeenCalled();
    });

    it('should handle unknown chat type', async () => {
      (service as any).getMessageDetails.mockResolvedValue({
        message_id: 'msg-unknown-123',
        conversation_id: 'conv-unknown-456',
        sender_id: 'user-unknown-789',
        sender_role: 'customer',
        content_text: '未知类型消息',
        sent_at: '2024-01-01T10:00:00Z',
        chat_type: 'unknown'
      });

      // We can't easily mock the imported processMessageAndUpdateArchive function
      // So we'll expect it to work or handle the test differently
      // For now, just ensure the method doesn't crash
      await expect(service.processMessageWithBusinessRouting('msg-unknown-123'))
        .resolves
        .toBeDefined();
    });

    it('should handle message not found error', async () => {
      (service as any).getMessageDetails.mockResolvedValue(null);

      const result = await service.processMessageWithBusinessRouting('non-existent-msg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // Note: More tests could be added for private helper methods,
  // but these cover the main public API of the service.
});