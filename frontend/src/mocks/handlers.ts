import { http, HttpResponse } from 'msw';

// 基础API响应类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

// 模拟数据
const mockConversations = [
  {
    conversation_id: 'conv1',
    external_conversation_id: 'external_conv1',
    chat_type: 'single',
    conversation_status: 'active',
    latest_message_at: '2024-01-01T10:00:00Z',
    participant_count: 2,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    conversation_id: 'conv2',
    external_conversation_id: 'external_conv2',
    chat_type: 'group',
    conversation_status: 'active',
    latest_message_at: '2024-01-01T11:00:00Z',
    participant_count: 5,
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T11:00:00Z',
  },
];

const mockDashboardOverview = {
  total_patients: 150,
  active_patients: 120,
  total_conversations: 45,
  active_conversations: 30,
  pending_reviews: 8,
  recent_activities: [
    { id: 'act1', type: 'message', description: 'New patient message', time: '2024-01-01T10:30:00Z' },
    { id: 'act2', type: 'archive_update', description: 'Patient profile updated', time: '2024-01-01T09:45:00Z' },
  ],
};

const mockMemberArchives = [
  {
    user_id: 'user1',
    display_name: '张先生',
    basic_info: {
      gender: 'male',
      age: 45,
      location: '北京',
    },
    preferences: {
      communication_preference: 'text',
      follow_up_frequency: 'weekly',
    },
    core_issues: ['高血压管理', '饮食控制'],
    communication_summary: '积极配合治疗，定期反馈状况',
    follow_up_focus: '血压监测和药物调整',
    personal_portrait: '中年男性，工作压力大，有高血压病史',
    recent_issue_summary: '最近血压控制良好',
    follow_up_plan: '下周进行电话随访',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
];

// API Handlers
export const handlers = [
  // 认证相关
  http.post('*/api/v1/auth/login', () => {
    return HttpResponse.json<ApiResponse<{ token: string }>>({
      success: true,
      data: { token: 'mock-jwt-token-for-testing' },
    });
  }),

  // 仪表板概览
  http.get('*/api/v1/dashboard/overview', () => {
    return HttpResponse.json<ApiResponse>({
      success: true,
      data: mockDashboardOverview,
    });
  }),

  // 企业微信对话列表
  http.get('*/api/v1/wecom/conversations', ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '10';
    const offset = url.searchParams.get('offset') || '0';

    const data = {
      conversations: mockConversations.slice(Number(offset), Number(offset) + Number(limit)),
      total_count: mockConversations.length,
      limit: Number(limit),
      offset: Number(offset),
    };

    return HttpResponse.json<ApiResponse>({
      success: true,
      data,
    });
  }),

  // 企业微信对话详情
  http.get('*/api/v1/wecom/conversations/:conversationId', ({ params }) => {
    const conversation = mockConversations.find(c => c.conversation_id === params.conversationId);

    if (!conversation) {
      return HttpResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Conversation not found',
      }, { status: 404 });
    }

    return HttpResponse.json<ApiResponse>({
      success: true,
      data: {
        ...conversation,
        messages: [
          {
            message_id: 'msg1',
            sender_id: 'user1',
            sender_role: 'customer',
            content_text: '您好，我最近血压有点高',
            sent_at: '2024-01-01T09:30:00Z',
          },
          {
            message_id: 'msg2',
            sender_id: 'assistant',
            sender_role: 'assistant',
            content_text: '建议您按时服药并监测血压',
            sent_at: '2024-01-01T09:35:00Z',
          },
        ],
      },
    });
  }),

  // 成员档案
  http.get('*/api/v1/member-archives/:userId', ({ params }) => {
    const archive = mockMemberArchives.find(a => a.user_id === params.userId);

    if (!archive) {
      return HttpResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Member archive not found',
      }, { status: 404 });
    }

    return HttpResponse.json<ApiResponse>({
      success: true,
      data: archive,
    });
  }),

  // 搜索成员档案
  http.get('*/api/v1/member-archives', () => {
    return HttpResponse.json<ApiResponse>({
      success: true,
      data: {
        archives: mockMemberArchives,
        total_count: mockMemberArchives.length,
      },
    });
  }),

  // 患者列表
  http.get('*/api/v1/patients', () => {
    return HttpResponse.json<ApiResponse>({
      success: true,
      data: {
        patients: [
          { id: 'patient1', name: '李女士', age: 52, condition: '糖尿病', status: 'active' },
          { id: 'patient2', name: '王先生', age: 65, condition: '高血压', status: 'active' },
        ],
        total_count: 2,
      },
    });
  }),

  // 业务路由处理
  http.post('*/api/v1/business-routing/messages/process', async ({ request }) => {
    const body = await request.json() as { messageId: string };

    return HttpResponse.json<ApiResponse>({
      success: true,
      data: {
        success: true,
        archiveUpdated: false,
        analysis: {
          understanding: {
            userQuestion: '测试问题',
            userState: '正常',
          },
          extraction: {},
          confidence: 0.8,
        },
        messageId: body.messageId,
      },
    });
  }),

  // 健康检查
  http.get('*/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // 默认匹配所有未处理的API请求
  http.all('*', ({ request }) => {
    console.warn(`[MSW] Unhandled request: ${request.method} ${request.url}`);
    return HttpResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: `No mock handler for ${request.method} ${request.url}`,
    }, { status: 404 });
  }),
];