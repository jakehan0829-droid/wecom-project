#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

case "$MODE" in
  preflight)
    bash "$SCRIPT_DIR/preflight.sh"
    ;;
  smoke)
    bash "$SCRIPT_DIR/cutover-smoke.sh"
    ;;
  acceptance)
    bash "$SCRIPT_DIR/generate-acceptance-summary.sh"
    ;;
  full)
    bash "$SCRIPT_DIR/preflight.sh"
    bash "$SCRIPT_DIR/cutover-smoke.sh"
    bash "$SCRIPT_DIR/generate-acceptance-summary.sh"
    ;;
  *)
    echo "usage: $0 [preflight|smoke|acceptance|full]"
    exit 1
    ;;
esac
