import { inject, injectable } from 'tsyringe';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireEnum, requireString } from '../../../shared/utils/validators.js';
import type { PatientRepository } from '../repository/patient.repository.js';

export interface CreatePatientPayload {
  orgId?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  mobile?: string;
  diabetesType?: string;
  riskLevel?: string;
  source?: string;
}

export interface PatientDetail {
  id: string;
  orgId: string | null;
  name: string;
  gender: 'male' | 'female' | 'unknown' | null;
  birthDate: string | null;
  mobile: string | null;
  diabetesType: string | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  source: string | null;
  managementStatus: string | null;
  createdAt: string;
  profile: {
    basicInfo: string | null;
    preferences: string | null;
    coreProblem: string | null;
    communicationSummary: string | null;
    followupFocus: string | null;
    personaSummary: string | null;
    recentIssueSummary: string | null;
    followupPlan: string | null;
    sourceConversations: string | null;
    profileUpdatedAt: string | null;
  } | null;
  wecomBindings: Array<{
    id: string;
    bindingType: string;
    wecomUserId: string;
    externalUserId: string;
    bindingStatus: string;
    boundAt: string;
  }>;
  recentConversations: Array<{
    conversationId: string;
    chatType: string;
    conversationName: string;
    messageCount: number;
    lastMessageAt: string | null;
  }>;
  latestInsight: {
    insightId: string;
    summaryText: string;
    confidence: number;
    generatedAt: string;
  } | null;
  pendingActions: Array<{
    id: string;
    actionType: string;
    triggerSource: string;
    summary: string;
    status: string;
    createdAt: string;
  }>;
}

@injectable()
export class PatientService {
  constructor(
    @inject('PatientRepository') private readonly patientRepository: PatientRepository
  ) {}

  async listPatients() {
    const patients = await this.patientRepository.findAll(50);
    return {
      items: patients,
      total: patients.length
    };
  }

  async createPatient(payload: CreatePatientPayload) {
    const name = requireString(payload.name, 'name');
    const gender = payload.gender ? requireEnum(payload.gender, 'gender', ['male', 'female', 'unknown']) as 'male' | 'female' | 'unknown' : null;
    const riskLevel = payload.riskLevel ? requireEnum(payload.riskLevel, 'riskLevel', ['low', 'medium', 'high']) as 'low' | 'medium' | 'high' : null;

    const patient = await this.patientRepository.create({
      orgId: payload.orgId || null,
      name,
      gender,
      birthDate: payload.birthDate || null,
      mobile: payload.mobile || null,
      diabetesType: payload.diabetesType || null,
      riskLevel,
      source: payload.source || null
    });

    return patient;
  }

  async getPatientDetail(id: string): Promise<PatientDetail> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
    }

    const [
      profile,
      wecomBindings,
      recentConversations,
      latestInsight,
      pendingActions
    ] = await Promise.all([
      this.patientRepository.getProfile(id),
      this.patientRepository.getWecomBindings(id),
      this.getRecentConversations(id),
      this.getLatestInsight(id),
      this.getPendingActions(id)
    ]);

    return {
      ...patient,
      profile: profile ? {
        basicInfo: profile.basicInfo,
        preferences: profile.preferences,
        coreProblem: profile.coreProblem,
        communicationSummary: profile.communicationSummary,
        followupFocus: profile.followupFocus,
        personaSummary: profile.personaSummary,
        recentIssueSummary: profile.recentIssueSummary,
        followupPlan: profile.followupPlan,
        sourceConversations: profile.sourceConversations,
        profileUpdatedAt: profile.updatedAt
      } : null,
      wecomBindings,
      recentConversations,
      latestInsight,
      pendingActions
    };
  }

  async updatePatientProfile(id: string, payload: Record<string, unknown>) {
    // 检查患者是否存在
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
    }

    const profileUpdate = {
      basicInfo: typeof payload.basicInfo === 'string' ? payload.basicInfo.trim() : null,
      preferences: typeof payload.preferences === 'string' ? payload.preferences.trim() : null,
      coreProblem: typeof payload.coreProblem === 'string' ? payload.coreProblem.trim() : null,
      communicationSummary: typeof payload.communicationSummary === 'string' ? payload.communicationSummary.trim() : null,
      followupFocus: typeof payload.followupFocus === 'string' ? payload.followupFocus.trim() : null,
      personaSummary: typeof payload.personaSummary === 'string' ? payload.personaSummary.trim() : null,
      recentIssueSummary: typeof payload.recentIssueSummary === 'string' ? payload.recentIssueSummary.trim() : null,
      followupPlan: typeof payload.followupPlan === 'string' ? payload.followupPlan.trim() : null,
      sourceConversations: typeof payload.sourceConversations === 'string' ? payload.sourceConversations.trim() : null
    };

    const updatedProfile = await this.patientRepository.updateProfile(id, profileUpdate);
    return updatedProfile;
  }

  private async getRecentConversations(patientId: string) {
    const result = await db.query(
      `select conversation_id as "conversationId", chat_type as "chatType", conversation_name as "conversationName", message_count as "messageCount", last_message_at as "lastMessageAt"
       from wecom_conversations
       where primary_customer_id = $1
       order by last_message_at desc nulls last
       limit 10`,
      [patientId]
    );
    return result.rows;
  }

  private async getLatestInsight(patientId: string) {
    const result = await db.query(
      `select insight_id as "insightId", summary_text as "summaryText", confidence_score as "confidence", generated_at as "generatedAt"
       from wecom_conversation_insights
       where linked_customer_id = $1
       order by generated_at desc
       limit 1`,
      [patientId]
    );
    return result.rows[0] || null;
  }

  private async getPendingActions(patientId: string) {
    const result = await db.query(
      `select id, action_type as "actionType", trigger_source as "triggerSource", summary, status, created_at as "createdAt"
       from patient_outreach_action
       where patient_id = $1
         and status = 'pending'
       order by created_at desc
       limit 10`,
      [patientId]
    );
    return result.rows;
  }
}