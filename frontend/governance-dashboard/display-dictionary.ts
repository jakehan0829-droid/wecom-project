export const matchedByLabelMap: Record<string, string> = {
  patient_id: '患者ID直连',
  external_user_id: '外部联系人ID命中',
  wecom_user_id: '企微用户ID命中',
  conversation_primary_customer_id: '会话主客户兜底',
  manual_confirmation: '人工确认',
  unknown: '未识别'
};

export const actionLabelMap: Record<string, string> = {
  manual_confirm: '手工确认',
  manual_unconfirm: '撤销确认',
  reassign: '改绑',
  promote_binding: '提升为绑定'
};

export const mappingStatusLabelMap: Record<string, string> = {
  matched: '已命中',
  conflict: '冲突',
  unmapped: '未映射',
  unknown: '未知'
};

export const bindingTypeLabelMap: Record<string, string> = {
  wecom_user: '企微用户绑定',
  external_user: '外部联系人绑定',
  null: '-'
};

export function toDisplayLabel(map: Record<string, string>, value: unknown) {
  const key = value == null ? 'null' : String(value);
  return map[key] || key;
}
