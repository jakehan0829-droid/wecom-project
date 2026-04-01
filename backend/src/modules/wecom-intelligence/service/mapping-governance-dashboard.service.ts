import { getWecomMappingAuditSummaryService } from './mapping-audit-summary.service.js';
import { listMappingConflictWecomCustomersService, listUnmappedWecomCustomersService } from './mapping-observe.service.js';

export async function getWecomMappingGovernanceDashboardService(query: Record<string, unknown>) {
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 10;
  const summary = await getWecomMappingAuditSummaryService(query);
  const [unmapped, conflicts] = await Promise.all([
    listUnmappedWecomCustomersService(limit),
    listMappingConflictWecomCustomersService(limit)
  ]);

  return {
    meta: {
      timePreset: typeof query.timePreset === 'string' ? query.timePreset : null,
      startTime: typeof query.startTime === 'string' ? query.startTime : null,
      endTime: typeof query.endTime === 'string' ? query.endTime : null,
      limit
    },
    cards: summary.cards,
    charts: {
      byAction: summary.byAction,
      byMatchedBy: summary.byMatchedBy
    },
    tables: {
      byConversation: summary.byConversation,
      recentActions: summary.recent,
      latestUnmappedCustomers: unmapped,
      latestConflictCustomers: conflicts
    }
  };
}
