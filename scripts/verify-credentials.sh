#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env}"
if [[ "$ENV_FILE" != /* ]]; then
  ENV_FILE="$ROOT/$ENV_FILE"
fi
PASS=0
FAIL=0

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at $ENV_FILE"
  exit 1
fi

is_supported_variable() {
  case "$1" in
    DATABASE_URL|REDIS_URL|SESSION_SECRET|JWT_PRIVATE_KEY_PATH|JWT_PUBLIC_KEY_PATH|FRONTEND_URL|\
    RESEND_API_KEY|EMAIL_FROM|EMAIL_FROM_NAME|ANTHROPIC_API_KEY|ANTHROPIC_MODEL|\
    GITHUB_CLIENT_ID|GOOGLE_CLIENT_ID|GITHUB_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|\
    GITHUB_CALLBACK_URL|GOOGLE_CALLBACK_URL|NEXT_PUBLIC_API_URL|NEXT_PUBLIC_SOCKET_URL|\
    NEXT_PUBLIC_AI_URL|AI_URL|AI_PORT|PORT|NODE_ENV|TEST_CLEANUP_SECRET)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

echo "=== Credential Verification ==="
echo "Reading .env values without executing the file; values are masked."
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  [[ -z "$line" || "$line" == \#* ]] && continue
  line="${line#export }"
  [[ "$line" == *"="* ]] || continue

  name="${line%%=*}"
  value="${line#*=}"
  name="${name%"${name##*[![:space:]]}"}"
  name="${name#"${name%%[![:space:]]*}"}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  if ! is_supported_variable "$name"; then
    continue
  fi
  if [[ ${#value} -ge 2 ]]; then
    first="${value:0:1}"
    last="${value: -1}"
    if [[ ( "$first" == '"' && "$last" == '"' ) || ( "$first" == "'" && "$last" == "'" ) ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi
  printf -v "CREDENTIAL_$name" '%s' "$value"
  export "CREDENTIAL_$name"
done < "$ENV_FILE"

check_var() {
  local name="$1"
  local requirement="$2"
  local value
  local prefix
  local placeholder_pattern='(your[-_ ]?(actual[-_ ]?)?(key|api[-_ ]?key)|paste[-_ ]|replace[-_ ]|placeholder|changeme|<[^>]+>)'

  value="$(printenv "CREDENTIAL_$name" 2>/dev/null || true)"
  if [[ -z "$value" ]]; then
    if [[ "$requirement" == "required" ]]; then
      echo "[FAIL] $name - missing (required)"
      FAIL=$((FAIL + 1))
    else
      echo "[WARN] $name - not set (optional)"
    fi
    return
  fi

  if [[ "$value" =~ $placeholder_pattern ]]; then
    echo "[FAIL] $name - placeholder value (replace it; value hidden)"
    FAIL=$((FAIL + 1))
    return
  fi

  if [[ "$name" == "SESSION_SECRET" && ${#value} -lt 32 ]]; then
    echo "[FAIL] $name - must be at least 32 characters (value hidden)"
    FAIL=$((FAIL + 1))
    return
  fi

  if [[ "$name" == "RESEND_API_KEY" && "$value" != re_* ]]; then
    echo "[FAIL] $name - expected a key beginning with re_ (value hidden)"
    FAIL=$((FAIL + 1))
    return
  fi
  if [[ "$name" == "ANTHROPIC_API_KEY" && "$value" != sk-ant-* ]]; then
    echo "[FAIL] $name - expected a key beginning with sk-ant- (value hidden)"
    FAIL=$((FAIL + 1))
    return
  fi

  prefix="${value:0:8}"
  echo "[OK] $name = ${prefix}..."
  PASS=$((PASS + 1))
}

echo
echo "Required:"
check_var DATABASE_URL required
check_var REDIS_URL required
check_var SESSION_SECRET required
check_var JWT_PRIVATE_KEY_PATH required
check_var JWT_PUBLIC_KEY_PATH required
check_var FRONTEND_URL required

echo
echo "Email (Resend):"
check_var RESEND_API_KEY optional
check_var EMAIL_FROM optional
check_var EMAIL_FROM_NAME optional

echo
echo "AI (Anthropic):"
check_var ANTHROPIC_API_KEY optional
check_var ANTHROPIC_MODEL optional

echo
echo "OAuth (optional):"
check_var GITHUB_CLIENT_ID optional
check_var GOOGLE_CLIENT_ID optional

echo
echo "Results: $PASS configured, $FAIL failed"
if [[ "$FAIL" -gt 0 ]]; then
  echo "Fix the missing or placeholder required values before starting services."
  exit 1
fi
