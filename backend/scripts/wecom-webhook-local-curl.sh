#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-verify-url}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
WEBHOOK_PATH="/api/v1/wecom/webhook"

if [[ "$MODE" != "verify-url" && "$MODE" != "encrypted-body" ]]; then
  echo "Usage: BASE_URL=http://127.0.0.1:3000 WECOM_LOCAL_DEMO_MODE=1 bash scripts/wecom-webhook-local-curl.sh [verify-url|encrypted-body]"
  exit 1
fi

JSON_OUTPUT=$(WECOM_LOCAL_DEMO_MODE="${WECOM_LOCAL_DEMO_MODE:-1}" node scripts/wecom-local-check.mjs "$MODE")
QUERY=$(printf '%s' "$JSON_OUTPUT" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));const q=new URLSearchParams(j.query).toString();process.stdout.write(q)")

if [[ "$MODE" == "verify-url" ]]; then
  curl -i "${BASE_URL}${WEBHOOK_PATH}?${QUERY}"
  exit 0
fi

BODY_FILE=$(mktemp)
printf '%s' "$JSON_OUTPUT" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.body)" > "$BODY_FILE"
curl -i -X POST "${BASE_URL}${WEBHOOK_PATH}?${QUERY}" \
  -H 'Content-Type: application/xml' \
  --data-binary @"$BODY_FILE"
rm -f "$BODY_FILE"
