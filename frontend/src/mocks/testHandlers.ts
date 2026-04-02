// 测试环境专用的handlers，不依赖msw
// 这个文件只用于单元测试，避免在jsdom环境中导入msw

// 测试环境专用的handlers
export const testHandlers = [
  {
    method: 'GET',
    url: '*/api/v1/dashboard/overview',
    response: () => ({
      success: true,
      data: {
        total_patients: 150,
        active_patients: 120,
        total_conversations: 45,
        active_conversations: 30,
        pending_reviews: 8,
        recent_activities: [
          { id: 'act1', type: 'message', description: 'New patient message', time: '2024-01-01T10:30:00Z' },
          { id: 'act2', type: 'archive_update', description: 'Patient profile updated', time: '2024-01-01T09:45:00Z' },
        ],
      },
    }),
  },
  {
    method: 'GET',
    url: '*/api/v1/wecom/conversations',
    response: () => ({
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
    }),
  },
  {
    method: 'GET',
    url: '*/api/v1/member-archives',
    response: () => ({
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
    }),
  },
  {
    method: 'POST',
    url: '*/api/v1/auth/login',
    response: () => ({
      success: true,
      data: { token: 'test-jwt-token' },
    }),
  },
];

// 创建server的简化版本
export const server = {
  listen: (options?: any) => {
    console.log('[Test MSW] Server listening');
    // 在测试环境中不需要实际设置
  },
  resetHandlers: () => {
    console.log('[Test MSW] Handlers reset');
    // 在测试环境中不需要实际重置
  },
  close: () => {
    console.log('[Test MSW] Server closed');
    // 在测试环境中不需要实际清理
  },
};

// 导出handlers供直接使用
export const handlers = testHandlers;