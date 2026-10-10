$ErrorActionPreference = "Stop"

Write-Host "=== Devpulse Service Startup ===" -ForegroundColor Cyan

try {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon unavailable" }
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running. Start Docker Desktop and retry." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env was not found in the repository root." -ForegroundColor Red
    Write-Host "Create it from .env.example, then retry."
    exit 1
}

$sessionLine = Get-Content ".env" | Where-Object { $_ -match '^\s*SESSION_SECRET\s*=' } | Select-Object -Last 1
$sessionSecret = if ($sessionLine) { ($sessionLine -replace '^\s*SESSION_SECRET\s*=\s*', '').Trim().Trim('"').Trim("'") } else { "" }
if ([string]::IsNullOrEmpty($sessionSecret)) {
    Write-Host "ERROR: SESSION_SECRET is not set in .env" -ForegroundColor Red
    Write-Host "Generate one with: openssl rand -hex 32"
    Write-Host "Then add SESSION_SECRET=<your-value> to .env"
    exit 1
}
if ($sessionSecret.Length -lt 32) {
    Write-Host "ERROR: SESSION_SECRET is too short ($($sessionSecret.Length) chars; need at least 32)." -ForegroundColor Red
    Write-Host "Generate a new one with: openssl rand -hex 32"
    exit 1
}
Write-Host "SESSION_SECRET is configured" -ForegroundColor Green

Write-Host "Starting PostgreSQL, Redis, and MinIO..."
docker compose up -d postgres redis minio
if ($LASTEXITCODE -ne 0) { throw "docker compose failed to start infrastructure" }

Write-Host "Waiting for PostgreSQL..."
$postgresReady = $false
for ($count = 1; $count -le 30; $count++) {
    docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
    if ($LASTEXITCODE -eq 0) {
        $postgresReady = $true
        break
    }
    if ($count -lt 30) {
        Write-Host "  Waiting... ($count/30)"
        Start-Sleep -Seconds 2
    }
}
if (-not $postgresReady) {
    Write-Host "ERROR: PostgreSQL did not start in time. Check: docker compose logs postgres" -ForegroundColor Red
    exit 1
}
Write-Host "PostgreSQL is ready" -ForegroundColor Green

Write-Host "Waiting for Redis..."
$redisReady = $false
for ($count = 1; $count -le 15; $count++) {
    $redisReply = docker compose exec -T redis redis-cli ping 2>$null
    if ($LASTEXITCODE -eq 0 -and $redisReply -match "PONG") {
        $redisReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $redisReady) {
    Write-Host "ERROR: Redis did not start in time. Check: docker compose logs redis" -ForegroundColor Red
    exit 1
}
Write-Host "Redis is ready" -ForegroundColor Green

Write-Host "Waiting for MinIO..."
$minioReady = $false
for ($count = 1; $count -le 15; $count++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -TimeoutSec 3 -UseBasicParsing
        $minioReady = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $minioReady) {
    Write-Host "ERROR: MinIO did not become healthy. Check: docker compose logs minio" -ForegroundColor Red
    exit 1
}
Write-Host "MinIO is ready" -ForegroundColor Green

Write-Host "Running database migrations..."
pnpm migrate
if ($LASTEXITCODE -ne 0) { throw "Database migration failed" }

Write-Host "Seeding database..."
pnpm seed
if ($LASTEXITCODE -ne 0) { throw "Database seed failed" }

Write-Host ""
Write-Host "Infrastructure ready. Start app services with: make dev" -ForegroundColor Green
Write-Host "PostgreSQL localhost:5433 | Redis localhost:6379 | MinIO localhost:9000 | MinIO UI localhost:9001"