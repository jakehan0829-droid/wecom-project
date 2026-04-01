#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
MOBILE="${MOBILE:-13800000000}"
PASSWORD="${PASSWORD:-demo123456}"

cd "$(dirname "$0")/.."

node scripts/ensure-workbench-v1-standard-sample.mjs >/tmp/workbench-v1-sample.json

TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"mobile\":\"$MOBILE\",\"password\":\"$PASSWORD\"}" | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.data?.accessToken||'')})")

if [ -z "$TOKEN" ]; then
  echo "[error] failed to get access token"
  exit 1
fi

OPEN_URL=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('/tmp/workbench-v1-sample.json','utf8')); const u=new URL('$BASE_URL/'); u.searchParams.set('mode','real'); u.searchParams.set('view','conversation-detail'); u.searchParams.set('conversationId', j.sample.conversationId); console.log(u.toString())")

echo "[ok] sample ensured"
echo "[ok] access token acquired"
echo "[token] $TOKEN"
echo "[open] $OPEN_URL"
