import { db } from '../../../infra/db/pg.js';

export async function getDashboardOverviewService() {
  const [
    patientTotal,
    boundTotal,
    highRiskTotal,
    glucoseTodayTotal,
    bloodPressureTodayTotal,
    weightTodayTotal,
    pendingDoctorReviewTotal,
    pendingOutreachActionTotal,
    sentOutreachDeliveryTotal,
    failedOutreachDeliveryTotal,
    wecomConversationTotal,
    wecomInsightTotal,
    pendingWecomActionTotal,
    highPriorityInsightTotal,
    completedOutreachActionTotal,
    unmappedWecomConversationTotal,
    conflictWecomConversationTotal
  ] = await Promise.all([
    db.query(`select count(*)::int as total from patient`),
    db.query(`select count(*)::int as total from patient_wecom_binding where binding_status = 'bound'`),
    db.query(`select count(*)::int as total from patient where risk_level = 'high'`),
    db.query(`select count(*)::int as total from health_record_glucose where measure_time::date = current_date`),
    db.query(`select count(*)::int as total from health_record_blood_pressure where measure_time::date = current_date`),
    db.query(`select count(*)::int as total from health_record_weight where measure_time::date = current_date`),
    db.query(`select count(*)::int as total from doctor_review_task where status = 'pending'`),
    db.query(`select count(*)::int as total from patient_outreach_action where status = 'pending'`),
    db.query(`select count(*)::int as total from patient_outreach_delivery_log where delivery_status = 'sent'`),
    db.query(`select count(*)::int as total from patient_outreach_delivery_log where delivery_status = 'failed'`),
    db.query(`select count(*)::int as total from wecom_conversations`),
    db.query(`select count(*)::int as total from wecom_conversation_insights_v1`),
    db.query(`select count(*)::int as total from patient_outreach_action where status = 'pending' and summary like '【企微%'`),
    db.query(`select count(*)::int as total from wecom_conversation_insights_v1 where confidence = 'high'`),
    db.query(`select count(*)::int as total from patient_outreach_action where status = 'done' and summary like '【企微%'`),
    db.query(`select count(distinct conversation_id)::int as total from wecom_messages where chat_type = 'private' and (linked_customer_id is null or linked_customer_id = '')`),
    db.query(`select count(distinct conversation_id)::int as total from wecom_messages where chat_type = 'private' and jsonb_extract_path_text(metadata_json, 'customerLookup', 'status') = 'conflict'`)
  ]);

  const todayRecordTotal =
    (glucoseTodayTotal.rows[0]?.total || 0) +
    (bloodPressureTodayTotal.rows[0]?.total || 0) +
    (weightTodayTotal.rows[0]?.total || 0);

  return {
    patientTotal: patientTotal.rows[0]?.total || 0,
    boundTotal: boundTotal.rows[0]?.total || 0,
    highRiskTotal: highRiskTotal.rows[0]?.total || 0,
    todayRecordTotal,
    pendingDoctorReviewTotal: pendingDoctorReviewTotal.rows[0]?.total || 0,
    pendingOutreachActionTotal: pendingOutreachActionTotal.rows[0]?.total || 0,
    sentOutreachDeliveryTotal: sentOutreachDeliveryTotal.rows[0]?.total || 0,
    failedOutreachDeliveryTotal: failedOutreachDeliveryTotal.rows[0]?.total || 0,
    wecomConversationTotal: wecomConversationTotal.rows[0]?.total || 0,
    wecomInsightTotal: wecomInsightTotal.rows[0]?.total || 0,
    pendingWecomActionTotal: pendingWecomActionTotal.rows[0]?.total || 0,
    highPriorityInsightTotal: highPriorityInsightTotal.rows[0]?.total || 0,
    completedWecomActionTotal: completedOutreachActionTotal.rows[0]?.total || 0,
    unmappedWecomConversationTotal: unmappedWecomConversationTotal.rows[0]?.total || 0,
    conflictWecomConversationTotal: conflictWecomConversationTotal.rows[0]?.total || 0
  };
}
