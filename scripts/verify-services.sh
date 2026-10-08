#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INFRASTRUCTURE_ONLY=false
if [[ "${1:-}" == "--infrastructure-only" ]]; then
  INFRASTRUCTURE_ONLY=true
elif [[ "$#" -gt 0 ]]; then
  echo "Usage: bash scripts/verify-services.sh [--infrastructure-only]" >&2
  exit 2
fi

PASS=0
FAIL=0
WARN=0

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  RED=$'\033[0;31m'
  GREEN=$'\033[0;32m'
  YELLOW=$'\033[1;33m'
  CYAN=$'\033[0;36m'
  NC=$'\033[0m'
else
  RED=""
  GREEN=""
  YELLOW=""
  CYAN=""
  NC=""
fi

pass() { printf '%s✓%s %s\n' "$GREEN" "$NC" "$1"; PASS=$((PASS + 1)); }
fail() { printf '%s✗%s %s\n' "$RED" "$NC" "$1"; FAIL=$((FAIL + 1)); }
warn() { printf '%s⚠%s %s\n' "$YELLOW" "$NC" "$1"; WARN=$((WARN + 1)); }
section() { printf '\n%s── %s ──%s\n' "$CYAN" "$1" "$NC"; }

setting() {
  local name="$1"
  local value="${!name:-}"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return
  fi
  if [[ -f .env ]]; then
    value="$(sed -n "s/^[[:space:]]*${name}[[:space:]]*=[[:space:]]*//p" .env | tail -n 1)"
    value="${value%$'\r'}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
  fi
  printf '%s' "$value"
}

check_config() {
  local name="$1"
  local required="$2"
  if [[ -n "$(setting "$name")" ]]; then
    pass "$name is configured"
  elif [[ "$required" == "required" ]]; then
    fail "$name is missing (required)"
  else
    warn "$name is not set (optional)"
  fi
}

echo
printf '%s\n' "╔════════════════════════════════════╗"
printf '%s\n' "║   Devpulse Service Health Check    ║"
printf '%s\n' "╚════════════════════════════════════╝"

if [[ -f .env ]]; then
  pass ".env file found"
else
  fail ".env file missing — run: bash scripts/setup-env.sh"
fi

section "Infrastructure"
if docker info >/dev/null 2>&1; then
  pass "Docker is running"
else
  fail "Docker is not running — start Docker Desktop or the Docker service"
fi

pg_port="$(setting POSTGRES_PORT)"
pg_port="${pg_port:-5433}"
if docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
  pass "PostgreSQL (host port $pg_port)"
elif command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p "$pg_port" >/dev/null 2>&1; then
  pass "PostgreSQL (host port $pg_port, external)"
else
  fail "PostgreSQL is not reachable on port $pg_port — run: docker compose up -d postgres"
fi

redis_reply="$(docker compose exec -T redis redis-cli ping 2>/dev/null | tr -d '\r' || true)"
if [[ "$redis_reply" == "PONG" ]]; then
  pass "Redis (port 6379)"
else
  fail "Redis is not reachable — run: docker compose up -d redis"
fi

if command -v curl >/dev/null 2>&1 &&
  curl --fail --silent --show-error --max-time 4 http://localhost:9000/minio/health/live >/dev/null 2>&1; then
  pass "MinIO storage (port 9000)"
else
  fail "MinIO is not reachable on port 9000 — run: docker compose up -d minio"
fi

bucket="${MINIO_BUCKET:-$(setting MINIO_BUCKET)}"
bucket="${bucket:-devpulse-files}"
if docker compose run --rm --no-deps --entrypoint /bin/sh minio-init \
  -c 'mc alias set local http://minio:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null && mc stat "local/$MINIO_BUCKET" >/dev/null' \
  >/dev/null 2>&1; then
  pass "MinIO bucket '$bucket'"
else
  fail "MinIO bucket '$bucket' is missing or could not be verified — run: docker compose run --rm minio-init"
fi

if [[ "$INFRASTRUCTURE_ONLY" != true ]]; then
  section "Application Services"
  api_url="${DEVPULSE_API_URL:-http://localhost:4000}"
  api_health=""
  if command -v curl >/dev/null 2>&1; then
    api_health="$(curl --silent --show-error --max-time 5 "$api_url/health" 2>/dev/null || true)"
  fi
  if [[ -n "$api_health" ]]; then
    api_status="$(printf '%s' "$api_health" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).status||"unknown")}catch{console.log("unknown")}})' 2>/dev/null || printf 'unknown')"
    if [[ "$api_status" == "ok" ]]; then
      pass "API (port 4000) — status: ok"
    else
      fail "API is running but unhealthy (status: $api_status) — inspect API and dependency logs"
    fi
  else
    fail "API is not running (port 4000) — run: pnpm --filter @devpulse/api dev"
  fi

  socket_url="${DEVPULSE_SOCKET_URL:-http://localhost:4001}"
  if curl --fail --silent --show-error --max-time 4 "$socket_url/health" >/dev/null 2>&1; then
    pass "Socket.IO (port 4001)"
  else
    warn "Socket.IO is not running (port 4001) — run: pnpm --filter @devpulse/socket dev"
  fi

  ai_url="${DEVPULSE_AI_URL:-http://localhost:4002}"
  ai_health="$(curl --silent --show-error --max-time 4 "$ai_url/health" 2>/dev/null || true)"
  if [[ -n "$ai_health" ]]; then
    ai_configured="$(printf '%s' "$ai_health" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).configured===true)}catch{console.log("unknown")}})' 2>/dev/null || printf 'unknown')"
    if [[ "$ai_configured" == "true" ]]; then
      pass "AI service (port 4002) — Anthropic configured"
    else
      warn "AI service is running but Anthropic is not configured — set ANTHROPIC_API_KEY in .env"
    fi
  else
    warn "AI service is not running (port 4002) — run: pnpm --filter @devpulse/ai dev"
  fi

  web_url="${DEVPULSE_WEB_URL:-http://localhost:3000}"
  if curl --fail --silent --show-error --max-time 5 "$web_url" >/dev/null 2>&1; then
    pass "Web app (port 3000)"
  else
    warn "Web app is not running (port 3000) — run: pnpm --filter @devpulse/web dev"
  fi
fi

section "Configuration"
if [[ -f .env ]]; then
  check_config DATABASE_URL required
  check_config REDIS_URL required
  check_config SESSION_SECRET required
  check_config RESEND_API_KEY optional
  check_config ANTHROPIC_API_KEY optional
  check_config GITHUB_CLIENT_ID optional
else
  fail "Configuration cannot be read without .env"
fi

section "JWT Keys"
private_key="$(setting JWT_PRIVATE_KEY_PATH)"
public_key="$(setting JWT_PUBLIC_KEY_PATH)"
private_key="${private_key:-./keys/private.pem}"
public_key="${public_key:-./keys/public.pem}"
if [[ ! -f "$private_key" && -f "apps/api/$private_key" ]]; then
  private_key="apps/api/$private_key"
fi
if [[ ! -f "$public_key" && -f "apps/api/$public_key" ]]; then
  public_key="apps/api/$public_key"
fi
if [[ -f "$private_key" ]]; then
  pass "Private key exists: $private_key"
else
  fail "Private key is missing: $private_key — run: bash apps/api/scripts/generate-keys.sh"
fi
if [[ -f "$public_key" ]]; then
  pass "Public key exists: $public_key"
else
  fail "Public key is missing: $public_key — run: bash apps/api/scripts/generate-keys.sh"
fi

section "Summary"
printf '  %sPassed:%s   %s\n' "$GREEN" "$NC" "$PASS"
printf '  %sWarnings:%s %s\n' "$YELLOW" "$NC" "$WARN"
printf '  %sFailed:%s   %s\n' "$RED" "$NC" "$FAIL"
echo

if [[ "$FAIL" -gt 0 ]]; then
  printf '%s✗ Fix the failures above before developing.%s\n' "$RED" "$NC"
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  printf '%s⚠ Core services are ready; some optional services or features are unavailable.%s\n' "$YELLOW" "$NC"
  exit 0
else
  printf '%s✓ All checked services are healthy — ready to develop!%s\n' "$GREEN" "$NC"
  exit 0
fi
