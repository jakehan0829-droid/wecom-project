import { db } from '../../../infra/db/pg.js';

type PatientMappingResult = {
  patientId: string;
  patientName: string;
  matchedBy: 'patient_id' | 'external_user_id' | 'wecom_user_id' | 'conversation_primary_customer_id' | 'manual_confirmation';
};

type UnmappedCustomerResult = {
  customerId: string;
  status: 'unmapped';
  checkedRules: string[];
  conversationId?: string;
};

type MappingConflictResult = {
  customerId: string;
  status: 'conflict';
  matchedBy: 'external_user_id' | 'wecom_user_id';
  candidates: Array<{ patientId: string; patientName: string }>;
};

export type CustomerMappingLookupResult =
  | { status: 'matched'; mapping: PatientMappingResult }
  | UnmappedCustomerResult
  | MappingConflictResult;

async function findPatientById(customerId: string) {
  const result = await db.query(
    `select id, name
       from patient
      where id = $1
      limit 1`,
    [customerId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    patientId: row.id as string,
    patientName: row.name as string,
    matchedBy: 'patient_id' as const
  };
}

async function findConversationPrimaryCustomer(conversationId: string) {
  const result = await db.query(
    `select c.primary_customer_id as "patientId", p.name as "patientName"
       from wecom_conversations c
       left join patient p on p.id = c.primary_customer_id
      where c.conversation_id = $1
        and c.primary_customer_id is not null
        and c.primary_customer_id <> ''
      limit 1`,
    [conversationId]
  );

  const row = result.rows[0];
  if (!row?.patientId) return null;

  return {
    patientId: row.patientId as string,
    patientName: (row.patientName as string) || '',
    matchedBy: 'conversation_primary_customer_id' as const
  };
}

async function findBindingsByField(field: 'external_user_id' | 'wecom_user_id', customerId: string) {
  const result = await db.query(
    `select p.id as "patientId", p.name as "patientName"
       from patient_wecom_binding b
       join patient p on p.id = b.patient_id
      where b.${field} = $1
        and b.binding_status = 'bound'
      order by b.bound_at desc nulls last, b.created_at desc`,
    [customerId]
  );

  return result.rows.map((item) => ({
    patientId: item.patientId as string,
    patientName: item.patientName as string
  }));
}

function dedupeCandidates(items: Array<{ patientId: string; patientName: string }>) {
  const map = new Map<string, { patientId: string; patientName: string }>();
  for (const item of items) {
    if (!map.has(item.patientId)) {
      map.set(item.patientId, item);
    }
  }
  return Array.from(map.values());
}

export async function lookupCustomerMapping(customerId?: string, conversationId?: string): Promise<CustomerMappingLookupResult | null> {
  if (!customerId && !conversationId) return null;

  if (conversationId) {
    const conversationPrimaryCustomer = await findConversationPrimaryCustomer(conversationId);
    if (conversationPrimaryCustomer) {
      return {
        status: 'matched',
        mapping: {
          ...conversationPrimaryCustomer,
          matchedBy: 'manual_confirmation'
        }
      };
    }
  }

  if (customerId) {
    const directPatient = await findPatientById(customerId);
    if (directPatient) {
      return {
        status: 'matched',
        mapping: directPatient
      };
    }

    const externalCandidates = dedupeCandidates(await findBindingsByField('external_user_id', customerId));
    if (externalCandidates.length === 1) {
      return {
        status: 'matched',
        mapping: {
          ...externalCandidates[0],
          matchedBy: 'external_user_id'
        }
      };
    }
    if (externalCandidates.length > 1) {
      return {
        customerId,
        status: 'conflict',
        matchedBy: 'external_user_id',
        candidates: externalCandidates
      };
    }

    const wecomCandidates = dedupeCandidates(await findBindingsByField('wecom_user_id', customerId));
    if (wecomCandidates.length === 1) {
      return {
        status: 'matched',
        mapping: {
          ...wecomCandidates[0],
          matchedBy: 'wecom_user_id'
        }
      };
    }
    if (wecomCandidates.length > 1) {
      return {
        customerId,
        status: 'conflict',
        matchedBy: 'wecom_user_id',
        candidates: wecomCandidates
      };
    }
  }

  return {
    customerId: customerId || '',
    conversationId,
    status: 'unmapped',
    checkedRules: ['patient_id', 'external_user_id', 'wecom_user_id', 'conversation_primary_customer_id']
  };
}

export async function resolvePatientIdByCustomerId(customerId?: string, conversationId?: string) {
  const lookup = await lookupCustomerMapping(customerId, conversationId);
  if (!lookup || lookup.status !== 'matched') {
    return null;
  }

  return lookup.mapping;
}
