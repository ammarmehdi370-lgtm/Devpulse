#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

READY=1
API_URL="${PLAYWRIGHT_API_URL:-http://localhost:4000}"
WEB_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
ENV_FILES=("$ROOT/.env.test" "$ROOT/.env" "$ROOT/apps/api/.env")
CURL_BIN="$(command -v curl.exe || command -v curl)"
CURL_OUTPUT="/dev/null"
if [[ "$CURL_BIN" == *.exe ]]; then
  CURL_OUTPUT="NUL"
fi

check_url() {
  local name="$1"
  local url="$2"
  if "$CURL_BIN" -fsS --max-time 5 -o "$CURL_OUTPUT" "$url" 2>/dev/null; then
    printf 'OK  %s (%s)\n' "$name" "$url"
  else
    printf 'FAIL %s is not reachable: %s\n' "$name" "$url"
    READY=0
  fi
}

check_cmd() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK  %s\n' "$name"
  else
    printf 'FAIL %s check failed\n' "$name"
    READY=0
  fi
}

check_env() {
  local variable="$1"
  local env_file
  if [[ -n "${!variable:-}" ]]; then
    printf 'OK  %s is set\n' "$variable"
    return
  fi

  for env_file in "${ENV_FILES[@]}"; do
    if [[ -f "$env_file" ]] && grep -Eq "^[[:space:]]*${variable}[[:space:]]*=[[:space:]]*[^[:space:]#]" "$env_file"; then
      printf 'OK  %s is set in %s\n' "$variable" "${env_file#"$ROOT"/}"
      return
    fi
  done

  printf 'FAIL %s is not set\n' "$variable"
  READY=0
}

printf '=== E2E Readiness Check ===\n'

check_cmd "PostgreSQL" docker compose exec -T postgres pg_isready -U devpulse -d devpulse
check_url "API" "$API_URL/health"
check_url "API E2E test readiness" "$API_URL/health/ready"

if "$CURL_BIN" -fsS --max-time 5 -o "$CURL_OUTPUT" "$WEB_URL" 2>/dev/null; then
  printf 'OK  Web (%s)\n' "$WEB_URL"
else
  printf 'INFO Web is not running; Playwright will start it from playwright.config.ts\n'
fi

NODE_BIN="$(command -v node || command -v node.exe || true)"
if [[ -n "$NODE_BIN" ]] && chromium_path="$(cd "$ROOT/apps/web" && "$NODE_BIN" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const store = path.resolve(process.cwd(), "../../node_modules/.pnpm");
const packageDir = fs
  .readdirSync(store)
  .filter((entry) => entry.startsWith("@playwright+test@"))
  .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))[0];
if (!packageDir) process.exit(1);
const { chromium } = require(
  path.join(store, packageDir, "node_modules/@playwright/test"),
);
const executable = chromium.executablePath();
if (!fs.existsSync(executable)) process.exit(1);
process.stdout.write(executable);
NODE
)"; then
  printf 'OK  Chromium (%s)\n' "$chromium_path"
else
  printf 'FAIL Chromium is unavailable; run pnpm --dir apps/web exec playwright install chromium\n'
  READY=0
fi

check_env SESSION_SECRET
check_env JWT_PRIVATE_KEY_PATH
check_env JWT_PUBLIC_KEY_PATH
check_env DATABASE_URL

if [[ -f "$ROOT/apps/api/keys/private.pem" ]]; then
  printf 'OK  apps/api/keys/private.pem exists\n'
else
  printf 'FAIL apps/api/keys/private.pem missing; run the API key-generation script\n'
  READY=0
fi

if [[ -f "$ROOT/apps/api/keys/public.pem" ]]; then
  printf 'OK  apps/api/keys/public.pem exists\n'
else
  printf 'FAIL apps/api/keys/public.pem missing; run the API key-generation script\n'
  READY=0
fi

demo_user="$(docker compose exec -T postgres psql -U devpulse -d devpulse -Atqc "SELECT email FROM \"User\" WHERE email = 'demo@devpulse.local' LIMIT 1" 2>/dev/null | tr -d '[:space:]' || true)"
if [[ "$demo_user" == "demo@devpulse.local" ]]; then
  printf 'OK  Demo user is seeded\n'
else
  printf 'FAIL Demo user is missing; run pnpm seed\n'
  READY=0
fi

printf '\n'
if [[ "$READY" -eq 1 ]]; then
  printf 'OK  Ready to run E2E tests\n'
  printf '    pnpm --filter @devpulse/web test:e2e:editor\n'
else
  printf 'FAIL Fix the issues above before running E2E tests\n'
  exit 1
fi