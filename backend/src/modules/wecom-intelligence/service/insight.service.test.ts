import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { analyzeConversationMessages } from './insight.service.js';
import { db } from '../../../infra/db/pg.js';
import { saveInsightV1 } from './insight-v1-repository.service.js';

jest.mock('../../../infra/db/pg.js', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('./insight-v1-repository.service.js', () => ({
  saveInsightV1: jest.fn(),
  findInsightV1ById: jest.fn(),
  findLatestInsightV1ByConversationId: jest.fn(),
  listInsightsV1: jest.fn()
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockSaveInsightV1 = saveInsightV1 as jest.MockedFunction<typeof saveInsightV1>;

describe('insight.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveInsightV1.mockResolvedValue({ id: 101 } as never);
    process.env.WECOM_PRIVATE_MERGE_WINDOW_MS = '30000';
  });

  it('builds insight from latest customer expressions instead of older messages', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ primary_customer_id: 'patient-123' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            message_id: 'event-1',
            sender_role: 'system',
            content_type: 'event',
            chat_type: 'private',
            content_text: 'LOCATION',
            sent_at: '2026-04-04T10:00:20.000Z',
            metadata_json: { messageCategory: 'system_event' }
          },
          {
            message_id: 'msg-new-2',
            sender_role: 'customer',
            content_type: 'text',
            chat_type: 'private',
            content_text: '我现在最担心脚麻越来越明显',
            sent_at: '2026-04-04T10:00:10.000Z',
            metadata_json: { messageCategory: 'customer_text' }
          },
          {
            message_id: 'msg-new-1',
            sender_role: 'customer',
            content_type: 'text',
            chat_type: 'private',
            content_text: '空腹血糖这两天都在9以上',
            sent_at: '2026-04-04T10:00:00.000Z',
            metadata_json: { messageCategory: 'customer_text' }
          },
          {
            message_id: 'msg-old',
            sender_role: 'customer',
            content_type: 'text',
            chat_type: 'private',
            content_text: '上周其实已经好很多了',
            sent_at: '2026-04-04T08:00:00.000Z',
            metadata_json: { messageCategory: 'customer_text' }
          }
        ]
      } as never);

    const result = await analyzeConversationMessages('wecom:private:test-user', {});

    expect(result.summaryText).toContain('空腹血糖这两天都在9以上');
    expect(result.summaryText).toContain('我现在最担心脚麻越来越明显');
    expect(result.summaryText).not.toContain('上周其实已经好很多了');
    expect(result.evidenceMessageIds).toEqual(['msg-new-1', 'msg-new-2']);
    expect(result.sourceMessageCount).toBe(2);
    expect(mockSaveInsightV1).toHaveBeenCalledWith(expect.objectContaining({
      evidenceMessageIds: ['msg-new-1', 'msg-new-2'],
      sourceMessageCount: 2
    }));
  });

  it('does not generate followup suggestions when no effective customer expression exists', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ primary_customer_id: 'patient-123' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            message_id: 'event-1',
            sender_role: 'system',
            content_type: 'event',
            chat_type: 'private',
            content_text: 'LOCATION',
            sent_at: '2026-04-04T10:00:20.000Z',
            metadata_json: { messageCategory: 'system_event' }
          },
          {
            message_id: 'staff-1',
            sender_role: 'staff',
            content_type: 'text',
            chat_type: 'private',
            content_text: '内部备注',
            sent_at: '2026-04-04T10:00:10.000Z',
            metadata_json: { messageCategory: 'staff_text' }
          }
        ]
      } as never);

    const result = await analyzeConversationMessages('wecom:private:test-user', {});

    expect(result.customerExpressionStatus).toBe('absent');
    expect(result.summaryText).toContain('暂无足够客户表达内容');
    expect(result.nextActions).toEqual([]);
    expect(result.planUpdateSuggestions).toEqual([]);
  });
});
