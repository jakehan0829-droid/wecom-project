# 预期结果

## 字段/索引
- `mapping_status` 存在
- `mapping_matched_by` 存在
- 两个索引存在

## 样本动作后
`wecom:private:HanCong` 预期：
- `mapping_status = matched`
- `mapping_matched_by = manual_confirmation`

## 列表筛选
`/api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5`
- 正常返回样本会话

## 审计明细
`/api/v1/wecom/mapping-audit?...`
- 返回最新治理记录

## 审计聚合
`/api/v1/wecom/mapping-audit/summary?...`
- 返回 cards / byAction / byMatchedBy / byConversation / recent

## 治理台接口
`/api/v1/wecom/mapping-governance/dashboard?...`
- 返回 meta / cards / charts / tables
