import { analyzeConversationMessages } from './insight.service.js';
import { generateBusinessFeedback } from './business-feedback.service.js';
import { generateBusinessActions } from './business-action.service.js';
import { closePendingOutreachActionsForLifecycleService } from '../../enrollment/service/outreach-action.service.js';
import { closePendingDoctorReviewTasksForLifecycleService } from '../../dashboard/service/doctor-review.service.js';

type WecomEventAutomationInput = {
  conversationId: string;
  customerId?: string;
  event?: string;
  changeType?: string;
  contentType?: string;
  contentText?: string;
  lifecycleStatus?: string;
};

function shouldAnalyzeConversation(input: WecomEventAutomationInput) {
  if (input.contentType === 'text' && input.contentText) return true;
  if (input.event === 'change_external_contact') return true;
  if (input.event === 'change_external_chat') return true;
  if (input.event === 'enter_agent') return true;
  return false;
}

function shouldGenerateActions(input: WecomEventAutomationInput) {
  if (input.event === 'change_external_contact' && input.changeType === 'del_external_contact') {
    return false;
  }
  return true;
}

function shouldGenerateInsight(input: WecomEventAutomationInput) {
  if (input.event === 'change_external_contact' && input.changeType === 'del_external_contact') {
    return false;
  }
  if (input.event === 'change_external_chat' && input.changeType?.includes('dismiss')) {
    return false;
  }
  return shouldAnalyzeConversation(input);
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

export async function runWecomEventAutomation(input: WecomEventAutomationInput) {
  if (!shouldAnalyzeConversation(input)) {
    return {
      triggered: false,
      reason: 'event_not_in_automation_scope',
      insight: null,
      feedback: null,
      actions: null
    };
  }

  const insight = shouldGenerateInsight(input)
    ? await analyzeConversationMessages(input.conversationId, {
        customerId: input.customerId,
        limit: 50
      })
    : null;

  const feedback = input.customerId ? await generateBusinessFeedback(input.conversationId, input.customerId) : null;
  const context = resolveAutomationContext(input);

  const closedActions = input.customerId && shouldClosePendingActions(input)
    ? await closePendingOutreachActionsForLifecycleService(
        input.customerId,
        input.event === 'change_external_contact' ? 'contact_lost' : 'group_closed'
      )
    : { items: [], total: 0 };

  const closedDoctorTasks = input.customerId && shouldClosePendingActions(input)
    ? await closePendingDoctorReviewTasksForLifecycleService(input.customerId)
    : { items: [], total: 0 };

  const actions = !input.customerId || !shouldGenerateActions(input)
    ? null
    : await generateBusinessActions(input.conversationId, input.customerId, undefined, {
        triggerSource: context.triggerSource,
        actionTypeHint: context.actionTypeHint
      });

  return {
    triggered: true,
    reason: 'conversation_automation_completed',
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
    lifecycleClosures: {
      outreach: closedActions,
      doctorReview: closedDoctorTasks
    }
  };
}
