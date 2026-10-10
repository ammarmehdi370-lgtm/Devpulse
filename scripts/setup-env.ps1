$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $rootDir

$envFile = Join-Path $rootDir ".env"
$exampleFile = Join-Path $rootDir ".env.example"

Write-Host "=== Devpulse Environment Setup ===" -ForegroundColor Cyan

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $exampleFile)) {
        throw ".env.example was not found at $exampleFile"
    }
    Copy-Item $exampleFile $envFile
    Write-Host "Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env already exists; preserving existing values" -ForegroundColor Yellow
}

$content = [System.IO.File]::ReadAllText($envFile)
$secretMatch = [regex]::Match($content, '(?m)^[ \t]*SESSION_SECRET[ \t]*=[ \t]*(.*)$')
$currentSecret = if ($secretMatch.Success) { $secretMatch.Groups[1].Value.Trim().Trim('"').Trim("'") } else { "" }

if ([string]::IsNullOrWhiteSpace($currentSecret) -or $currentSecret -eq "replace-with-openssl-rand-hex-32-output") {
    if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
        throw "openssl is required to generate SESSION_SECRET. Install OpenSSL and ensure openssl.exe is available on PATH."
    }
    $newSecret = (& openssl rand -hex 32).Trim()
    if ($LASTEXITCODE -ne 0 -or $newSecret.Length -ne 64) {
        throw "OpenSSL failed to generate a 32-byte SESSION_SECRET."
    }
    if ($secretMatch.Success) {
        $content = [regex]::Replace($content, '(?m)^[ \t]*SESSION_SECRET[ \t]*=.*$', "SESSION_SECRET=$newSecret")
    } else {
        $content += "`nSESSION_SECRET=$newSecret`n"
    }
    [System.IO.File]::WriteAllText($envFile, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Generated SESSION_SECRET" -ForegroundColor Green
} elseif ($currentSecret.Length -lt 32) {
    throw "SESSION_SECRET must be at least 32 characters; update it in .env."
} else {
    Write-Host "SESSION_SECRET is already configured" -ForegroundColor Green
}

$privateKey = Join-Path $rootDir "apps\api\keys\private.pem"
$publicKey = Join-Path $rootDir "apps\api\keys\public.pem"
if (-not (Test-Path $privateKey) -or -not (Test-Path $publicKey)) {
    Write-Host "Generating JWT RS256 keys..."
    & (Join-Path $rootDir "apps\api\scripts\generate-keys.ps1")
} else {
    Write-Host "JWT keys already exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Start infrastructure with: docker compose up -d postgres redis minio"
Write-Host "Start the full stack with: make dev"
