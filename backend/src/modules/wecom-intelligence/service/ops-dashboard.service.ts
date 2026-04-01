import { db } from '../../../infra/db/pg.js';
import {
  getWecomMappingSummaryService,
  listMappingConflictWecomCustomersService,
  listUnmappedWecomCustomersService
} from './mapping-observe.service.js';

function pickCount(rows: any[], matcher: (row: any) => boolean) {
  return rows.filter(matcher).reduce((sum, row) => sum + Number(row.total || 0), 0);
}

export async function getWecomOpsSummaryService() {
  const [conversationStatus, actionSummary, auditSummary, mappingSummary, unmappedCustomers, conflictCustomers] = await Promise.all([
    db.query(
      `select status, count(*)::int as total
         from wecom_conversations
        group by status
        order by total desc`
    ),
    db.query(
      `select action_type, trigger_source, status, failure_reason, count(*)::int as total
         from patient_outreach_action
        where created_at::date = current_date
        group by action_type, trigger_source, status, failure_reason
        order by total desc`
    ),
    db.query(
      `select trigger_event, trigger_action, triggered, reason, count(*)::int as total
         from wecom_automation_audit
        where created_at::date = current_date
        group by trigger_event, trigger_action, triggered, reason
        order by total desc`
    ),
    getWecomMappingSummaryService(),
    listUnmappedWecomCustomersService(10),
    listMappingConflictWecomCustomersService(10)
  ]);

  const conversationRows = conversationStatus.rows as any[];
  const actionRows = actionSummary.rows as any[];
  const auditRows = auditSummary.rows as any[];

  return {
    current: {
      activeConversations: pickCount(conversationRows, (row) => row.status === 'active'),
      groupClosedConversations: pickCount(conversationRows, (row) => row.status === 'group_closed'),
      contactLostConversations: pickCount(conversationRows, (row) => row.status === 'contact_lost'),
      welcomePendingConversations: pickCount(conversationRows, (row) => row.status === 'welcome_pending'),
      profileUpdatePendingConversations: pickCount(conversationRows, (row) => row.status === 'profile_update_pending'),
      followupPendingConversations: pickCount(conversationRows, (row) => row.status === 'followup_pending')
    },
    today: {
      createdWelcomeFollowup: pickCount(actionRows, (row) => row.action_type === 'welcome_followup' && row.status === 'pending'),
      createdProfileCompletion: pickCount(actionRows, (row) => row.action_type === 'profile_completion' && row.status === 'pending'),
      createdManualFollowup: pickCount(actionRows, (row) => row.action_type === 'manual_followup' && row.status === 'pending'),
      closedByGroupClosed: pickCount(actionRows, (row) => row.status === 'closed' && row.failure_reason === 'closed_by_group_closed'),
      closedByContactLost: pickCount(actionRows, (row) => row.status === 'closed' && row.failure_reason === 'closed_by_contact_lost'),
      duplicateSkipped: pickCount(auditRows, (row) => row.triggered === false && String(row.reason || '').startsWith('duplicate_')),
      automationTriggered: pickCount(auditRows, (row) => row.triggered === true),
      automationSkipped: pickCount(auditRows, (row) => row.triggered === false)
    },
    mapping: {
      summary: mappingSummary,
      latestUnmappedCustomers: unmappedCustomers,
      latestConflictCustomers: conflictCustomers
    },
    raw: {
      conversationStatus: conversationRows,
      actionSummary: actionRows,
      automationSummary: auditRows
    }
  };
}
