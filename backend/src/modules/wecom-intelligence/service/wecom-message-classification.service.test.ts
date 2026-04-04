import { describe, expect, it } from '@jest/globals';
import {
  isCustomerExpressionCategory,
  resolveSenderClassification
} from './wecom-message-classification.service.js';

describe('wecom-message-classification.service', () => {
  it('classifies private text without externalUserId as customer expression', () => {
    const result = resolveSenderClassification({
      chatType: 'private',
      contentType: 'text'
    });

    expect(result.senderRole).toBe('customer');
    expect(result.senderRoleReason).toBe('private_text_default_customer');
    expect(result.messageCategory).toBe('customer_text');
    expect(result.isCustomerExpression).toBe(true);
  });

  it('classifies event messages as system events', () => {
    const result = resolveSenderClassification({
      chatType: 'private',
      contentType: 'event',
      event: 'LOCATION'
    });

    expect(result.senderRole).toBe('system');
    expect(result.messageCategory).toBe('system_event');
    expect(result.isCustomerExpression).toBe(false);
  });

  it('keeps external user messages as customer expressions', () => {
    const result = resolveSenderClassification({
      chatType: 'group',
      contentType: 'text',
      externalUserId: 'external-user-123'
    });

    expect(result.senderRole).toBe('customer');
    expect(result.messageCategory).toBe('customer_text');
    expect(isCustomerExpressionCategory(result.messageCategory)).toBe(true);
  });
});
