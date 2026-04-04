import { analyzeConversationMessages } from './insight.service.js';
import { generateBusinessFeedback } from './business-feedback.service.js';
import { generateBusinessActions } from './business-action.service.js';
import { closePendingOutreachActionsForLifecycleService, ensurePriorityPatientOutreachActionService } from '../../enrollment/service/outreach-action.service.js';
import { closePendingDoctorReviewTasksForLifecycleService } from '../../dashboard/service/doctor-review.service.js';
import { scheduleAutomationAutoSend } from './automation-send-scheduler.service.js';
import { sendWecomOutreachActionService } from '../../enrollment/service/wecom-outreach.service.js';
import type { ActionGenerationDecision, AutoSendResult, WecomAutomationExecutionResult } from './wecom-automation.types.js';
import { resolvePatientIdByCustomerId } from './patient-mapping.service.js';

type WecomEventAutomationInput = {
  conversationId: string;
  messageId?: string;
  customerId?: string;
  chatType?: 'private' | 'group';
  event?: string;
  changeType?: string;
  contentType?: string;
  contentText?: string;
  lifecycleStatus?: string;
  messageCategory?: string;
};

function shouldAnalyzeConversation(input: WecomEventAutomationInput) {
  return input.messageCategory === 'customer_text';
}

function shouldGenerateLifecycleAction(input: WecomEventAutomationInput) {
  return (
    input.event === 'enter_agent'
    || (input.event === 'change_external_contact' && input.changeType === 'add_external_contact')
    || (input.event === 'change_external_contact' && input.changeType === 'edit_external_contact')
  );
}

function shouldAutoSendLifecycleAction(input: WecomEventAutomationInput) {
  return input.event === 'enter_agent' || (input.event === 'change_external_contact' && input.changeType === 'add_external_contact');
}

function shouldClosePendingActions(input: WecomEventAutomationInput) {
  if (input.event === 'change_external_contact' && input.changeType === 'del_external_contact') {
    return true;
  }
  if (input.event === 'change_external_chat' && input.changeType?.includes('dismiss')) {
    return true;
  }
  return false;
}

const IMMEDIATE_RISK_KEYWORDS = [
  '胸痛',
  '呼吸困难',
  '喘不上气',
  '晕厥',
  '昏迷',
  '抽搐',
  '意识模糊',
  '出血不止',
  '剧烈疼痛',
  '120',
  '急救'
];

function hasImmediateRiskSignal(contentText?: string) {
  const normalized = (contentText || '').trim();
  if (!normalized) return false;
  return IMMEDIATE_RISK_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function resolveAutomationContext(input: WecomEventAutomationInput) {
  if (input.event === 'enter_agent') {
    return {
      triggerSource: 'wecom_event' as const,
      actionTypeHint: 'welcome_followup' as const,
      stateTransition: 'welcome_pending_to_followup_pending'
    };
  }

  if (input.event === 'change_external_contact') {
    if (input.changeType === 'add_external_contact') {
      return {
        triggerSource: 'wecom_event' as const,
        actionTypeHint: 'welcome_followup' as const,
        stateTransition: 'contact_added_to_followup_pending'
      };
    }

    if (input.changeType === 'edit_external_contact') {
      return {
        triggerSource: 'wecom_event' as const,
        actionTypeHint: 'profile_completion' as const,
        stateTransition: 'contact_changed_to_profile_update_pending'
      };
    }

    if (input.changeType === 'del_external_contact') {
      return {
        triggerSource: 'wecom_event' as const,
        actionTypeHint: 'manual_followup' as const,
        stateTransition: 'contact_active_to_contact_lost'
      };
    }
  }

  if (input.event === 'change_external_chat') {
    return {
      triggerSource: 'wecom_event' as const,
      actionTypeHint: 'manual_followup' as const,
      stateTransition: input.changeType?.includes('dismiss')
        ? 'group_active_to_group_closed'
        : 'group_changed_to_followup_pending'
    };
  }

  return {
    triggerSource: 'wecom_automation' as const,
    actionTypeHint: 'manual_followup' as const,
    stateTransition: `${input.lifecycleStatus || 'message_received'}_to_followup_pending`
  };
}

export async function runWecomEventAutomation(input: WecomEventAutomationInput): Promise<WecomAutomationExecutionResult> {
  if (!shouldAnalyzeConversation(input) && !shouldGenerateLifecycleAction(input) && !shouldClosePendingActions(input)) {
    return {
      triggered: false,
      executionStatus: 'skipped',
      reason: 'event_not_in_automation_scope',
      insight: null,
      feedback: null,
      actions: null
    };
  }

  const insight = shouldAnalyzeConversation(input)
    ? await analyzeConversationMessages(input.conversationId, {
        customerId: input.customerId,
        limit: 50
      })
    : null;

  const feedback = input.customerId && insight ? await generateBusinessFeedback(input.conversationId, input.customerId) : null;
  const context = resolveAutomationContext(input);
  const resolvedLifecyclePatient = input.customerId && (shouldGenerateLifecycleAction(input) || shouldClosePendingActions(input))
    ? await resolvePatientIdByCustomerId(input.customerId, input.conversationId)
    : null;

  const closedActions = resolvedLifecyclePatient?.patientId && shouldClosePendingActions(input)
    ? await closePendingOutreachActionsForLifecycleService(
        resolvedLifecyclePatient.patientId,
        input.event === 'change_external_contact' ? 'contact_lost' : 'group_closed'
      )
    : { items: [], total: 0 };

  const closedDoctorTasks = resolvedLifecyclePatient?.patientId && shouldClosePendingActions(input)
    ? await closePendingDoctorReviewTasksForLifecycleService(resolvedLifecyclePatient.patientId)
    : { items: [], total: 0 };

  let actions = null;
  if (input.customerId && shouldAnalyzeConversation(input)) {
    actions = await generateBusinessActions(input.conversationId, input.customerId, undefined, {
        triggerSource: context.triggerSource,
        actionTypeHint: context.actionTypeHint
      });
  } else if (shouldGenerateLifecycleAction(input) && !resolvedLifecyclePatient?.patientId) {
    return {
      triggered: false,
      executionStatus: 'skipped',
      reason: 'pending_mapping',
      stateTransition: context.stateTransition,
      nextConversationStatus: input.event === 'enter_agent'
        ? 'welcome_pending'
        : context.actionTypeHint === 'profile_completion'
          ? 'profile_update_pending'
          : undefined,
      insight: null,
      feedback: null,
      actions: null,
      autoSendResult: null,
      lifecycleClosures: {
        outreach: { items: [], total: 0 },
        doctorReview: { items: [], total: 0 }
      }
    };
  } else if (shouldClosePendingActions(input) && !resolvedLifecyclePatient?.patientId) {
    return {
      triggered: false,
      executionStatus: 'skipped',
      reason: 'pending_mapping',
      stateTransition: context.stateTransition,
      nextConversationStatus: input.event === 'change_external_contact' && input.changeType === 'del_external_contact'
        ? 'contact_lost'
        : input.event === 'change_external_chat' && input.changeType?.includes('dismiss')
          ? 'group_closed'
          : undefined,
      insight: null,
      feedback: null,
      actions: null,
      autoSendResult: null,
      lifecycleClosures: {
        outreach: { items: [], total: 0 },
        doctorReview: { items: [], total: 0 }
      }
    };
  } else if (resolvedLifecyclePatient?.patientId && shouldGenerateLifecycleAction(input)) {
    const lifecycleSummary = input.changeType === 'edit_external_contact'
      ? '【企微资料补充】客户资料发生变化，建议补充完善关键资料。'
      : '【企微欢迎跟进】客户刚进入会话，建议发送欢迎与首轮信息采集。';
    const lifecycleAction = await ensurePriorityPatientOutreachActionService({
      patientId: resolvedLifecyclePatient.patientId,
      actionType: input.changeType === 'edit_external_contact' ? 'profile_completion' : 'welcome_followup',
      triggerSource: context.triggerSource,
      summary: lifecycleSummary,
      priority: 'medium'
    });
    const lifecycleDecision: ActionGenerationDecision = lifecycleAction.upgraded
      ? 'upgraded'
      : lifecycleAction.created
        ? 'created'
        : 'reused';
    actions = {
      feedback: null,
      patientMapping: {
        patientId: resolvedLifecyclePatient.patientId,
        patientName: resolvedLifecyclePatient.patientName,
        matchedBy: resolvedLifecyclePatient.matchedBy
      },
      customerLookup: null,
      outreachAction: lifecycleAction.action,
      outreachActionDecision: lifecycleDecision,
      supersededOutreachActions: lifecycleAction.closedActions,
      doctorReviewTask: null,
      doctorReviewDecision: 'skipped' as const,
      automation: {
        status: lifecycleDecision,
        reason: 'lifecycle_action_ready',
        priority: 'medium' as const,
        actionMode: 'followup_only' as const
      }
    };
  }

  let autoSendResult: AutoSendResult | null = null;
  if (actions?.outreachAction) {
    if (actions.automation.actionMode === 'doctor_review_and_followup') {
      autoSendResult = {
        status: 'skipped',
        reason: 'high_risk_requires_manual_review',
        actionId: actions.outreachAction.id,
        sendAttempted: false,
        retryable: false,
        action: actions.outreachAction,
        sendMode: 'none'
      };
    } else if (shouldAutoSendLifecycleAction(input)) {
      autoSendResult = await sendWecomOutreachActionService(actions.outreachAction.id, 'immediate');
    } else if (hasImmediateRiskSignal(input.contentText)) {
      autoSendResult = await sendWecomOutreachActionService(actions.outreachAction.id, 'immediate');
    } else if (input.chatType === 'private' && input.messageCategory === 'customer_text') {
      autoSendResult = await scheduleAutomationAutoSend({
        conversationId: input.conversationId,
        messageId: input.messageId,
        customerId: input.customerId,
        triggerEvent: input.event,
        triggerAction: input.changeType || input.contentType,
        lifecycleStatus: input.lifecycleStatus,
        stateTransition: context.stateTransition,
        actionId: actions.outreachAction.id,
        mergeWindowMs: Number(process.env.WECOM_PRIVATE_TEXT_MERGE_WINDOW_MS || 20_000)
      });
    } else {
      autoSendResult = {
        status: 'skipped',
        reason: 'current_input_does_not_auto_send',
        actionId: actions.outreachAction.id,
        sendAttempted: false,
        retryable: false,
        action: actions.outreachAction,
        sendMode: 'none'
      };
    }
  }

  return {
    triggered: Boolean(insight || actions || closedActions.total || closedDoctorTasks.total),
    executionStatus: autoSendResult?.status || (actions ? 'triggered' : shouldClosePendingActions(input) ? 'triggered' : 'skipped'),
    reason: autoSendResult?.reason || (actions ? 'conversation_automation_completed' : shouldClosePendingActions(input) ? 'lifecycle_closure_completed' : 'event_not_in_automation_scope'),
    stateTransition: context.stateTransition,
    nextConversationStatus: input.event === 'change_external_contact' && input.changeType === 'del_external_contact'
      ? 'contact_lost'
      : input.event === 'change_external_chat' && input.changeType?.includes('dismiss')
        ? 'group_closed'
        : input.event === 'enter_agent'
          ? 'welcome_pending'
          : context.actionTypeHint === 'profile_completion'
            ? 'profile_update_pending'
            : 'followup_pending',
    insight,
    feedback,
    actions,
    autoSendResult,
    lifecycleClosures: {
      outreach: closedActions,
      doctorReview: closedDoctorTasks
    }
  };
}
