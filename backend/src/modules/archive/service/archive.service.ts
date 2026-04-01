import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';

// 成员档案类型
export type MemberArchiveRecord = {
  id: string;
  userId: string;
  conversationId: string | null;
  basicInfo: string | null;
  preferences: string | null;
  coreProblem: string | null;
  communicationSummary: string | null;
  followupFocus: string | null;
  personaSummary: string | null;
  recentIssueSummary: string | null;
  followupPlan: string | null;
  sourceConversations: string | null;
  updatedAt: string;
  createdAt: string;
};

// 档案变更记录类型
export type ArchiveChangeLogRecord = {
  id: string;
  archiveType: 'patient' | 'member';
  archiveId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changeReason: string | null;
  operatorId: string | null;
  createdAt: string;
};

// 获取成员档案详情
export async function getMemberArchiveService(userId: string): Promise<MemberArchiveRecord | null> {
  const result = await db.query(
    `select id, user_id as "userId", conversation_id as "conversationId",
            basic_info as "basicInfo", preferences, core_problem as "coreProblem",
            communication_summary as "communicationSummary", followup_focus as "followupFocus",
            persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary",
            followup_plan as "followupPlan", source_conversations as "sourceConversations",
            updated_at as "updatedAt", created_at as "createdAt"
       from member_archive
      where user_id = $1
      limit 1`,
    [userId]
  );

  return result.rows[0] || null;
}

// 创建或更新成员档案
export async function upsertMemberArchiveService(
  userId: string,
  payload: {
    conversationId?: string;
    basicInfo?: string;
    preferences?: string;
    coreProblem?: string;
    communicationSummary?: string;
    followupFocus?: string;
    personaSummary?: string;
    recentIssueSummary?: string;
    followupPlan?: string;
    sourceConversations?: string;
  },
  operatorId = 'system'
): Promise<MemberArchiveRecord> {
  const id = randomUUID();

  const result = await db.query(
    `insert into member_archive (
      id, user_id, conversation_id,
      basic_info, preferences, core_problem, communication_summary,
      followup_focus, persona_summary, recent_issue_summary,
      followup_plan, source_conversations, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
    on conflict (user_id)
    do update set
      conversation_id = coalesce(excluded.conversation_id, member_archive.conversation_id),
      basic_info = coalesce(excluded.basic_info, member_archive.basic_info),
      preferences = coalesce(excluded.preferences, member_archive.preferences),
      core_problem = coalesce(excluded.core_problem, member_archive.core_problem),
      communication_summary = coalesce(excluded.communication_summary, member_archive.communication_summary),
      followup_focus = coalesce(excluded.followup_focus, member_archive.followup_focus),
      persona_summary = coalesce(excluded.persona_summary, member_archive.persona_summary),
      recent_issue_summary = coalesce(excluded.recent_issue_summary, member_archive.recent_issue_summary),
      followup_plan = coalesce(excluded.followup_plan, member_archive.followup_plan),
      source_conversations = coalesce(excluded.source_conversations, member_archive.source_conversations),
      updated_at = now()
    returning
      id, user_id as "userId", conversation_id as "conversationId",
      basic_info as "basicInfo", preferences, core_problem as "coreProblem",
      communication_summary as "communicationSummary", followup_focus as "followupFocus",
      persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary",
      followup_plan as "followupPlan", source_conversations as "sourceConversations",
      updated_at as "updatedAt", created_at as "createdAt"`,
    [
      id, userId,
      payload.conversationId || null,
      payload.basicInfo?.trim() || null,
      payload.preferences?.trim() || null,
      payload.coreProblem?.trim() || null,
      payload.communicationSummary?.trim() || null,
      payload.followupFocus?.trim() || null,
      payload.personaSummary?.trim() || null,
      payload.recentIssueSummary?.trim() || null,
      payload.followupPlan?.trim() || null,
      payload.sourceConversations?.trim() || null
    ]
  );

  const updatedArchive = result.rows[0];

  // 记录变更日志（简化版本，实际应记录每个字段的变更）
  if (operatorId) {
    await db.query(
      `insert into archive_change_log (
        id, archive_type, archive_id, field_name, old_value, new_value,
        change_reason, operator_id, created_at
      ) values ($1, 'member', $2, 'full_update', null, null, 'upsert via api', $3, now())`,
      [randomUUID(), updatedArchive.id, operatorId]
    );
  }

  return updatedArchive;
}

// 获取档案变更历史
export async function getArchiveChangeLogService(
  archiveType: 'patient' | 'member',
  archiveId: string,
  limit = 20
): Promise<ArchiveChangeLogRecord[]> {
  const result = await db.query(
    `select id, archive_type as "archiveType", archive_id as "archiveId",
            field_name as "fieldName", old_value as "oldValue", new_value as "newValue",
            change_reason as "changeReason", operator_id as "operatorId",
            created_at as "createdAt"
       from archive_change_log
      where archive_type = $1 and archive_id = $2
      order by created_at desc
      limit $3`,
    [archiveType, archiveId, limit]
  );

  return result.rows;
}

// 搜索成员档案
export async function searchMemberArchivesService(query: {
  keyword?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: MemberArchiveRecord[]; total: number }> {
  const limit = query.limit || 20;
  const offset = query.offset || 0;
  const keyword = query.keyword?.trim();

  let whereClause = '1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (keyword) {
    whereClause += ` and (
      basic_info ilike $${paramIndex} or
      preferences ilike $${paramIndex} or
      core_problem ilike $${paramIndex} or
      communication_summary ilike $${paramIndex} or
      persona_summary ilike $${paramIndex}
    )`;
    params.push(`%${keyword}%`);
    paramIndex++;
  }

  const countResult = await db.query(
    `select count(*) as total from member_archive where ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  const searchParams = [...params, limit, offset];
  const searchResult = await db.query(
    `select id, user_id as "userId", conversation_id as "conversationId",
            basic_info as "basicInfo", preferences, core_problem as "coreProblem",
            communication_summary as "communicationSummary", followup_focus as "followupFocus",
            persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary",
            followup_plan as "followupPlan", source_conversations as "sourceConversations",
            updated_at as "updatedAt", created_at as "createdAt"
       from member_archive
      where ${whereClause}
      order by updated_at desc
      limit $${paramIndex} offset $${paramIndex + 1}`,
    searchParams
  );

  return {
    items: searchResult.rows,
    total
  };
}

// 获取会话相关的成员档案
export async function getConversationMemberArchivesService(conversationId: string): Promise<MemberArchiveRecord[]> {
  const result = await db.query(
    `select ma.id, ma.user_id as "userId", ma.conversation_id as "conversationId",
            ma.basic_info as "basicInfo", ma.preferences, ma.core_problem as "coreProblem",
            ma.communication_summary as "communicationSummary", ma.followup_focus as "followupFocus",
            ma.persona_summary as "personaSummary", ma.recent_issue_summary as "recentIssueSummary",
            ma.followup_plan as "followupPlan", ma.source_conversations as "sourceConversations",
            ma.updated_at as "updatedAt", ma.created_at as "createdAt"
       from member_archive ma
       join wecom_conversation_participants wcp on ma.user_id = wcp.user_id
      where wcp.conversation_id = $1
        and wcp.role_type = 'customer'
      order by ma.updated_at desc`,
    [conversationId]
  );

  return result.rows;
}

// AI集成预留接口
import { aiModelService } from '../../wecom-intelligence/service/ai-model.service.js';
import type {
  MessageAnalysisInput,
  ArchiveAnalysisInput,
  ArchiveAnalysisResult
} from '../../wecom-intelligence/service/ai-model.service.js';

// 分析消息并更新成员档案
export async function analyzeMessageAndUpdateArchive(
  messageInput: MessageAnalysisInput
): Promise<{
  analysis: any; // MessageAnalysisResult类型从ai-model导入
  archiveUpdated: boolean;
  updatedArchive?: MemberArchiveRecord;
}> {
  // 调用AI模型服务分析消息
  const analysis = await aiModelService.analyzeMessage(messageInput);

  let archiveUpdated = false;
  let updatedArchive: MemberArchiveRecord | undefined;

  // 如果分析结果包含档案更新，并且发送者是客户，则更新成员档案
  if (messageInput.senderRole === 'customer' && analysis.archiveUpdates.memberArchiveUpdates) {
    const updates = analysis.archiveUpdates.memberArchiveUpdates;
    if (Object.keys(updates).length > 0) {
      try {
        // 转换AI分析结果到档案更新字段
        const archiveUpdates: Record<string, unknown> = {};

        if (updates.basicInfo) {
          archiveUpdates.basicInfo = updates.basicInfo;
        }
        if (updates.coreProblem) {
          archiveUpdates.coreProblem = updates.coreProblem;
        }
        // 可以根据需要添加更多字段映射

        // 更新成员档案
        updatedArchive = await upsertMemberArchiveService(
          messageInput.senderId,
          archiveUpdates,
          'ai-system'
        );
        archiveUpdated = true;
      } catch (error) {
        console.error('[Archive AI] Failed to update member archive:', error);
        throw error;
      }
    }
  }

  return { analysis, archiveUpdated, updatedArchive };
}

// 分析档案并生成完善建议
export async function analyzeArchiveForImprovements(
  archiveType: 'member' | 'patient',
  archiveId: string,
  recentConversations?: Array<{
    conversationId: string;
    messages: Array<{
      senderRole: string;
      content: string;
      timestamp: string;
    }>;
  }>
): Promise<ArchiveAnalysisResult> {
  // 获取当前档案数据
  let currentArchive: Record<string, unknown> = {};

  if (archiveType === 'member') {
    const archive = await getMemberArchiveService(archiveId); // 注意：这里需要按userId查询，不是archiveId
    if (archive) {
      currentArchive = {
        basicInfo: archive.basicInfo,
        preferences: archive.preferences,
        coreProblem: archive.coreProblem,
        communicationSummary: archive.communicationSummary,
        followupFocus: archive.followupFocus,
        personaSummary: archive.personaSummary,
        recentIssueSummary: archive.recentIssueSummary,
        followupPlan: archive.followupPlan
      };
    }
  } else {
    // TODO: 患者档案查询
    // 暂时留空
  }

  const input: ArchiveAnalysisInput = {
    archiveType,
    archiveId,
    currentArchive,
    recentConversations: recentConversations || []
  };

  return aiModelService.analyzeArchive(input);
}

// 分析整个会话并更新所有参与成员的档案
export async function analyzeConversationAndUpdateArchives(
  conversationId: string,
  messageLimit = 50
): Promise<{
  conversationId: string;
  totalMessages: number;
  archivesUpdated: number;
  analysisSummary: string[];
}> {
  // TODO: 获取会话消息
  // 暂时返回模拟结果
  console.log(`[Archive AI] Would analyze conversation ${conversationId} and update member archives`);

  return {
    conversationId,
    totalMessages: 0,
    archivesUpdated: 0,
    analysisSummary: ['AI analysis integration pending']
  };
}

// 获取档案的AI分析历史
export async function getArchiveAnalysisHistory(
  archiveType: 'member' | 'patient',
  archiveId: string,
  limit = 10
): Promise<Array<{
  analysisId: string;
  analysisType: string;
  insights: string[];
  confidence: number;
  timestamp: string;
}>> {
  // TODO: 实现分析历史记录
  // 暂时返回空数组
  return [];
}

// 患者档案类型
export type PatientProfileRecord = {
  patientId: string;
  basicInfo: string | null;
  preferences: string | null;
  coreProblem: string | null;
  communicationSummary: string | null;
  followupFocus: string | null;
  personaSummary: string | null;
  recentIssueSummary: string | null;
  followupPlan: string | null;
  sourceConversations: string | null;
  updatedAt: string;
};

// 创建或更新患者档案
export async function upsertPatientProfileService(
  patientId: string,
  payload: {
    basicInfo?: string;
    preferences?: string;
    coreProblem?: string;
    communicationSummary?: string;
    followupFocus?: string;
    personaSummary?: string;
    recentIssueSummary?: string;
    followupPlan?: string;
    sourceConversations?: string;
  },
  operatorId = 'system'
): Promise<PatientProfileRecord> {
  const result = await db.query(
    `insert into patient_profile_ext (
      patient_id,
      basic_info, preferences, core_problem, communication_summary,
      followup_focus, persona_summary, recent_issue_summary,
      followup_plan, source_conversations, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    on conflict (patient_id)
    do update set
      basic_info = coalesce(excluded.basic_info, patient_profile_ext.basic_info),
      preferences = coalesce(excluded.preferences, patient_profile_ext.preferences),
      core_problem = coalesce(excluded.core_problem, patient_profile_ext.core_problem),
      communication_summary = coalesce(excluded.communication_summary, patient_profile_ext.communication_summary),
      followup_focus = coalesce(excluded.followup_focus, patient_profile_ext.followup_focus),
      persona_summary = coalesce(excluded.persona_summary, patient_profile_ext.persona_summary),
      recent_issue_summary = coalesce(excluded.recent_issue_summary, patient_profile_ext.recent_issue_summary),
      followup_plan = coalesce(excluded.followup_plan, patient_profile_ext.followup_plan),
      source_conversations = coalesce(excluded.source_conversations, patient_profile_ext.source_conversations),
      updated_at = now()
    returning
      patient_id as "patientId",
      basic_info as "basicInfo", preferences, core_problem as "coreProblem",
      communication_summary as "communicationSummary", followup_focus as "followupFocus",
      persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary",
      followup_plan as "followupPlan", source_conversations as "sourceConversations",
      updated_at as "updatedAt"`,
    [
      patientId,
      payload.basicInfo?.trim() || null,
      payload.preferences?.trim() || null,
      payload.coreProblem?.trim() || null,
      payload.communicationSummary?.trim() || null,
      payload.followupFocus?.trim() || null,
      payload.personaSummary?.trim() || null,
      payload.recentIssueSummary?.trim() || null,
      payload.followupPlan?.trim() || null,
      payload.sourceConversations?.trim() || null
    ]
  );

  const updatedProfile = result.rows[0];

  // 记录变更日志
  if (operatorId) {
    await db.query(
      `insert into archive_change_log (
        id, archive_type, archive_id, field_name, old_value, new_value,
        change_reason, operator_id, created_at
      ) values ($1, 'patient', $2, 'full_update', null, null, 'upsert via ai-system', $3, now())`,
      [randomUUID(), patientId, operatorId]
    );
  }

  return updatedProfile;
}

// 获取患者档案
export async function getPatientProfileService(patientId: string): Promise<PatientProfileRecord | null> {
  const result = await db.query(
    `select patient_id as "patientId",
            basic_info as "basicInfo", preferences, core_problem as "coreProblem",
            communication_summary as "communicationSummary", followup_focus as "followupFocus",
            persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary",
            followup_plan as "followupPlan", source_conversations as "sourceConversations",
            updated_at as "updatedAt"
       from patient_profile_ext
      where patient_id = $1
      limit 1`,
    [patientId]
  );

  return result.rows[0] || null;
}