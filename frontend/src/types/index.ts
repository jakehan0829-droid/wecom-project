// 应用核心类型定义

// 模式类型
export type Mode = 'mock' | 'real';

// 时间预设
export type TimePreset = 'today' | 'this_week' | '7d';

// 页面视图
export type PageView = 'dashboard' | 'conversation-detail' | 'archive-management' | 'doctor-workbench';

// 治理动作
export type GovernanceAction = 'confirm' | 'reassign' | 'unconfirm' | 'promote_binding';

// 业务路由分析
export interface BusinessRoutingAnalysis {
  understanding?: {
    userQuestion?: string;
    userState?: string;
    newNeeds?: string[];
    concerns?: string[];
    risks?: string[];
    informationWorthy?: string[];
  };
  extraction?: Record<string, unknown>;
  confidence?: number;
}

// 业务路由结果
export interface BusinessRoutingResult {
  success: boolean;
  processingSummary?: string;
  message?: string;
  archiveType?: string;
  archiveUpdated?: boolean;
  targetId?: string;
  handlerType?: 'group-customer-service' | 'medical-assistant';
  totalMessages?: number;
  processedMessages?: number;
  analysis?: BusinessRoutingAnalysis;
}

// 反馈相关类型
export type FeedbackStatus = 'done' | 'closed' | 'failed';
export type FeedbackType = 'completed' | 'failed' | 'no_response' | 'rescheduled' | 'duplicate' | 'not_needed';
export type ArchiveCorrectionType = 'add' | 'update' | 'delete' | 'note' | 'skip';

// 患者选项
export interface PatientOption {
  id: string;
  name: string;
  phone?: string;
  gender?: string;
  riskLevel?: string;
  managementStatus?: string;
  source?: string;
  diabetesType?: string;
  wecomExternalUserId?: string;
  recentConversationCount?: number;
  recentConversationName?: string;
  recentConversationId?: string;
  latestInsightSummary?: string;
}

// 通用记录类型
export type ConversationDetail = Record<string, unknown> | null;
export type ConversationMessage = Record<string, unknown>;
export type AuditItem = Record<string, unknown>;
export type InsightItem = Record<string, unknown> | null;
export type BusinessFeedbackItem = Record<string, unknown> | null;
export type ActionItem = Record<string, unknown>;

// 仪表板数据类型
export type DashboardPayload = any; // 根据实际mock数据定义
export type DashboardData = any; // 根据实际数据结构定义

// 常量映射
export const ARCHIVE_CORRECTION_OPTIONS = [
  { value: 'add' as ArchiveCorrectionType, label: '新增内容', feedbackType: 'completed' as FeedbackType, status: 'done' as FeedbackStatus },
  { value: 'update' as ArchiveCorrectionType, label: '修改原内容', feedbackType: 'rescheduled' as FeedbackType, status: 'done' as FeedbackStatus },
  { value: 'delete' as ArchiveCorrectionType, label: '删除错误内容', feedbackType: 'duplicate' as FeedbackType, status: 'done' as FeedbackStatus },
  { value: 'note' as ArchiveCorrectionType, label: '补充备注', feedbackType: 'completed' as FeedbackType, status: 'done' as FeedbackStatus },
  { value: 'skip' as ArchiveCorrectionType, label: '暂不写入', feedbackType: 'not_needed' as FeedbackType, status: 'closed' as FeedbackStatus },
];

export const archiveCorrectionLabelMap: Record<ArchiveCorrectionType, string> = {
  add: '新增内容',
  update: '修改原内容',
  delete: '删除错误内容',
  note: '补充备注',
  skip: '暂不写入',
};

export const feedbackTypeLabelMap: Record<FeedbackType, string> = {
  completed: '已完成',
  failed: '执行失败',
  no_response: '无响应',
  rescheduled: '改期/延期',
  duplicate: '重复动作',
  not_needed: '无需继续',
};

export const feedbackStatusLabelMap: Record<FeedbackStatus, string> = {
  done: '已完成',
  closed: '已关闭',
  failed: '已失败',
};

export const columnLabelMap: Record<string, string> = {
  createdAt: '时间',
  action: '动作',
  // 其他列映射可以在需要时添加
};