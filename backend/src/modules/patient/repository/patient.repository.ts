import { randomUUID } from 'node:crypto';
import { injectable } from 'tsyringe';
import { BaseRepository } from '../../../shared/repositories/base.repository.js';

export interface Patient {
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
}

export interface PatientProfileExt {
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
  updatedAt: string | null;
}

export interface PatientWecomBinding {
  id: string;
  bindingType: string;
  wecomUserId: string;
  externalUserId: string;
  bindingStatus: string;
  boundAt: string;
}

export interface PatientRepository {
  findAll(limit: number): Promise<Patient[]>;
  findById(id: string): Promise<Patient | null>;
  create(patient: Omit<Patient, 'id' | 'createdAt' | 'managementStatus'>): Promise<Patient>;
  updateProfile(patientId: string, profile: Partial<PatientProfileExt>): Promise<PatientProfileExt>;
  getProfile(patientId: string): Promise<PatientProfileExt | null>;
  getWecomBindings(patientId: string): Promise<PatientWecomBinding[]>;
}

@injectable()
export class PatientRepositoryImpl extends BaseRepository implements PatientRepository {
  async findAll(limit: number = 50): Promise<Patient[]> {
    const result = await this.query<Patient>(
      `select id, org_id as "orgId", name, gender, birth_date as "birthDate", mobile, diabetes_type as "diabetesType", risk_level as "riskLevel", source, management_status as "managementStatus", created_at as "createdAt"
       from patient
       order by created_at desc
       limit $1`,
      [limit]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Patient | null> {
    return this.queryOne<Patient>(
      `select id, org_id as "orgId", name, gender, birth_date as "birthDate", mobile, diabetes_type as "diabetesType", risk_level as "riskLevel", source, management_status as "managementStatus", created_at as "createdAt"
       from patient
       where id = $1
       limit 1`,
      [id]
    );
  }

  async create(patient: Omit<Patient, 'id' | 'createdAt' | 'managementStatus'>): Promise<Patient> {
    const id = randomUUID();
    const result = await this.query<Patient>(
      `insert into patient (id, org_id, name, gender, birth_date, mobile, diabetes_type, risk_level, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, org_id as "orgId", name, gender, birth_date as "birthDate", mobile, diabetes_type as "diabetesType", risk_level as "riskLevel", source, management_status as "managementStatus", created_at as "createdAt"`,
      [
        id,
        patient.orgId || null,
        patient.name,
        patient.gender,
        patient.birthDate || null,
        patient.mobile || null,
        patient.diabetesType || null,
        patient.riskLevel || null,
        patient.source || null
      ]
    );
    return result.rows[0];
  }

  async updateProfile(patientId: string, profile: Partial<PatientProfileExt>): Promise<PatientProfileExt> {
    const result = await this.query<PatientProfileExt>(
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
      [
        patientId,
        profile.basicInfo || null,
        profile.preferences || null,
        profile.coreProblem || null,
        profile.communicationSummary || null,
        profile.followupFocus || null,
        profile.personaSummary || null,
        profile.recentIssueSummary || null,
        profile.followupPlan || null,
        profile.sourceConversations || null
      ]
    );
    return result.rows[0];
  }

  async getProfile(patientId: string): Promise<PatientProfileExt | null> {
    return this.queryOne<PatientProfileExt>(
      `select patient_id as "patientId", basic_info as "basicInfo", preferences, core_problem as "coreProblem", communication_summary as "communicationSummary", followup_focus as "followupFocus", persona_summary as "personaSummary", recent_issue_summary as "recentIssueSummary", followup_plan as "followupPlan", source_conversations as "sourceConversations", updated_at as "updatedAt"
       from patient_profile_ext
       where patient_id = $1
       limit 1`,
      [patientId]
    );
  }

  async getWecomBindings(patientId: string): Promise<PatientWecomBinding[]> {
    const result = await this.query<PatientWecomBinding>(
      `select id, binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"
       from patient_wecom_binding
       where patient_id = $1
       order by created_at desc
       limit 10`,
      [patientId]
    );
    return result.rows;
  }
}