$ErrorActionPreference = "Stop"

$envFile = ".env"
$exampleFile = ".env.example"

if (Test-Path $envFile) {
    Write-Host ".env already exists"
    Write-Host "Delete it first: Remove-Item .env"
    exit 0
}

if (-not (Test-Path $exampleFile)) {
    Write-Error ".env.example not found"
    exit 1
}

Copy-Item $exampleFile $envFile
Write-Host "Created .env from .env.example" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Generate SESSION_SECRET:"
Write-Host "   openssl rand -hex 32"
Write-Host "2. Generate JWT keys:"
Write-Host "   powershell -ExecutionPolicy Bypass -File apps/api/scripts/generate-keys.ps1"
Write-Host "3. Add optional credentials as needed, such as ANTHROPIC_API_KEY and RESEND_API_KEY."
