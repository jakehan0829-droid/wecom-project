export type WecomSenderRole = 'customer' | 'staff' | 'system' | 'unknown';

export type WecomMessageCategory =
  | 'customer_text'
  | 'customer_non_text'
  | 'staff_text'
  | 'staff_non_text'
  | 'system_event'
  | 'system_message'
  | 'unknown';

export type CustomerExpressionStatus = 'present' | 'absent';

export type BusinessFeedbackStatus = 'ready' | 'observe' | 'no_insight';

export type ActionGenerationDecision = 'created' | 'reused' | 'upgraded' | 'skipped';

export type AutoSendStatus =
  | 'triggered'
  | 'skipped'
  | 'sent'
  | 'already_sent'
  | 'not_sendable'
  | 'exception'
  | 'merge_window_waiting';

export type ActionLifecycleStatus = 'pending' | 'done' | 'failed' | 'closed';

export type OutreachActionRecord = {
  id: string;
  patientId: string;
  actionType: string;
  triggerSource: string;
  summary: string;
  status: ActionLifecycleStatus;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type DoctorReviewTaskRecord = {
  id: string;
  patientId: string;
  summary: string;
  status: string;
  createdAt: string;
};

export type SenderClassification = {
  senderRole: WecomSenderRole;
  senderRoleReason: string;
  messageCategory: WecomMessageCategory;
  isEventMessage: boolean;
  isTextMessage: boolean;
  isCustomerExpression: boolean;
};

export type InsightWindowMessage = {
  messageId: string;
  senderRole: string;
  contentType: string;
  contentText: string;
  sentAt: string;
  metadata?: Record<string, unknown>;
};

export type AutoSendResult = {
  status: AutoSendStatus;
  reason: string;
  actionId?: string | null;
  deliveryStatus?: string | null;
  sendAttempted: boolean;
  retryable: boolean;
  action?: OutreachActionRecord | null;
  deliveryLog?: Record<string, unknown> | null;
  receiver?: {
    ok: boolean;
    reason: string | null;
    receiverType: string | null;
    receiverId: string | null;
  } | null;
  previewMessage?: string | null;
  externalMessage?: string | null;
  nextStep?: string | null;
  errorMessage?: string | null;
  sendMode?: 'immediate' | 'debounced' | 'none';
};

export type InsightEvaluation = {
  customerExpressionStatus: CustomerExpressionStatus;
  latestCustomerExpression: string | null;
  latestCustomerMessageId: string | null;
  evidenceMessageIds: string[];
  sourceMessageCount: number;
};

export type BusinessFeedbackResult = {
  conversationId: string;
  customerId: string | null;
  status: BusinessFeedbackStatus;
  customerExpressionStatus: CustomerExpressionStatus;
  latestCustomerExpression?: string | null;
  customerNeedSummary: {
    summaryText: string;
    keyNeedCount: number;
    concernCount: number;
    objectionCount: number;
    intentLevel: string;
    stageJudgement: string;
    customerExpressionStatus: CustomerExpressionStatus;
    sourceMessageCount: number;
  } | null;
  needPoints: Array<{ title: string; description: string }>;
  concernPoints: Array<{ title: string; description: string }>;
  objectionPoints: Array<{ title: string; description: string }>;
  riskSignals: Array<{ title: string; description: string }>;
  followupSuggestions: Array<Record<string, unknown>>;
  planUpdateSuggestions: Array<Record<string, unknown>>;
};

export type BusinessActionResult = {
  feedback: BusinessFeedbackResult | null;
  patientMapping: {
    patientId: string;
    patientName: string;
    matchedBy: string;
  } | null;
  customerLookup: Record<string, unknown> | null;
  outreachAction: OutreachActionRecord | null;
  outreachActionDecision: ActionGenerationDecision;
  supersededOutreachActions: OutreachActionRecord[];
  doctorReviewTask: DoctorReviewTaskRecord | null;
  doctorReviewDecision: ActionGenerationDecision;
  automation: {
    status: ActionGenerationDecision | 'skipped';
    reason: string;
    priority: 'high' | 'medium' | 'low';
    actionMode: 'doctor_review_and_followup' | 'followup_only' | 'observe';
  };
};

export type WecomAutomationExecutionResult = {
  triggered: boolean;
  executionStatus: AutoSendStatus | 'triggered' | 'skipped';
  reason: string;
  stateTransition?: string;
  nextConversationStatus?: string;
  insight: Record<string, unknown> | null;
  feedback: BusinessFeedbackResult | null;
  actions: BusinessActionResult | null;
  autoSendResult?: AutoSendResult | null;
  lifecycleClosures?: {
    outreach: { items: Record<string, unknown>[]; total: number };
    doctorReview: { items: Record<string, unknown>[]; total: number };
  };
};
