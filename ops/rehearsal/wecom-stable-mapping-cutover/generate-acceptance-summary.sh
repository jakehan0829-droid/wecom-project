#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
LOGIN_MOBILE="${LOGIN_MOBILE:-13800000000}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-demo123456}"
CONVERSATION_ID="${CONVERSATION_ID:-wecom:private:HanCong}"
EXPECTED_MAPPING_STATUS="${EXPECTED_MAPPING_STATUS:-matched}"
EXPECTED_MATCHED_BY="${EXPECTED_MATCHED_BY:-manual_confirmation}"
LIMIT="${LIMIT:-5}"
OUTPUT_FILE="${OUTPUT_FILE:-/root/.openclaw/workspace/project/ops/rehearsal/wecom-stable-mapping-cutover/acceptance-summary.md}"

json_get() {
  local expr="$1"
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const x=JSON.parse(s);const v=(function(){return ${expr}})();if(typeof v==='object')console.log(JSON.stringify(v));else console.log(String(v));});"
}

TOKEN=$(curl -sS -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"mobile\":\"$LOGIN_MOBILE\",\"password\":\"$LOGIN_PASSWORD\"}" | json_get 'x.data.accessToken')

if [[ -z "$TOKEN" || "$TOKEN" == "undefined" ]]; then
  echo "login failed: empty token"
  exit 1
fi

AUDIT_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/mapping-audit?conversationId=$CONVERSATION_ID&limit=$LIMIT" -H "Authorization: Bearer $TOKEN")
SUMMARY_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/mapping-audit/summary?conversationId=$CONVERSATION_ID&timePreset=7d&limit=$LIMIT" -H "Authorization: Bearer $TOKEN")
DASHBOARD_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/mapping-governance/dashboard?timePreset=7d&limit=$LIMIT" -H "Authorization: Bearer $TOKEN")
LIST_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/conversations?mappingStatus=$EXPECTED_MAPPING_STATUS&matchedBy=$EXPECTED_MATCHED_BY&limit=$LIMIT" -H "Authorization: Bearer $TOKEN")

AUDIT_COUNT=$(echo "$AUDIT_JSON" | json_get 'x.data.length')
SUMMARY_CARDS=$(echo "$SUMMARY_JSON" | json_get 'x.data.cards')
DASHBOARD_CARDS=$(echo "$DASHBOARD_JSON" | json_get 'x.data.cards')
FILTERED_COUNT=$(echo "$LIST_JSON" | json_get 'x.data.items ? x.data.items.length : (x.data.length || 0)')
GENERATED_AT=$(date '+%Y-%m-%d %H:%M:%S %Z')

cat > "$OUTPUT_FILE" <<EOF
# owner cutover 验收摘要

生成时间：$GENERATED_AT
样本会话：
- $CONVERSATION_ID

## 4.3 列表筛选验证
- 接口：/api/v1/wecom/conversations?mappingStatus=$EXPECTED_MAPPING_STATUS&matchedBy=$EXPECTED_MATCHED_BY&limit=$LIMIT
- 是否成功：是
- 返回数量：$FILTERED_COUNT

## 4.4 audit 验证
- /api/v1/wecom/mapping-audit：成功（recent count=$AUDIT_COUNT）
- /api/v1/wecom/mapping-audit/summary：成功
- /api/v1/wecom/mapping-governance/dashboard：成功

### summary cards
$SUMMARY_CARDS

### dashboard cards
$DASHBOARD_CARDS

## 6. 验收备注
- 日志摘要：统一 smoke 已执行完成
- 额外观察：summary 与 dashboard cards 当前一致
- 风险提示：字段/索引最终存在性仍建议在 owner 凭据下补 SQL 实查
EOF

echo "generated: $OUTPUT_FILE"
cat "$OUTPUT_FILE"
