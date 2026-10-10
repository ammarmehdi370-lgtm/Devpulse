#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--seed" ]]; then
  SEED=true
elif [[ "$#" -gt 0 ]]; then
  echo "Usage: bash scripts/dev-start.sh [--seed]" >&2
  exit 2
else
  SEED=false
fi

echo
echo "╔══════════════════════════════════════╗"
echo "║     Devpulse Development Startup     ║"
echo "╚══════════════════════════════════════╝"
echo

echo "1. Checking Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running." >&2
  echo "Start Docker Desktop on macOS/Windows or start the Docker service on Linux." >&2
  exit 1
fi
echo "   Docker is running"

echo "2. Checking .env..."
if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "ERROR: .env was not found in the repository root." >&2
  echo "Fix: bash scripts/setup-env.sh" >&2
  exit 1
fi

session_secret="$(sed -n 's/^[[:space:]]*SESSION_SECRET[[:space:]]*=[[:space:]]*//p' "$ROOT_DIR/.env" | tr -d '\r' | tail -n 1)"
session_secret="${session_secret%\"}"
session_secret="${session_secret#\"}"
if [[ -z "$session_secret" || "$session_secret" == "replace-with-openssl-rand-hex-32-output" || ${#session_secret} -lt 32 ]]; then
  echo "ERROR: SESSION_SECRET is missing or shorter than 32 characters in .env." >&2
  echo "Run the environment setup script to generate it." >&2
  exit 1
fi
echo "   .env exists and SESSION_SECRET is configured"

echo "3. Starting PostgreSQL, Redis, and MinIO..."
docker compose up -d postgres redis minio

echo "4. Waiting for PostgreSQL..."
postgres_ready=false
for count in $(seq 1 30); do
  if docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    postgres_ready=true
    break
  fi
  printf "."
  sleep 2
done
echo
if [[ "$postgres_ready" != true ]]; then
  echo "ERROR: PostgreSQL did not become ready within 60 seconds." >&2
  echo "Inspect it with: docker compose logs postgres" >&2
  exit 1
fi
echo "   PostgreSQL ready (host port 5433)"

echo "5. Waiting for Redis..."
redis_ready=false
for count in $(seq 1 15); do
  if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    redis_ready=true
    break
  fi
  printf "."
  sleep 1
done
echo
if [[ "$redis_ready" != true ]]; then
  echo "ERROR: Redis did not become ready within 15 seconds." >&2
  echo "Inspect it with: docker compose logs redis" >&2
  exit 1
fi
echo "   Redis ready"

echo "6. Waiting for MinIO..."
minio_ready=false
for count in $(seq 1 20); do
  if curl --fail --silent --max-time 3 http://localhost:9000/minio/health/live >/dev/null; then
    minio_ready=true
    break
  fi
  printf "."
  sleep 2
done
echo
if [[ "$minio_ready" != true ]]; then
  echo "ERROR: MinIO did not become ready within 40 seconds." >&2
  echo "Inspect it with: docker compose logs minio" >&2
  exit 1
fi
echo "   MinIO ready"

echo "7. Generating Prisma client..."
pnpm generate

echo "8. Applying database migrations..."
pnpm --filter @devpulse/database exec prisma migrate deploy

echo "9. Ensuring MinIO bucket..."
docker compose run --rm minio-init

if [[ "$SEED" == true ]]; then
  echo "10. Seeding database..."
  pnpm seed
fi

echo
echo "Infrastructure is ready."
echo "  PostgreSQL : localhost:5433"
echo "  Redis      : localhost:6379"
echo "  MinIO      : localhost:9000"
echo "  MinIO UI   : http://localhost:9001"
echo
echo "Starting app services..."
pnpm dev
