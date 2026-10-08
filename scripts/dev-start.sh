#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/start-services.sh
echo
echo "=== Final infrastructure verification ==="
bash scripts/verify-services.sh --infrastructure-only

echo
echo "Starting application services..."
pnpm --parallel \
  --filter @devpulse/api \
  --filter @devpulse/socket \
  --filter @devpulse/ai \
  --filter @devpulse/web \
  dev &
app_pid=$!

stop_app_services() {
  if [[ -n "${app_pid:-}" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
}
trap stop_app_services EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

api_url="${DEVPULSE_API_URL:-http://localhost:4000}"
socket_url="${DEVPULSE_SOCKET_URL:-http://localhost:4001}"
ai_url="${DEVPULSE_AI_URL:-http://localhost:4002}"
web_url="${DEVPULSE_WEB_URL:-http://localhost:3000}"
app_ready=false
for count in $(seq 1 30); do
  if ! kill -0 "$app_pid" 2>/dev/null; then
    set +e
    wait "$app_pid"
    app_status=$?
    set -e
    app_pid=""
    echo "ERROR: Application services exited before becoming ready." >&2
    exit $((app_status == 0 ? 1 : app_status))
  fi

  if curl --silent --output /dev/null --max-time 2 "$api_url/health" &&
    curl --silent --output /dev/null --max-time 2 "$socket_url/health" &&
    curl --silent --output /dev/null --max-time 2 "$ai_url/health" &&
    curl --silent --output /dev/null --max-time 2 "$web_url"; then
    app_ready=true
    break
  fi
  sleep 2
done

if [[ "$app_ready" != true ]]; then
  echo "WARNING: Not all application services responded before the readiness timeout." >&2
fi

echo
echo "=== Final service verification ==="
bash scripts/verify-services.sh

wait "$app_pid"
