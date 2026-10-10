$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $rootDir

if ($args.Count -gt 1 -or ($args.Count -eq 1 -and $args[0] -ne "--seed")) {
    throw "Usage: powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1 [--seed]"
}
$seed = $args.Count -eq 1

Write-Host ""
Write-Host "Devpulse Development Startup" -ForegroundColor Cyan
Write-Host "".PadRight(40, "=")
Write-Host ""

Write-Host "1. Checking Docker..."
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Start Docker Desktop, then rerun this script."
}
Write-Host "   Docker is running" -ForegroundColor Green

Write-Host "2. Checking .env..."
$envFile = Join-Path $rootDir ".env"
if (-not (Test-Path $envFile)) {
    throw ".env was not found. Create it with: powershell -ExecutionPolicy Bypass -File scripts/setup-env.ps1"
}
$secretLine = Get-Content $envFile | Where-Object { $_ -match '^\s*SESSION_SECRET\s*=' } | Select-Object -Last 1
$sessionSecret = if ($secretLine) { ($secretLine -replace '^\s*SESSION_SECRET\s*=\s*', '').Trim().Trim('"').Trim("'") } else { "" }
if ($sessionSecret.Length -lt 32 -or $sessionSecret -eq "replace-with-openssl-rand-hex-32-output") {
    throw "SESSION_SECRET is missing or shorter than 32 characters in .env. Run the environment setup script."
}
Write-Host "   .env exists and SESSION_SECRET is configured" -ForegroundColor Green

Write-Host "3. Starting PostgreSQL, Redis, and MinIO..."
docker compose up -d postgres redis minio
if ($LASTEXITCODE -ne 0) { throw "docker compose failed to start the infrastructure services." }

Write-Host "4. Waiting for PostgreSQL..."
$postgresReady = $false
for ($count = 1; $count -le 30; $count++) {
    docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
    if ($LASTEXITCODE -eq 0) {
        $postgresReady = $true
        break
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}
Write-Host ""
if (-not $postgresReady) {
    throw "PostgreSQL did not become ready within 60 seconds. Inspect it with: docker compose logs postgres"
}
Write-Host "   PostgreSQL ready (host port 5433)" -ForegroundColor Green

Write-Host "5. Waiting for Redis..."
$redisReady = $false
for ($count = 1; $count -le 15; $count++) {
    $reply = docker compose exec -T redis redis-cli ping 2>$null
    if ($LASTEXITCODE -eq 0 -and $reply -match "PONG") {
        $redisReady = $true
        break
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host ""
if (-not $redisReady) {
    throw "Redis did not become ready within 15 seconds. Inspect it with: docker compose logs redis"
}
Write-Host "   Redis ready" -ForegroundColor Green

Write-Host "6. Waiting for MinIO..."
$minioReady = $false
for ($count = 1; $count -le 20; $count++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -TimeoutSec 3 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $minioReady = $true
            break
        }
    } catch {}
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}
Write-Host ""
if (-not $minioReady) {
    throw "MinIO did not become ready within 40 seconds. Inspect it with: docker compose logs minio"
}
Write-Host "   MinIO ready" -ForegroundColor Green

Write-Host "7. Generating Prisma client..."
pnpm generate
if ($LASTEXITCODE -ne 0) { throw "Prisma client generation failed." }

Write-Host "8. Applying database migrations..."
pnpm --filter @devpulse/database exec prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Database migrations failed." }

Write-Host "9. Ensuring MinIO bucket..."
docker compose run --rm minio-init
if ($LASTEXITCODE -ne 0) { throw "MinIO bucket creation failed." }

if ($seed) {
    Write-Host "10. Seeding database..."
    pnpm seed
    if ($LASTEXITCODE -ne 0) { throw "Database seeding failed." }
}

Write-Host ""
Write-Host "Infrastructure is ready." -ForegroundColor Green
Write-Host "PostgreSQL localhost:5433 | Redis localhost:6379 | MinIO localhost:9000 | MinIO UI http://localhost:9001"
Write-Host "Starting app services..."
pnpm dev
if ($LASTEXITCODE -ne 0) { throw "Development services exited with an error." }
