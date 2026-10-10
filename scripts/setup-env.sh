#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_FILE="$ROOT_DIR/.env.example"

echo "=== Devpulse Environment Setup ==="

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ ! -f "$EXAMPLE_FILE" ]]; then
    echo "ERROR: .env.example was not found at $EXAMPLE_FILE" >&2
    exit 1
  fi
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "Created .env from .env.example"
else
  echo ".env already exists; preserving existing values"
fi

current_secret="$(sed -n 's/^[[:space:]]*SESSION_SECRET[[:space:]]*=[[:space:]]*//p' "$ENV_FILE" | tr -d '\r' | tail -n 1)"
current_secret="${current_secret%\"}"
current_secret="${current_secret#\"}"
secret_generated=false

if [[ -z "$current_secret" || "$current_secret" == "replace-with-openssl-rand-hex-32-output" ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: openssl is required to generate SESSION_SECRET." >&2
    exit 1
  fi
  new_secret="$(openssl rand -hex 32)"
  if grep -q '^[[:space:]]*SESSION_SECRET[[:space:]]*=' "$ENV_FILE"; then
    if [[ "${OSTYPE:-}" == darwin* ]]; then
      sed -i '' "s|^[[:space:]]*SESSION_SECRET[[:space:]]*=.*|SESSION_SECRET=$new_secret|" "$ENV_FILE"
    else
      sed -i "s|^[[:space:]]*SESSION_SECRET[[:space:]]*=.*|SESSION_SECRET=$new_secret|" "$ENV_FILE"
    fi
  else
    printf '\nSESSION_SECRET=%s\n' "$new_secret" >> "$ENV_FILE"
  fi
  current_secret="$new_secret"
  secret_generated=true
  echo "Generated SESSION_SECRET"
fi

if [[ ${#current_secret} -lt 32 ]]; then
  echo "ERROR: SESSION_SECRET must be at least 32 characters; update it in .env." >&2
  exit 1
fi

if [[ "$secret_generated" == false ]]; then
  echo "SESSION_SECRET is already configured"
fi

if [[ ! -f "$ROOT_DIR/apps/api/keys/private.pem" || ! -f "$ROOT_DIR/apps/api/keys/public.pem" ]]; then
  echo "Generating JWT RS256 keys..."
  bash "$ROOT_DIR/apps/api/scripts/generate-keys.sh"
else
  echo "JWT keys already exist"
fi

echo
echo "=== Setup complete ==="
echo "Optional credentials can be added to .env for OAuth, email, billing, and AI features."
echo "Start infrastructure with: docker compose up -d postgres redis minio"
echo "Start the full stack with: make dev"
