import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { sendWecomOutreachActionService } from './wecom-outreach.service.js';
import { db } from '../../../infra/db/pg.js';
import { createOutreachDeliveryLogService } from './outreach-delivery-log.service.js';
import { sendWecomTextMessageService } from './wecom-message-sender.service.js';

jest.mock('../../../infra/db/pg.js', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('./outreach-delivery-log.service.js', () => ({
  createOutreachDeliveryLogService: jest.fn()
}));

jest.mock('./wecom-message-sender.service.js', () => ({
  sendWecomTextMessageService: jest.fn()
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockCreateDeliveryLog = createOutreachDeliveryLogService as jest.MockedFunction<typeof createOutreachDeliveryLogService>;
const mockSendWecomTextMessage = sendWecomTextMessageService as jest.MockedFunction<typeof sendWecomTextMessageService>;

describe('wecom-outreach.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns already_sent instead of throwing when action is already done', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-1',
            patientId: 'patient-1',
            actionType: 'manual_followup',
            triggerSource: 'wecom_automation',
            summary: '【企微跟进】客户最新表达：空腹血糖偏高',
            status: 'done',
            sentAt: '2026-04-04T10:00:00.000Z',
            failureReason: null,
            createdAt: '2026-04-04T09:58:00.000Z'
          }
        ]
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'binding-1',
            bindingType: 'external_user',
            wecomUserId: null,
            externalUserId: 'external-user-1',
            bindingStatus: 'bound'
          }
        ]
      } as never);

    const result = await sendWecomOutreachActionService('action-1');

    expect(result.externalMessage).toContain('您好');
    expect(result.status).toBe('already_sent');
    expect(result.sendAttempted).toBe(false);
    expect(mockSendWecomTextMessage).not.toHaveBeenCalled();
    expect(mockCreateDeliveryLog).not.toHaveBeenCalled();
  });

  it('returns not_sendable for failed actions and keeps retryable flag', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-2',
            patientId: 'patient-1',
            actionType: 'manual_followup',
            triggerSource: 'wecom_automation',
            summary: '【企微跟进】客户最新表达：脚麻越来越明显',
            status: 'failed',
            sentAt: null,
            failureReason: 'wecom config missing',
            createdAt: '2026-04-04T10:05:00.000Z'
          }
        ]
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'binding-1',
            bindingType: 'external_user',
            wecomUserId: null,
            externalUserId: 'external-user-1',
            bindingStatus: 'bound'
          }
        ]
      } as never);

    const result = await sendWecomOutreachActionService('action-2');

    expect(result.status).toBe('not_sendable');
    expect(result.reason).toBe('action_failed');
    expect(result.retryable).toBe(true);
    expect(mockSendWecomTextMessage).not.toHaveBeenCalled();
  });
});
