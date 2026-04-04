import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ensurePriorityPatientOutreachActionService } from './outreach-action.service.js';
import { db } from '../../../infra/db/pg.js';

jest.mock('../../../infra/db/pg.js', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('outreach-action.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses pending action when summary is unchanged', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'patient-1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-existing',
            patientId: 'patient-1',
            actionType: 'manual_followup',
            triggerSource: 'wecom_automation',
            summary: '【企微跟进】客户最新表达：空腹血糖偏高',
            status: 'pending',
            sentAt: null,
            failureReason: null,
            createdAt: '2026-04-03T10:00:00.000Z'
          }
        ]
      } as never);

    const result = await ensurePriorityPatientOutreachActionService({
      patientId: 'patient-1',
      actionType: 'manual_followup',
      triggerSource: 'wecom_automation',
      summary: '【企微跟进】客户最新表达：空腹血糖偏高',
      priority: 'medium'
    });

    expect(result.created).toBe(false);
    expect(result.upgraded).toBe(false);
    expect(result.action.id).toBe('action-existing');
  });

  it('upgrades pending action when summary changes', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'patient-1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-old',
            patientId: 'patient-1',
            actionType: 'manual_followup',
            triggerSource: 'wecom_automation',
            summary: '【企微跟进】客户最新表达：空腹血糖偏高',
            status: 'pending',
            sentAt: null,
            failureReason: null,
            createdAt: '2026-04-03T10:00:00.000Z'
          }
        ]
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-old',
            patientId: 'patient-1',
            actionType: 'manual_followup',
            triggerSource: 'wecom_automation',
            summary: '【企微跟进】客户最新表达：空腹血糖偏高',
            status: 'closed',
            sentAt: null,
            failureReason: 'superseded_by_new_customer_expression',
            createdAt: '2026-04-04T10:00:00.000Z'
          }
        ],
        rowCount: 1
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-new',
            patientId: 'patient-1',
            actionType: 'manual_followup',
            triggerSource: 'wecom_automation',
            summary: '【企微跟进】客户最新表达：脚麻越来越明显',
            status: 'pending',
            sentAt: null,
            failureReason: null,
            createdAt: '2026-04-04T10:05:00.000Z'
          }
        ]
      } as never);

    const result = await ensurePriorityPatientOutreachActionService({
      patientId: 'patient-1',
      actionType: 'manual_followup',
      triggerSource: 'wecom_automation',
      summary: '【企微跟进】客户最新表达：脚麻越来越明显',
      priority: 'medium'
    });

    expect(result.created).toBe(false);
    expect(result.upgraded).toBe(true);
    expect(result.action.id).toBe('action-new');
    expect(result.closedActions).toHaveLength(1);
    expect(result.closedActions[0].id).toBe('action-old');
  });
});
