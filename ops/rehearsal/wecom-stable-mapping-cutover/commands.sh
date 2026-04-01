#!/usr/bin/env bash
set -euo pipefail

# 1) Owner 执行（替换账号密码）
# export PGPASSWORD='<OWNER_PASSWORD>'
# psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
#   -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql

# 2) 重启 backend
pm2 restart chronic-disease-backend

# 3) 字段检查
# psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease -c "select column_name from information_schema.columns where table_name='wecom_conversations' and column_name in ('mapping_status','mapping_matched_by');"

# 4) 索引检查
# psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease -c "select indexname from pg_indexes where tablename='wecom_conversations' and indexname in ('idx_wecom_conversations_mapping_status','idx_wecom_conversations_mapping_matched_by');"

# 5) 样本动作（需先拿 token）
# curl -X POST http://127.0.0.1:3000/api/v1/wecom/conversations/wecom:private:HanCong/mapping/reassign \
#   -H "Authorization: Bearer <TOKEN>" -H 'Content-Type: application/json' \
#   -d '{"toPatientId":"689ca26c-b8d0-46e4-a6d3-c5b750472eff","operatorNote":"cutover rehearsal"}'

# 6) 列表筛选验证
# curl 'http://127.0.0.1:3000/api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5' \
#   -H "Authorization: Bearer <TOKEN>"

# 7) 治理接口验证
# curl 'http://127.0.0.1:3000/api/v1/wecom/mapping-audit?conversationId=wecom:private:HanCong&limit=5' -H "Authorization: Bearer <TOKEN>"
# curl 'http://127.0.0.1:3000/api/v1/wecom/mapping-audit/summary?conversationId=wecom:private:HanCong&timePreset=7d&limit=5' -H "Authorization: Bearer <TOKEN>"
# curl 'http://127.0.0.1:3000/api/v1/wecom/mapping-governance/dashboard?timePreset=7d&limit=5' -H "Authorization: Bearer <TOKEN>"
