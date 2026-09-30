$ErrorActionPreference = "Stop"

$keysDir = Join-Path $PSScriptRoot "..\keys"
New-Item -ItemType Directory -Force -Path $keysDir | Out-Null

$privatePath = Join-Path $keysDir "private.pem"
$publicPath = Join-Path $keysDir "public.pem"

if ((Test-Path $privatePath) -and (Test-Path $publicPath)) {
    Write-Host "Keys already exist at $keysDir" -ForegroundColor Yellow
    Write-Host "Delete apps/api/keys/*.pem first to regenerate."
    exit 0
}

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: openssl was not found." -ForegroundColor Red
    Write-Host "Install Git for Windows (which includes OpenSSL) or install OpenSSL."
    exit 1
}

Write-Host "Generating RS256 key pair..."
& openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privatePath 2>$null
if ($LASTEXITCODE -ne 0) { throw "OpenSSL failed to generate the private key." }
Write-Host "Private key: $privatePath"

& openssl pkey -in $privatePath -pubout -out $publicPath 2>$null
if ($LASTEXITCODE -ne 0) { throw "OpenSSL failed to extract the public key." }
Write-Host "Public key: $publicPath"

& openssl pkey -in $privatePath -check -noout 2>$null
if ($LASTEXITCODE -ne 0) { throw "OpenSSL could not verify the generated private key." }

Write-Host ""
Write-Host "Keys ready. Add to .env:" -ForegroundColor Green
Write-Host "JWT_PRIVATE_KEY_PATH=./keys/private.pem"
Write-Host "JWT_PUBLIC_KEY_PATH=./keys/public.pem"
Write-Host "Never commit these files; they are excluded by .gitignore."