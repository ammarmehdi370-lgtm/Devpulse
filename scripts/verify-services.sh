#!/usr/bin/env bash
set -u

echo "=== Service Health Check ==="
failed=0
service_host=localhost

if grep -qiE 'microsoft|wsl' /proc/sys/kernel/osrelease 2>/dev/null &&
  ! curl --fail --silent --max-time 3 http://localhost:4000/health >/dev/null 2>&1; then
  service_host="$(ip route show default 2>/dev/null | awk 'NR == 1 { print $3 }')"
  service_host="${service_host:-localhost}"
fi

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK  %s\n' "$name"
  else
    printf 'FAIL %s\n' "$name"
    failed=1
  fi
}

check "Docker" docker info
check "PostgreSQL" docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
check "Redis" docker compose exec -T redis redis-cli ping
check "MinIO" curl --fail --silent http://localhost:9000/minio/health/live
check "API" curl --fail --silent "http://${service_host}:4000/health"
check "Socket.IO" curl --fail --silent "http://${service_host}:4001/health"
check "AI service" curl --fail --silent "http://${service_host}:4002/health"
check "Web" curl --fail --silent "http://${service_host}:3000"

echo ""
if [[ "$failed" -eq 0 ]]; then
  echo "All checked services are healthy."
else
  echo "Some services failed. Inspect with: docker compose ps; docker compose logs <service>"
  exit 1
fi