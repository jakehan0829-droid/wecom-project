#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
LOGIN_MOBILE="${LOGIN_MOBILE:-13800000000}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-demo123456}"
CONVERSATION_ID="${CONVERSATION_ID:-wecom:private:HanCong}"
EXPECTED_MAPPING_STATUS="${EXPECTED_MAPPING_STATUS:-matched}"
EXPECTED_MATCHED_BY="${EXPECTED_MATCHED_BY:-manual_confirmation}"
LIMIT="${LIMIT:-5}"

json_get() {
  local expr="$1"
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const x=JSON.parse(s);const v=(function(){return ${expr}})();if(typeof v==='object')console.log(JSON.stringify(v));else console.log(String(v));});"
}

echo "[1/5] login 获取 token"
TOKEN=$(curl -sS -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"mobile\":\"$LOGIN_MOBILE\",\"password\":\"$LOGIN_PASSWORD\"}" | json_get 'x.data.accessToken')

if [[ -z "$TOKEN" || "$TOKEN" == "undefined" ]]; then
  echo "login failed: empty token"
  exit 1
fi

echo "[2/5] 查询 mapping audit 明细"
AUDIT_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/mapping-audit?conversationId=$CONVERSATION_ID&limit=$LIMIT" \
  -H "Authorization: Bearer $TOKEN")
echo "$AUDIT_JSON" | json_get 'x.success' >/dev/null

echo "[3/5] 查询 mapping audit summary"
SUMMARY_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/mapping-audit/summary?conversationId=$CONVERSATION_ID&timePreset=7d&limit=$LIMIT" \
  -H "Authorization: Bearer $TOKEN")
echo "$SUMMARY_JSON" | json_get 'x.success' >/dev/null

echo "[4/5] 查询 governance dashboard"
DASHBOARD_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/mapping-governance/dashboard?timePreset=7d&limit=$LIMIT" \
  -H "Authorization: Bearer $TOKEN")
echo "$DASHBOARD_JSON" | json_get 'x.success' >/dev/null

echo "[5/5] 查询 conversation list 筛选"
LIST_JSON=$(curl -sS "$BASE_URL/api/v1/wecom/conversations?mappingStatus=$EXPECTED_MAPPING_STATUS&matchedBy=$EXPECTED_MATCHED_BY&limit=$LIMIT" \
  -H "Authorization: Bearer $TOKEN")
echo "$LIST_JSON" | json_get 'x.success' >/dev/null

echo "\n=== cutover smoke summary ==="
echo "audit recent count: $(echo "$AUDIT_JSON" | json_get 'x.data.length')"
echo "summary cards: $(echo "$SUMMARY_JSON" | json_get 'x.data.cards')"
echo "dashboard cards: $(echo "$DASHBOARD_JSON" | json_get 'x.data.cards')"
echo "filtered conversation count: $(echo "$LIST_JSON" | json_get 'x.data.items ? x.data.items.length : (x.data.length || 0)')"
echo "done"
