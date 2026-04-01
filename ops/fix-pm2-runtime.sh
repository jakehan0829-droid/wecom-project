#!/usr/bin/env bash
set -euo pipefail

cd /root/.openclaw/workspace/project/backend
npm run build

if pm2 describe chronic-disease-backend >/dev/null 2>&1; then
  pm2 delete chronic-disease-backend
fi

pm2 start ecosystem.config.cjs
pm2 save
pm2 status chronic-disease-backend
