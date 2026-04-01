# owner cutover 验收摘要

生成时间：2026-03-30 11:53:34 CST
样本会话：
- wecom:private:HanCong

## 4.3 列表筛选验证
- 接口：/api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5
- 是否成功：是
- 返回数量：5

## 4.4 audit 验证
- /api/v1/wecom/mapping-audit：成功（recent count=2）
- /api/v1/wecom/mapping-audit/summary：成功
- /api/v1/wecom/mapping-governance/dashboard：成功

### summary cards
{"totalActions":2,"manualConfirmTotal":0,"manualUnconfirmTotal":0,"reassignTotal":2,"promoteBindingTotal":0,"conversationTouchedTotal":1}

### dashboard cards
{"totalActions":2,"manualConfirmTotal":0,"manualUnconfirmTotal":0,"reassignTotal":2,"promoteBindingTotal":0,"conversationTouchedTotal":1}

## 6. 验收备注
- 日志摘要：统一 smoke 已执行完成
- 额外观察：summary 与 dashboard cards 当前一致
- 风险提示：字段/索引最终存在性仍建议在 owner 凭据下补 SQL 实查
