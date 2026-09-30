#!/usr/bin/env bash
set -euo pipefail

echo "=== Devpulse Service Startup ==="

if ! docker info >/dev/null 2>&1; then
  echo >&2
  echo "ERROR: Docker is not running." >&2
  echo "Start Docker Desktop and retry." >&2
  echo "On Linux: sudo systemctl start docker" >&2
  exit 1
fi
echo "Docker is running"

if [[ ! -f .env ]]; then
  echo >&2
  echo "ERROR: .env was not found in the repository root." >&2
  echo "Create it from .env.example, then retry." >&2
  exit 1
fi

echo "Starting PostgreSQL, Redis, and MinIO..."
docker compose up -d postgres redis minio

echo "Waiting for PostgreSQL..."
for count in $(seq 1 30); do
  if docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    echo "PostgreSQL is ready"
    break
  fi
  if [[ "$count" -eq 30 ]]; then
    echo "ERROR: PostgreSQL did not start in time." >&2
    echo "Check logs with: docker compose logs postgres" >&2
    exit 1
  fi
  echo "  Waiting... ($count/30)"
  sleep 2
done

echo "Waiting for Redis..."
for count in $(seq 1 15); do
  if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "Redis is ready"
    break
  fi
  if [[ "$count" -eq 15 ]]; then
    echo "ERROR: Redis did not start in time." >&2
    echo "Check logs with: docker compose logs redis" >&2
    exit 1
  fi
  sleep 1
done

echo "Waiting for MinIO..."
for count in $(seq 1 15); do
  if curl --fail --silent http://localhost:9000/minio/health/live >/dev/null; then
    echo "MinIO is ready"
    break
  fi
  if [[ "$count" -eq 15 ]]; then
    echo "ERROR: MinIO did not become healthy in time." >&2
    echo "Check logs with: docker compose logs minio" >&2
    exit 1
  fi
  sleep 2
done

echo "Running database migrations..."
pnpm --filter @devpulse/database exec prisma migrate deploy

echo "Seeding database..."
pnpm seed

cat <<'EOF'

=== Infrastructure ready ===
PostgreSQL : localhost:5433
Redis      : localhost:6379
MinIO      : localhost:9000
MinIO UI   : localhost:9001

Start application services with: make dev
EOF