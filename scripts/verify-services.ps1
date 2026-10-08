$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

$passCount = 0
$failCount = 0
$warnCount = 0
$infrastructureOnly = $args.Count -gt 0 -and $args[0] -eq "--infrastructure-only"
if ($args.Count -gt 0 -and -not $infrastructureOnly) {
    Write-Host "Usage: powershell -ExecutionPolicy Bypass -File scripts/verify-services.ps1 [--infrastructure-only]" -ForegroundColor Red
    Pop-Location
    exit 2
}

function Check-Pass {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    $script:passCount++
}

function Check-Fail {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:failCount++
}

function Check-Warn {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    $script:warnCount++
}

function Get-Setting {
    param([string]$Name)
    $fromProcess = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($fromProcess)) {
        return $fromProcess
    }
    if ($script:envSettings.ContainsKey($Name)) {
        return $script:envSettings[$Name]
    }
    return ""
}

function Test-Config {
    param([string]$Name, [bool]$Required)
    if (-not [string]::IsNullOrWhiteSpace((Get-Setting $Name))) {
        Check-Pass "$Name is configured"
    } elseif ($Required) {
        Check-Fail "$Name is missing (required)"
    } else {
        Check-Warn "$Name is not set (optional)"
    }
}

function Test-Http {
    param([string]$Url)
    try {
        return Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    } catch {
        if ($null -ne $_.Exception.Response) {
            $response = $_.Exception.Response
            $content = ""
            try {
                $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
                $content = $reader.ReadToEnd()
                $reader.Dispose()
            } catch {}
            return [pscustomobject]@{
                StatusCode = [int]$response.StatusCode
                Content    = $content
            }
        }
        return $null
    }
}

$script:envSettings = @{}
if (Test-Path ".env") {
    foreach ($line in Get-Content ".env") {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and
                (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                 ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $script:envSettings[$Matches[1]] = $value
        }
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Devpulse Service Health Check    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Cyan

if (Test-Path ".env") {
    Check-Pass ".env file found"
} else {
    Check-Fail ".env file missing — run: bash scripts/setup-env.sh"
}

Write-Host ""
Write-Host "── Infrastructure ──" -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -eq 0) {
    Check-Pass "Docker is running"
} else {
    Check-Fail "Docker is not running — start Docker Desktop or the Docker service"
}

$pgPort = Get-Setting "POSTGRES_PORT"
if ([string]::IsNullOrWhiteSpace($pgPort)) { $pgPort = "5433" }
docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
if ($LASTEXITCODE -eq 0) {
    Check-Pass "PostgreSQL (host port $pgPort)"
} else {
    Check-Fail "PostgreSQL is not reachable on port $pgPort — run: docker compose up -d postgres"
}

$redisReply = docker compose exec -T redis redis-cli ping 2>$null
if ($LASTEXITCODE -eq 0 -and (($redisReply -join "").Trim() -eq "PONG")) {
    Check-Pass "Redis (port 6379)"
} else {
    Check-Fail "Redis is not reachable — run: docker compose up -d redis"
}

$minioResponse = Test-Http "http://localhost:9000/minio/health/live"
if ($null -ne $minioResponse -and $minioResponse.StatusCode -ge 200 -and $minioResponse.StatusCode -lt 300) {
    Check-Pass "MinIO storage (port 9000)"
} else {
    Check-Fail "MinIO is not reachable on port 9000 — run: docker compose up -d minio"
}

$bucket = Get-Setting "MINIO_BUCKET"
if ([string]::IsNullOrWhiteSpace($bucket)) { $bucket = "devpulse-files" }
$bucketCommand = 'mc alias set local http://minio:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null && mc stat "local/$MINIO_BUCKET" >/dev/null'
docker compose run --rm --no-deps --entrypoint /bin/sh minio-init -c $bucketCommand *> $null
if ($LASTEXITCODE -eq 0) {
    Check-Pass "MinIO bucket '$bucket'"
} else {
    Check-Fail "MinIO bucket '$bucket' is missing or could not be verified — run: docker compose run --rm minio-init"
}

if (-not $infrastructureOnly) {
    Write-Host ""
    Write-Host "── Application Services ──" -ForegroundColor Cyan

    $apiUrl = [Environment]::GetEnvironmentVariable("DEVPULSE_API_URL")
    if ([string]::IsNullOrWhiteSpace($apiUrl)) { $apiUrl = "http://localhost:4000" }
    $apiResponse = Test-Http "$apiUrl/health"
    if ($null -eq $apiResponse) {
        Check-Fail "API is not running (port 4000) — run: pnpm --filter @devpulse/api dev"
    } elseif ($apiResponse.StatusCode -lt 200 -or $apiResponse.StatusCode -ge 300) {
        Check-Fail "API health endpoint returned HTTP $($apiResponse.StatusCode)"
    } else {
        try {
            $apiHealth = $apiResponse.Content | ConvertFrom-Json -ErrorAction Stop
            if ($apiHealth.status -eq "ok") {
                Check-Pass "API (port 4000) — status: ok"
            } else {
                Check-Fail "API is running but unhealthy (status: $($apiHealth.status)) — inspect API and dependency logs"
            }
        } catch {
            Check-Fail "API health endpoint returned invalid JSON"
        }
    }

    $socketUrl = [Environment]::GetEnvironmentVariable("DEVPULSE_SOCKET_URL")
    if ([string]::IsNullOrWhiteSpace($socketUrl)) { $socketUrl = "http://localhost:4001" }
    $socketResponse = Test-Http "$socketUrl/health"
    if ($null -ne $socketResponse -and $socketResponse.StatusCode -ge 200 -and $socketResponse.StatusCode -lt 300) {
        Check-Pass "Socket.IO (port 4001)"
    } else {
        Check-Warn "Socket.IO is not running (port 4001) — run: pnpm --filter @devpulse/socket dev"
    }

    $aiUrl = [Environment]::GetEnvironmentVariable("DEVPULSE_AI_URL")
    if ([string]::IsNullOrWhiteSpace($aiUrl)) { $aiUrl = "http://localhost:4002" }
    $aiResponse = Test-Http "$aiUrl/health"
    if ($null -eq $aiResponse) {
        Check-Warn "AI service is not running (port 4002) — run: pnpm --filter @devpulse/ai dev"
    } else {
        try {
            $aiHealth = $aiResponse.Content | ConvertFrom-Json -ErrorAction Stop
            if ($aiHealth.configured -eq $true) {
                Check-Pass "AI service (port 4002) — Anthropic configured"
            } else {
                Check-Warn "AI service is running but Anthropic is not configured — set ANTHROPIC_API_KEY in .env"
            }
        } catch {
            Check-Warn "AI service health endpoint returned invalid JSON"
        }
    }

    $webUrl = [Environment]::GetEnvironmentVariable("DEVPULSE_WEB_URL")
    if ([string]::IsNullOrWhiteSpace($webUrl)) { $webUrl = "http://localhost:3000" }
    $webResponse = Test-Http $webUrl
    if ($null -ne $webResponse -and $webResponse.StatusCode -ge 200 -and $webResponse.StatusCode -lt 300) {
        Check-Pass "Web app (port 3000)"
    } else {
        Check-Warn "Web app is not running (port 3000) — run: pnpm --filter @devpulse/web dev"
    }
}

Write-Host ""
Write-Host "── Configuration ──" -ForegroundColor Cyan
if (Test-Path ".env") {
    Test-Config "DATABASE_URL" $true
    Test-Config "REDIS_URL" $true
    Test-Config "SESSION_SECRET" $true
    Test-Config "RESEND_API_KEY" $false
    Test-Config "ANTHROPIC_API_KEY" $false
    Test-Config "GITHUB_CLIENT_ID" $false
} else {
    Check-Fail "Configuration cannot be read without .env"
}

Write-Host ""
Write-Host "── JWT Keys ──" -ForegroundColor Cyan
$privateKey = Get-Setting "JWT_PRIVATE_KEY_PATH"
$publicKey = Get-Setting "JWT_PUBLIC_KEY_PATH"
if ([string]::IsNullOrWhiteSpace($privateKey)) { $privateKey = "./keys/private.pem" }
if ([string]::IsNullOrWhiteSpace($publicKey)) { $publicKey = "./keys/public.pem" }
if (-not (Test-Path $privateKey) -and (Test-Path (Join-Path "apps/api" $privateKey))) {
    $privateKey = Join-Path "apps/api" $privateKey
}
if (-not (Test-Path $publicKey) -and (Test-Path (Join-Path "apps/api" $publicKey))) {
    $publicKey = Join-Path "apps/api" $publicKey
}
if (Test-Path $privateKey) {
    Check-Pass "Private key exists: $privateKey"
} else {
    Check-Fail "Private key is missing: $privateKey — run: bash apps/api/scripts/generate-keys.sh"
}
if (Test-Path $publicKey) {
    Check-Pass "Public key exists: $publicKey"
} else {
    Check-Fail "Public key is missing: $publicKey — run: bash apps/api/scripts/generate-keys.sh"
}

Write-Host ""
Write-Host "── Summary ──" -ForegroundColor Cyan
Write-Host "  Passed:   $passCount" -ForegroundColor Green
Write-Host "  Warnings: $warnCount" -ForegroundColor Yellow
Write-Host "  Failed:   $failCount" -ForegroundColor Red
Write-Host ""

Pop-Location
if ($failCount -gt 0) {
    Write-Host "✗ Fix the failures above before developing." -ForegroundColor Red
    exit 1
} elseif ($warnCount -gt 0) {
    Write-Host "⚠ Core services are ready; some optional services or features are unavailable." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✓ All checked services are healthy — ready to develop!" -ForegroundColor Green
    exit 0
}
