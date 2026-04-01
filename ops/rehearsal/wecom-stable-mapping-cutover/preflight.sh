#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
LOGIN_MOBILE="${LOGIN_MOBILE:-13800000000}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-demo123456}"
LIMIT="${LIMIT:-5}"
OWNER_DB_HOST="${OWNER_DB_HOST:-127.0.0.1}"
OWNER_DB_PORT="${OWNER_DB_PORT:-5432}"
OWNER_DB_NAME="${OWNER_DB_NAME:-chronic_disease}"
OWNER_DB_USER="${OWNER_DB_USER:-}"

json_get() {
  local expr="$1"
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const x=JSON.parse(s);const v=(function(){return ${expr}})();if(typeof v==='object')console.log(JSON.stringify(v));else console.log(String(v));});"
}

run_sql() {
  local sql="$1"
  if [[ -z "$OWNER_DB_USER" || -z "${PGPASSWORD:-}" ]]; then
    echo "SKIP(sql): OWNER_DB_USER or PGPASSWORD not set"
    return 0
  fi
  psql -h "$OWNER_DB_HOST" -p "$OWNER_DB_PORT" -U "$OWNER_DB_USER" -d "$OWNER_DB_NAME" -At -c "$sql"
}

echo "[1/4] 检查 backend health"
HEALTH_JSON=$(curl -sS "$BASE_URL/health")
echo "$HEALTH_JSON"

echo "[2/4] 登录并检查治理接口可用性"
TOKEN=$(curl -sS -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"mobile\":\"$LOGIN_MOBILE\",\"password\":\"$LOGIN_PASSWORD\"}" | json_get 'x.data.accessToken')

if [[ -z "$TOKEN" || "$TOKEN" == "undefined" ]]; then
  echo "login failed: empty token"
  exit 1
fi

for path in \
  "/api/v1/wecom/mapping-audit?limit=$LIMIT" \
  "/api/v1/wecom/mapping-audit/summary?limit=$LIMIT&timePreset=7d" \
  "/api/v1/wecom/mapping-governance/dashboard?limit=$LIMIT&timePreset=7d"
do
  echo "- GET $path"
  curl -sS "$BASE_URL$path" -H "Authorization: Bearer $TOKEN" | json_get 'x.success' >/dev/null
done

echo "[3/4] 检查 pm2 状态"
pm2 describe chronic-disease-backend | sed -n '1,40p'

echo "[4/4] 可选 SQL 预检（提供 OWNER_DB_USER + PGPASSWORD 时执行）"
echo "mapping columns:"
run_sql "select column_name from information_schema.columns where table_name='wecom_conversations' and column_name in ('mapping_status','mapping_matched_by') order by column_name;"
echo "mapping indexes:"
run_sql "select indexname from pg_indexes where tablename='wecom_conversations' and indexname in ('idx_wecom_conversations_mapping_status','idx_wecom_conversations_mapping_matched_by') order by indexname;"

echo "done"
