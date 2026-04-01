import { db } from '../../../infra/db/pg.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';
import {
  assignConversationPrimaryCustomer,
  clearConversationPrimaryCustomer
} from './conversation.service.js';
import {
  listMappingConflictWecomCustomersService,
  listUnmappedWecomCustomersService
} from './mapping-observe.service.js';
import { createWecomMappingAuditService } from './mapping-audit.service.js';
import { refreshConversationMappingStateService } from './mapping-state.service.js';
import { lookupCustomerMapping } from './patient-mapping.service.js';
import { randomUUID } from 'node:crypto';

async function ensureConversationExists(conversationId: string) {
  const result = await db.query(
    `select conversation_id, platform_chat_id, primary_customer_id
       from wecom_conversations
      where conversation_id = $1
      limit 1`,
    [conversationId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'conversation not found');
  }

  return row;
}

async function ensurePatientExists(patientId: string) {
  const result = await db.query(
    `select id, name from patient where id = $1 limit 1`,
    [patientId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'patient not found');
  }

  return {
    patientId: row.id as string,
    patientName: row.name as string
  };
}

async function writeMappingEvent(payload: {
  conversationId: string;
  patientId?: string | null;
  eventAction: 'manual_confirm' | 'manual_unconfirm' | 'promote_binding' | 'reassign';
  lifecycleStatus: 'mapping_confirmed' | 'mapping_unconfirmed' | 'binding_promoted' | 'mapping_reassigned';
  stateTransition: 'mapping_manual_confirmed' | 'mapping_manual_unconfirmed' | 'mapping_binding_promoted' | 'mapping_reassigned';
  detail: Record<string, unknown>;
}) {
  await db.query(
    `insert into wecom_event_state (
      id, conversation_id, linked_customer_id, event_category, event_action,
      lifecycle_status, state_transition, payload_json
    ) values (
      $1, $2, $3, 'mapping', $4,
      $5, $6, $7::jsonb
    )`,
    [
      randomUUID(),
      payload.conversationId,
      payload.patientId || null,
      payload.eventAction,
      payload.lifecycleStatus,
      payload.stateTransition,
      JSON.stringify(payload.detail)
    ]
  );
}

async function updateConversationMessagesToPatient(conversationId: string, patientId: string, patientName: string, operatorNote?: string) {
  await db.query(
    `update wecom_messages
        set linked_customer_id = $2,
            metadata_json = jsonb_set(
              jsonb_set(
                coalesce(metadata_json, '{}'::jsonb),
                '{patientMapping}',
                $3::jsonb,
                true
              ),
              '{mappingManualConfirm}',
              $4::jsonb,
              true
            )
      where conversation_id = $1`,
    [
      conversationId,
      patientId,
      JSON.stringify({ patientId, patientName, matchedBy: 'manual_confirmation' }),
      JSON.stringify({ confirmedAt: new Date().toISOString(), operatorNote: operatorNote || null })
    ]
  );
}

export async function listUnmappedWecomCustomersManagementService(query: Record<string, unknown>) {
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 20;
  return listUnmappedWecomCustomersService(limit);
}

export async function listConflictWecomCustomersManagementService(query: Record<string, unknown>) {
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 20;
  return listMappingConflictWecomCustomersService(limit);
}

export async function confirmConversationPatientMappingService(payload: {
  conversationId: string;
  patientId: string;
  operatorNote?: string;
  operatorName?: string;
}) {
  const conversation = await ensureConversationExists(payload.conversationId);
  const patient = await ensurePatientExists(payload.patientId);

  await assignConversationPrimaryCustomer(payload.conversationId, payload.patientId, true);
  await updateConversationMessagesToPatient(payload.conversationId, payload.patientId, patient.patientName, payload.operatorNote);

  const mappingState = await refreshConversationMappingStateService(payload.conversationId, conversation.platform_chat_id as string);

  await writeMappingEvent({
    conversationId: payload.conversationId,
    patientId: payload.patientId,
    eventAction: 'manual_confirm',
    lifecycleStatus: 'mapping_confirmed',
    stateTransition: 'mapping_manual_confirmed',
    detail: {
      patientId: payload.patientId,
      patientName: patient.patientName,
      previousPrimaryCustomerId: conversation.primary_customer_id || null,
      operatorNote: payload.operatorNote || null
    }
  });

  await createWecomMappingAuditService({
    conversationId: payload.conversationId,
    platformChatId: conversation.platform_chat_id as string,
    action: 'manual_confirm',
    fromPatientId: conversation.primary_customer_id || null,
    toPatientId: payload.patientId,
    mappingStatus: mappingState.mappingStatus,
    matchedBy: mappingState.matchedBy,
    operatorNote: payload.operatorNote || null,
    operatorName: payload.operatorName || null,
    detail: {
      patientName: patient.patientName,
      operatorName: payload.operatorName || null
    }
  });

  return {
    confirmed: true,
    conversationId: payload.conversationId,
    patientId: payload.patientId,
    patientName: patient.patientName,
    mapping: mappingState.mapping
  };
}

export async function unconfirmConversationPatientMappingService(payload: {
  conversationId: string;
  operatorNote?: string;
  operatorName?: string;
}) {
  const conversation = await ensureConversationExists(payload.conversationId);

  await clearConversationPrimaryCustomer(payload.conversationId);

  await db.query(
    `update wecom_messages
        set linked_customer_id = null,
            metadata_json = (coalesce(metadata_json, '{}'::jsonb) - 'patientMapping') || jsonb_build_object(
              'mappingManualUnconfirm',
              $2::jsonb
            )
      where conversation_id = $1`,
    [
      payload.conversationId,
      JSON.stringify({
        unconfirmedAt: new Date().toISOString(),
        previousPrimaryCustomerId: conversation.primary_customer_id || null,
        operatorNote: payload.operatorNote || null
      })
    ]
  );

  const mappingState = await refreshConversationMappingStateService(payload.conversationId, conversation.platform_chat_id as string);

  await writeMappingEvent({
    conversationId: payload.conversationId,
    patientId: null,
    eventAction: 'manual_unconfirm',
    lifecycleStatus: 'mapping_unconfirmed',
    stateTransition: 'mapping_manual_unconfirmed',
    detail: {
      previousPrimaryCustomerId: conversation.primary_customer_id || null,
      operatorNote: payload.operatorNote || null
    }
  });

  await createWecomMappingAuditService({
    conversationId: payload.conversationId,
    platformChatId: conversation.platform_chat_id as string,
    action: 'manual_unconfirm',
    fromPatientId: conversation.primary_customer_id || null,
    toPatientId: null,
    mappingStatus: mappingState.mappingStatus,
    matchedBy: mappingState.matchedBy,
    operatorNote: payload.operatorNote || null,
    operatorName: payload.operatorName || null,
    detail: {
      operatorName: payload.operatorName || null
    }
  });

  return {
    unconfirmed: true,
    conversationId: payload.conversationId,
    previousPrimaryCustomerId: conversation.primary_customer_id || null,
    mapping: mappingState.mapping
  };
}

export async function reassignConversationPatientMappingService(payload: {
  conversationId: string;
  fromPatientId?: string;
  toPatientId: string;
  operatorNote?: string;
  operatorName?: string;
}) {
  const conversation = await ensureConversationExists(payload.conversationId);
  const patient = await ensurePatientExists(payload.toPatientId);
  const previousPatientId = payload.fromPatientId || conversation.primary_customer_id || null;

  await assignConversationPrimaryCustomer(payload.conversationId, payload.toPatientId, true);
  await updateConversationMessagesToPatient(payload.conversationId, payload.toPatientId, patient.patientName, payload.operatorNote);

  const mappingState = await refreshConversationMappingStateService(payload.conversationId, conversation.platform_chat_id as string);

  await writeMappingEvent({
    conversationId: payload.conversationId,
    patientId: payload.toPatientId,
    eventAction: 'reassign',
    lifecycleStatus: 'mapping_reassigned',
    stateTransition: 'mapping_reassigned',
    detail: {
      fromPatientId: previousPatientId,
      toPatientId: payload.toPatientId,
      toPatientName: patient.patientName,
      operatorNote: payload.operatorNote || null
    }
  });

  await createWecomMappingAuditService({
    conversationId: payload.conversationId,
    platformChatId: conversation.platform_chat_id as string,
    action: 'reassign',
    fromPatientId: previousPatientId,
    toPatientId: payload.toPatientId,
    mappingStatus: mappingState.mappingStatus,
    matchedBy: mappingState.matchedBy,
    operatorNote: payload.operatorNote || null,
    operatorName: payload.operatorName || null,
    detail: {
      toPatientName: patient.patientName,
      operatorName: payload.operatorName || null
    }
  });

  return {
    reassigned: true,
    conversationId: payload.conversationId,
    fromPatientId: previousPatientId,
    toPatientId: payload.toPatientId,
    toPatientName: patient.patientName,
    mapping: mappingState.mapping
  };
}

export async function promoteConversationMappingToBindingService(payload: {
  conversationId: string;
  patientId: string;
  bindingType: 'wecom_user' | 'external_user';
  operatorNote?: string;
  operatorName?: string;
}) {
  const conversation = await ensureConversationExists(payload.conversationId);
  const patient = await ensurePatientExists(payload.patientId);

  let wecomUserId: string | null = null;
  let externalUserId: string | null = null;

  if (payload.bindingType === 'wecom_user') {
    wecomUserId = conversation.platform_chat_id as string;
  } else {
    externalUserId = conversation.platform_chat_id as string;
  }

  const existing = await db.query(
    `select id, patient_id as "patientId", binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"
       from patient_wecom_binding
      where patient_id = $1
        and binding_type = $2
        and coalesce(wecom_user_id, '') = coalesce($3, '')
        and coalesce(external_user_id, '') = coalesce($4, '')
        and binding_status = 'bound'
      order by created_at desc
      limit 1`,
    [payload.patientId, payload.bindingType, wecomUserId, externalUserId]
  );

  let binding = existing.rows[0] || null;

  if (!binding) {
    const created = await db.query(
      `insert into patient_wecom_binding (id, patient_id, binding_type, wecom_user_id, external_user_id, binding_status, bound_at)
       values ($1, $2, $3, $4, $5, 'bound', now())
       returning id, patient_id as "patientId", binding_type as "bindingType", wecom_user_id as "wecomUserId", external_user_id as "externalUserId", binding_status as "bindingStatus", bound_at as "boundAt"`,
      [randomUUID(), payload.patientId, payload.bindingType, wecomUserId, externalUserId]
    );
    binding = created.rows[0];
  }

  await assignConversationPrimaryCustomer(payload.conversationId, payload.patientId, true);
  const mappingState = await refreshConversationMappingStateService(payload.conversationId, conversation.platform_chat_id as string);

  await writeMappingEvent({
    conversationId: payload.conversationId,
    patientId: payload.patientId,
    eventAction: 'promote_binding',
    lifecycleStatus: 'binding_promoted',
    stateTransition: 'mapping_binding_promoted',
    detail: {
      patientId: payload.patientId,
      patientName: patient.patientName,
      bindingType: payload.bindingType,
      wecomUserId,
      externalUserId,
      operatorNote: payload.operatorNote || null
    }
  });

  await createWecomMappingAuditService({
    conversationId: payload.conversationId,
    platformChatId: conversation.platform_chat_id as string,
    action: 'promote_binding',
    fromPatientId: conversation.primary_customer_id || null,
    toPatientId: payload.patientId,
    mappingStatus: mappingState.mappingStatus,
    matchedBy: mappingState.matchedBy,
    bindingType: payload.bindingType,
    operatorNote: payload.operatorNote || null,
    operatorName: payload.operatorName || null,
    detail: {
      patientName: patient.patientName,
      wecomUserId,
      externalUserId,
      operatorName: payload.operatorName || null
    }
  });

  return {
    promoted: true,
    conversationId: payload.conversationId,
    patientId: payload.patientId,
    patientName: patient.patientName,
    binding,
    mapping: mappingState.mapping
  };
}
