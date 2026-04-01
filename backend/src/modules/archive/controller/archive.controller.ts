import {
  getMemberArchiveService,
  upsertMemberArchiveService,
  getArchiveChangeLogService,
  searchMemberArchivesService,
  getConversationMemberArchivesService,
  analyzeMessageAndUpdateArchive,
  analyzeArchiveForImprovements,
  analyzeConversationAndUpdateArchives,
  getArchiveAnalysisHistory,
  type MemberArchiveRecord
} from '../service/archive.service.js';
import type { MessageAnalysisInput } from '../../wecom-intelligence/service/ai-model.service.js';

// 获取成员档案详情
export async function getMemberArchive(userId: string) {
  const archive = await getMemberArchiveService(userId);
  if (!archive) {
    return {
      exists: false,
      archive: null,
      message: 'member archive not found'
    };
  }

  const changeLog = await getArchiveChangeLogService('member', archive.id, 10);

  return {
    exists: true,
    archive,
    changeLog,
    lastUpdated: archive.updatedAt
  };
}

// 创建或更新成员档案
export async function upsertMemberArchive(
  userId: string,
  payload: Record<string, unknown>,
  operatorId = 'system'
) {
  const validPayload = {
    conversationId: typeof payload.conversationId === 'string' ? payload.conversationId : undefined,
    basicInfo: typeof payload.basicInfo === 'string' ? payload.basicInfo : undefined,
    preferences: typeof payload.preferences === 'string' ? payload.preferences : undefined,
    coreProblem: typeof payload.coreProblem === 'string' ? payload.coreProblem : undefined,
    communicationSummary: typeof payload.communicationSummary === 'string' ? payload.communicationSummary : undefined,
    followupFocus: typeof payload.followupFocus === 'string' ? payload.followupFocus : undefined,
    personaSummary: typeof payload.personaSummary === 'string' ? payload.personaSummary : undefined,
    recentIssueSummary: typeof payload.recentIssueSummary === 'string' ? payload.recentIssueSummary : undefined,
    followupPlan: typeof payload.followupPlan === 'string' ? payload.followupPlan : undefined,
    sourceConversations: typeof payload.sourceConversations === 'string' ? payload.sourceConversations : undefined
  };

  const archive = await upsertMemberArchiveService(userId, validPayload, operatorId);
  const changeLog = await getArchiveChangeLogService('member', archive.id, 5);

  return {
    archive,
    changeLog,
    operation: archive.createdAt === archive.updatedAt ? 'created' : 'updated'
  };
}

// 搜索成员档案
export async function searchMemberArchives(query: Record<string, unknown>) {
  const validQuery = {
    keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
    limit: typeof query.limit === 'string' ? Number(query.limit) : 20,
    offset: typeof query.offset === 'string' ? Number(query.offset) : 0
  };

  if (validQuery.limit > 100) validQuery.limit = 100;
  if (validQuery.offset < 0) validQuery.offset = 0;

  return searchMemberArchivesService(validQuery);
}

// 获取会话相关的成员档案
export async function getConversationMemberArchives(conversationId: string) {
  const archives = await getConversationMemberArchivesService(conversationId);

  // 为每个档案获取简要变更历史
  const archivesWithChanges = await Promise.all(
    archives.map(async (archive) => {
      const changeLog = await getArchiveChangeLogService('member', archive.id, 3);
      return {
        ...archive,
        recentChanges: changeLog.length,
        lastChange: changeLog[0]?.createdAt || archive.updatedAt
      };
    })
  );

  return {
    conversationId,
    total: archives.length,
    items: archivesWithChanges
  };
}

// 获取患者档案变更历史（复用现有patient模块，这里提供统一接口）
export async function getPatientArchiveChangeLog(patientId: string, limit = 20) {
  return getArchiveChangeLogService('patient', patientId, limit);
}

// 需要导入db和randomUUID
import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';

// 批量更新成员档案（用于模型批量处理）
export async function batchUpdateMemberArchives(
  updates: Array<{
    userId: string;
    updates: Record<string, unknown>;
    changeReason: string;
  }>,
  operatorId = 'system'
) {
  const results: Array<{
    userId: string;
    success: boolean;
    archive?: MemberArchiveRecord;
    error?: string;
  }> = [];

  for (const update of updates) {
    try {
      const archive = await upsertMemberArchiveService(update.userId, update.updates, operatorId);

      // 记录特定的变更原因
      if (update.changeReason) {
        await db.query(
          `insert into archive_change_log (
            id, archive_type, archive_id, field_name, old_value, new_value,
            change_reason, operator_id, created_at
          ) values ($1, 'member', $2, 'batch_update', null, null, $3, $4, now())`,
          [randomUUID(), archive.id, update.changeReason, operatorId]
        );
      }

      results.push({
        userId: update.userId,
        success: true,
        archive
      });
    } catch (error) {
      results.push({
        userId: update.userId,
        success: false,
        error: error instanceof Error ? error.message : 'unknown error'
      });
    }
  }

  return {
    total: updates.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

// 分析消息并更新档案（AI集成）
export async function analyzeMessageAndUpdateArchiveController(payload: Record<string, unknown>) {
  const validInput: MessageAnalysisInput = {
    messageId: typeof payload.messageId === 'string' ? payload.messageId : '',
    conversationId: typeof payload.conversationId === 'string' ? payload.conversationId : '',
    senderId: typeof payload.senderId === 'string' ? payload.senderId : '',
    senderRole: typeof payload.senderRole === 'string' ? payload.senderRole : 'unknown',
    content: typeof payload.content === 'string' ? payload.content : '',
    timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : new Date().toISOString(),
    conversationContext: Array.isArray(payload.conversationContext) ? payload.conversationContext : undefined
  };

  return analyzeMessageAndUpdateArchive(validInput);
}

// 分析档案并生成完善建议
export async function analyzeArchiveForImprovementsController(
  archiveType: string,
  archiveId: string,
  payload: Record<string, unknown>
) {
  const recentConversations = Array.isArray(payload.recentConversations)
    ? payload.recentConversations
    : undefined;

  return analyzeArchiveForImprovements(
    archiveType as 'member' | 'patient',
    archiveId,
    recentConversations
  );
}

// 分析会话并更新成员档案
export async function analyzeConversationAndUpdateArchivesController(conversationId: string, payload: Record<string, unknown>) {
  const messageLimit = typeof payload.messageLimit === 'number' ? payload.messageLimit : 50;

  return analyzeConversationAndUpdateArchives(conversationId, messageLimit);
}

// 获取档案分析历史
export async function getArchiveAnalysisHistoryController(
  archiveType: string,
  archiveId: string,
  query: Record<string, unknown>
) {
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 10;

  return getArchiveAnalysisHistory(
    archiveType as 'member' | 'patient',
    archiveId,
    limit
  );
}