import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { runWecomEventAutomation } from './wecom-event-automation.service.js';
import { analyzeConversationMessages } from './insight.service.js';
import { generateBusinessFeedback } from './business-feedback.service.js';
import { generateBusinessActions } from './business-action.service.js';
import { ensurePriorityPatientOutreachActionService } from '../../enrollment/service/outreach-action.service.js';
import { scheduleAutomationAutoSend } from './automation-send-scheduler.service.js';
import { sendWecomOutreachActionService } from '../../enrollment/service/wecom-outreach.service.js';
import { resolvePatientIdByCustomerId } from './patient-mapping.service.js';

jest.mock('./insight.service.js', () => ({
  analyzeConversationMessages: jest.fn()
}));

jest.mock('./business-feedback.service.js', () => ({
  generateBusinessFeedback: jest.fn()
}));

jest.mock('./business-action.service.js', () => ({
  generateBusinessActions: jest.fn()
}));

jest.mock('./patient-mapping.service.js', () => ({
  resolvePatientIdByCustomerId: jest.fn()
}));

jest.mock('../../enrollment/service/outreach-action.service.js', () => ({
  closePendingOutreachActionsForLifecycleService: jest.fn(async () => ({ items: [], total: 0 })),
  ensurePriorityPatientOutreachActionService: jest.fn()
}));

jest.mock('../../dashboard/service/doctor-review.service.js', () => ({
  closePendingDoctorReviewTasksForLifecycleService: jest.fn(async () => ({ items: [], total: 0 }))
}));

jest.mock('./automation-send-scheduler.service.js', () => ({
  scheduleAutomationAutoSend: jest.fn()
}));

jest.mock('../../enrollment/service/wecom-outreach.service.js', () => ({
  sendWecomOutreachActionService: jest.fn()
}));

const mockAnalyzeConversationMessages = analyzeConversationMessages as jest.MockedFunction<typeof analyzeConversationMessages>;
const mockGenerateBusinessFeedback = generateBusinessFeedback as jest.MockedFunction<typeof generateBusinessFeedback>;
const mockGenerateBusinessActions = generateBusinessActions as jest.MockedFunction<typeof generateBusinessActions>;
const mockEnsurePriorityPatientOutreachAction = ensurePriorityPatientOutreachActionService as jest.MockedFunction<typeof ensurePriorityPatientOutreachActionService>;
const mockScheduleAutomationAutoSend = scheduleAutomationAutoSend as jest.MockedFunction<typeof scheduleAutomationAutoSend>;
const mockSendWecomOutreachAction = sendWecomOutreachActionService as jest.MockedFunction<typeof sendWecomOutreachActionService>;
const mockResolvePatientIdByCustomerId = resolvePatientIdByCustomerId as jest.MockedFunction<typeof resolvePatientIdByCustomerId>;

describe('wecom-event-automation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses insight and merge scheduling for private customer text', async () => {
    mockAnalyzeConversationMessages.mockResolvedValue({
      insightId: 'insight-1',
      summaryText: '客户最新表达：空腹血糖偏高',
      needs: ['空腹血糖偏高'],
      concerns: [],
      objections: [],
      risks: [],
      nextActions: ['继续跟进'],
      confidence: 'medium',
      customerExpressionStatus: 'present',
      sourceMessageCount: 1
    } as never);
    mockGenerateBusinessFeedback.mockResolvedValue({
      status: 'ready',
      customerExpressionStatus: 'present',
      customerNeedSummary: { summaryText: '客户最新表达：空腹血糖偏高' },
      riskSignals: [],
      followupSuggestions: [{ actionText: '继续跟进' }],
      planUpdateSuggestions: []
    } as never);
    mockGenerateBusinessActions.mockResolvedValue({
      outreachAction: {
        id: 'action-1',
        patientId: 'patient-1',
        actionType: 'manual_followup',
        triggerSource: 'wecom_automation',
        summary: '【企微跟进】客户最新表达：空腹血糖偏高',
        status: 'pending',
        sentAt: null,
        failureReason: null,
        createdAt: '2026-04-04T10:00:00.000Z'
      },
      automation: {
        status: 'created',
        actionMode: 'followup_only',
        reason: 'feedback_ready',
        priority: 'medium'
      }
    } as never);
    mockScheduleAutomationAutoSend.mockResolvedValue({
      status: 'merge_window_waiting',
      reason: 'waiting_for_private_text_merge_window',
      actionId: 'action-1',
      sendAttempted: false,
      retryable: true,
      sendMode: 'debounced'
    });

    const result = await runWecomEventAutomation({
      conversationId: 'wecom:private:test-user',
      messageId: 'msg-1',
      customerId: 'patient-1',
      chatType: 'private',
      contentType: 'text',
      contentText: '空腹血糖偏高',
      lifecycleStatus: 'message_received',
      messageCategory: 'customer_text'
    });

    expect(mockAnalyzeConversationMessages).toHaveBeenCalled();
    expect(mockGenerateBusinessActions).toHaveBeenCalled();
    expect(mockScheduleAutomationAutoSend).toHaveBeenCalled();
    expect(result.autoSendResult?.status).toBe('merge_window_waiting');
  });

  it('does not run normal text analysis for lifecycle events', async () => {
    mockResolvePatientIdByCustomerId.mockResolvedValue({
      patientId: 'patient-1',
      patientName: '测试患者',
      matchedBy: 'external_user_id'
    });
    mockEnsurePriorityPatientOutreachAction.mockResolvedValue({
      created: true,
      upgraded: false,
      action: {
        id: 'action-lifecycle',
        patientId: 'patient-1',
        actionType: 'profile_completion',
        triggerSource: 'wecom_event',
        summary: '【企微资料补充】客户资料发生变化，建议补充完善关键资料。',
        status: 'pending',
        sentAt: null,
        failureReason: null,
        createdAt: '2026-04-04T10:00:00.000Z'
      },
      closedActions: []
    } as never);

    const result = await runWecomEventAutomation({
      conversationId: 'wecom:private:test-user',
      messageId: 'msg-event-1',
      customerId: 'patient-1',
      chatType: 'private',
      event: 'change_external_contact',
      changeType: 'edit_external_contact',
      contentType: 'event',
      lifecycleStatus: 'contact_changed',
      messageCategory: 'system_event'
    });

    expect(mockAnalyzeConversationMessages).not.toHaveBeenCalled();
    expect(mockGenerateBusinessActions).not.toHaveBeenCalled();
    expect(mockEnsurePriorityPatientOutreachAction).toHaveBeenCalled();
    expect(result.actions?.outreachAction?.actionType).toBe('profile_completion');
    expect(result.autoSendResult?.status).toBe('skipped');
  });

  it('skips lifecycle action safely when patient mapping is still pending', async () => {
    mockResolvePatientIdByCustomerId.mockResolvedValue(null);

    const result = await runWecomEventAutomation({
      conversationId: 'wecom:private:test-user',
      messageId: 'msg-event-pending',
      customerId: 'external-user-1',
      chatType: 'private',
      event: 'change_external_contact',
      changeType: 'add_external_contact',
      contentType: 'event',
      lifecycleStatus: 'contact_changed',
      messageCategory: 'system_event'
    });

    expect(mockEnsurePriorityPatientOutreachAction).not.toHaveBeenCalled();
    expect(result.executionStatus).toBe('skipped');
    expect(result.reason).toBe('pending_mapping');
    expect(result.actions).toBeNull();
  });

  it('bypasses merge window for immediate risk private text', async () => {
    mockAnalyzeConversationMessages.mockResolvedValue({
      insightId: 'insight-risk',
      summaryText: '客户最新表达：我现在胸痛而且呼吸困难',
      needs: ['我现在胸痛而且呼吸困难'],
      concerns: ['怎么办'],
      objections: [],
      risks: ['胸痛', '呼吸困难'],
      nextActions: ['立即联系人工处理'],
      confidence: 'medium',
      customerExpressionStatus: 'present',
      sourceMessageCount: 1
    } as never);
    mockGenerateBusinessFeedback.mockResolvedValue({
      status: 'ready',
      customerExpressionStatus: 'present',
      customerNeedSummary: { summaryText: '客户最新表达：我现在胸痛而且呼吸困难' },
      riskSignals: [{ title: 'risk', description: '胸痛' }],
      followupSuggestions: [{ actionText: '立即联系人工处理' }],
      planUpdateSuggestions: []
    } as never);
    mockGenerateBusinessActions.mockResolvedValue({
      outreachAction: {
        id: 'action-risk',
        patientId: 'patient-1',
        actionType: 'manual_followup',
        triggerSource: 'wecom_automation',
        summary: '【企微跟进】客户最新表达：我现在胸痛而且呼吸困难',
        status: 'pending',
        sentAt: null,
        failureReason: null,
        createdAt: '2026-04-05T10:00:00.000Z'
      },
      automation: {
        status: 'created',
        actionMode: 'followup_only',
        reason: 'feedback_ready',
        priority: 'medium'
      }
    } as never);
    mockSendWecomOutreachAction.mockResolvedValue({
      status: 'sent',
      reason: 'send_success',
      actionId: 'action-risk',
      sendAttempted: true,
      retryable: false,
      sendMode: 'immediate'
    } as never);

    const result = await runWecomEventAutomation({
      conversationId: 'wecom:private:test-user',
      messageId: 'msg-risk',
      customerId: 'patient-1',
      chatType: 'private',
      contentType: 'text',
      contentText: '我现在胸痛而且呼吸困难',
      lifecycleStatus: 'message_received',
      messageCategory: 'customer_text'
    });

    expect(mockScheduleAutomationAutoSend).not.toHaveBeenCalled();
    expect(mockSendWecomOutreachAction).toHaveBeenCalled();
    expect(result.autoSendResult?.status).toBe('sent');
  });
});
