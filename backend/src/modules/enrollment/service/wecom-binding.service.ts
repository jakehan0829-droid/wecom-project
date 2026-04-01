import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import { requireEnum, requireString } from '../../../shared/utils/validators.js';

type BindPayload = {
  bindingType?: string;
  wecomUserId?: string;
  externalUserId?: string;
};

async function ensurePatientExists(patientId: string) {
  const result = await db.query(
    `select id from patient where id = $1 limit 1`,
    [patientId]
  );

  if (!result.rows[0]) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
  }
}

async function findLatestBinding(patientId: string) {
  const result = await db.query(
    `select id, patient_id as "patientId", binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"
     from patient_wecom_binding
     where patient_id = $1
     order by created_at desc
     limit 1`,
    [patientId]
  );

  return result.rows[0] || null;
}

function normalizeBindingPayload(bindingType: string, payload: BindPayload) {
  if (bindingType === 'wecom_user') {
    const wecomUserId = requireString(payload.wecomUserId, 'wecomUserId');
    if (payload.externalUserId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, 'externalUserId is not allowed when bindingType=wecom_user');
    }
    return {
      wecomUserId,
      externalUserId: null
    };
  }

  const externalUserId = requireString(payload.externalUserId, 'externalUserId');
  if (payload.wecomUserId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, 'wecomUserId is not allowed when bindingType=external_user');
  }
  return {
    wecomUserId: null,
    externalUserId
  };
}

export async function bindWecomService(patientId: string, payload: BindPayload) {
  await ensurePatientExists(patientId);

  const bindingType = requireEnum(payload.bindingType, 'bindingType', ['wecom_user', 'external_user']);
  const normalized = normalizeBindingPayload(bindingType, payload);
  const latestBinding = await findLatestBinding(patientId);

  if (
    latestBinding &&
    latestBinding.bindingType === bindingType &&
    latestBinding.wecomUserId === normalized.wecomUserId &&
    latestBinding.externalUserId === normalized.externalUserId &&
    latestBinding.bindingStatus === 'bound'
  ) {
    return latestBinding;
  }

  const id = randomUUID();
  const result = await db.query(
    `insert into patient_wecom_binding (id, patient_id, binding_type, wecom_user_id, external_user_id, binding_status, bound_at)
     values ($1,$2,$3,$4,$5,'bound', now())
     returning id, patient_id as "patientId", binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"`,
    [id, patientId, bindingType, normalized.wecomUserId, normalized.externalUserId]
  );

  return result.rows[0];
}

export async function getWecomBindingService(patientId: string) {
  const result = await db.query(
    `select id, patient_id as "patientId", binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"
     from patient_wecom_binding
     where patient_id = $1
     order by created_at desc
     limit 1`,
    [patientId]
  );

  return result.rows[0] || null;
}
