import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireEnum, requireString } from '../../../shared/utils/validators.js';

type CreatePatientPayload = {
  orgId?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  mobile?: string;
  diabetesType?: string;
  riskLevel?: string;
  source?: string;
};

export async function listPatientsService() {
  const result = await db.query(
    `select id, name, gender, birth_date as "birthDate", mobile, diabetes_type as "diabetesType", risk_level as "riskLevel", source, management_status as "managementStatus", created_at as "createdAt"
     from patient
     order by created_at desc
     limit 50`
  );

  return {
    items: result.rows,
    total: result.rowCount || 0
  };
}

export async function createPatientService(payload: CreatePatientPayload) {
  const name = requireString(payload.name, 'name');
  const gender = payload.gender ? requireEnum(payload.gender, 'gender', ['male', 'female', 'unknown']) : null;
  const riskLevel = payload.riskLevel ? requireEnum(payload.riskLevel, 'riskLevel', ['low', 'medium', 'high']) : null;
  const id = randomUUID();
  const result = await db.query(
    `insert into patient (id, org_id, name, gender, birth_date, mobile, diabetes_type, risk_level, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning id, name, gender, birth_date as "birthDate", mobile, diabetes_type as "diabetesType", risk_level as "riskLevel", source, management_status as "managementStatus", created_at as "createdAt"`,
    [id, payload.orgId || null, name, gender, payload.birthDate || null, payload.mobile || null, payload.diabetesType || null, riskLevel, payload.source || null]
  );

  return result.rows[0];
}

export async function getPatientDetailService(id: string) {
  const result = await db.query(
    `select id, name, gender, birth_date as "birthDate", mobile, diabetes_type as "diabetesType", risk_level as "riskLevel", source, management_status as "managementStatus", created_at as "createdAt"
     from patient
     where id = $1
     limit 1`,
    [id]
  );

  const patient = result.rows[0] || null;
  if (!patient) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
  }

  const [profileResult, bindingResult, conversationResult, latestInsightResult, pendingActionResult] = await Promise.all([
    db.query(
      `select basic_info as "basicInfo", preferences, core_problem as "coreProblem", communication_summary as "communicationSummary", followup_focus as "followupFocus", persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary", followup_plan as "followupPlan", source_conversations as "sourceConversations", updated_at as "profileUpdatedAt"
         from patient_profile_ext
        where patient_id = $1
        limit 1`,
      [id]
    ),
    db.query(
      `select id, binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"
         from patient_wecom_binding
        where patient_id = $1
        order by created_at desc
        limit 10`,
      [id]
    ),
    db.query(
      `select conversation_id as "conversationId", chat_type as "chatType", conversation_name as "conversationName", message_count as "messageCount", last_message_at as "lastMessageAt"
         from wecom_conversations
        where primary_customer_id = $1
        order by last_message_at desc nulls last
        limit 10`,
      [id]
    ),
    db.query(
      `select id as "insightId", summary as "summaryText", confidence, created_at as "generatedAt"
         from wecom_conversation_insights_v1
        where patient_ref = $1
        order by created_at desc
        limit 1`,
      [id]
    ),
    db.query(
      `select id, action_type as "actionType", trigger_source as "triggerSource", summary, status, created_at as "createdAt"
         from patient_outreach_action
        where patient_id = $1
          and status = 'pending'
        order by created_at desc
        limit 10`,
      [id]
    )
  ]);

  return {
    ...patient,
    profile: profileResult.rows[0] || null,
    wecomBindings: bindingResult.rows,
    recentConversations: conversationResult.rows,
    latestInsight: latestInsightResult.rows[0] || null,
    pendingActions: pendingActionResult.rows
  };
}

export async function updatePatientProfileService(id: string, payload: Record<string, unknown>) {
  const exists = await db.query(`select id from patient where id = $1 limit 1`, [id]);
  if (!exists.rows[0]) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
  }

  const basicInfo = typeof payload.basicInfo === 'string' ? payload.basicInfo.trim() : null;
  const preferences = typeof payload.preferences === 'string' ? payload.preferences.trim() : null;
  const coreProblem = typeof payload.coreProblem === 'string' ? payload.coreProblem.trim() : null;
  const communicationSummary = typeof payload.communicationSummary === 'string' ? payload.communicationSummary.trim() : null;
  const followupFocus = typeof payload.followupFocus === 'string' ? payload.followupFocus.trim() : null;
  const personaSummary = typeof payload.personaSummary === 'string' ? payload.personaSummary.trim() : null;
  const recentIssueSummary = typeof payload.recentIssueSummary === 'string' ? payload.recentIssueSummary.trim() : null;
  const followupPlan = typeof payload.followupPlan === 'string' ? payload.followupPlan.trim() : null;
  const sourceConversations = typeof payload.sourceConversations === 'string' ? payload.sourceConversations.trim() : null;

  const result = await db.query(
    `insert into patient_profile_ext (patient_id, basic_info, preferences, core_problem, communication_summary, followup_focus, persona_summary, recent_issue_summary, followup_plan, source_conversations, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (patient_id)
     do update set
       basic_info = excluded.basic_info,
       preferences = excluded.preferences,
       core_problem = excluded.core_problem,
       communication_summary = excluded.communication_summary,
       followup_focus = excluded.followup_focus,
       persona_summary = excluded.persona_summary,
       recent_issue_summary = excluded.recent_issue_summary,
       followup_plan = excluded.followup_plan,
       source_conversations = excluded.source_conversations,
       updated_at = now()
     returning patient_id as "patientId", basic_info as "basicInfo", preferences, core_problem as "coreProblem", communication_summary as "communicationSummary", followup_focus as "followupFocus", persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary", followup_plan as "followupPlan", source_conversations as "sourceConversations", updated_at as "updatedAt"`,
    [id, basicInfo, preferences, coreProblem, communicationSummary, followupFocus, personaSummary, recentIssueSummary, followupPlan, sourceConversations]
  );

  return result.rows[0];
}
