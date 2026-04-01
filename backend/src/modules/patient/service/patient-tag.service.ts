import { randomUUID } from 'node:crypto';
import { db } from '../../../infra/db/pg.js';
import { requireString } from '../../../shared/utils/validators.js';

export async function createPatientTagService(payload: Record<string, unknown>) {
  const tagName = requireString(payload.tagName, 'tagName');
  const id = randomUUID();
  const result = await db.query(
    `insert into patient_tag (id, org_id, tag_name, tag_type)
     values ($1,$2,$3,$4)
     returning id, org_id as "orgId", tag_name as "tagName", tag_type as "tagType", created_at as "createdAt"`,
    [id, payload.orgId || null, tagName, payload.tagType || null]
  );
  return result.rows[0];
}

export async function bindPatientTagService(patientId: string, payload: Record<string, unknown>) {
  const tagId = requireString(payload.tagId, 'tagId');
  const id = randomUUID();
  const result = await db.query(
    `insert into patient_tag_relation (id, patient_id, tag_id)
     values ($1,$2,$3)
     returning id, patient_id as "patientId", tag_id as "tagId", created_at as "createdAt"`,
    [id, patientId, tagId]
  );
  return result.rows[0];
}
