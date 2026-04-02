// 测试环境专用的MSW配置
// 在Jest的jsdom环境中，我们无法使用msw/node，所以这里创建一个简化版本

import { http, HttpResponse } from 'msw';

// 测试环境专用的handlers
const testHandlers = [
  http.get('*/api/v1/dashboard/overview', () => {
    return HttpResponse.json({
      success: true,
      data: {
        total_patients: 150,
        active_patients: 120,
        total_conversations: 45,
        active_conversations: 30,
        pending_reviews: 8,
      },
    });
  }),

  http.get('*/api/v1/wecom/conversations', () => {
    return HttpResponse.json({
      success: true,
      data: {
        conversations: [
          {
            conversation_id: 'test-conv-1',
            external_conversation_id: 'external-test-1',
            chat_type: 'single',
            conversation_status: 'active',
            latest_message_at: '2024-01-01T10:00:00Z',
          },
        ],
        total_count: 1,
      },
    });
  }),

  http.get('*/api/v1/member-archives', () => {
    return HttpResponse.json({
      success: true,
      data: {
        archives: [
          {
            user_id: 'test-user-1',
            display_name: '测试用户',
            basic_info: { gender: 'male', age: 35 },
            preferences: { communication_preference: 'text' },
          },
        ],
        total_count: 1,
      },
    });
  }),

  http.post('*/api/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: { token: 'test-jwt-token' },
    });
  }),

  // 默认处理器
  http.all('*', ({ request }) => {
    console.warn(`[Test MSW] Unhandled request: ${request.method} ${request.url}`);
    return HttpResponse.json({
      success: false,
      data: null,
      message: 'No handler for this request in test environment',
    }, { status: 404 });
  }),
];

// 创建server的简化版本
export const server = {
  listen: (options?: any) => {
    console.log('[Test MSW] Server listening');
    // 在实际实现中，这里会设置拦截器
  },
  resetHandlers: () => {
    console.log('[Test MSW] Handlers reset');
    // 在实际实现中，这里会重置处理器
  },
  close: () => {
    console.log('[Test MSW] Server closed');
    // 在实际实现中，这里会清理拦截器
  },
};

// 导出handlers供直接使用
export const handlers = testHandlers;