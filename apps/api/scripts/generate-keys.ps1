$ErrorActionPreference = "Stop"

$keysDir = Join-Path $PSScriptRoot "..\keys"
New-Item -ItemType Directory -Force -Path $keysDir | Out-Null

$privatePath = Join-Path $keysDir "private.pem"
$publicPath = Join-Path $keysDir "public.pem"

if ((Test-Path $privatePath) -and (Test-Path $publicPath)) {
    Write-Host "Keys already exist at $keysDir" -ForegroundColor Yellow
    exit 0
}

if ((Test-Path $publicPath) -and -not (Test-Path $privatePath)) {
    throw "Public key exists without its private key at $keysDir. Restore the matching private key or move the public key aside before generating a new pair."
}

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: openssl was not found." -ForegroundColor Red
    Write-Host "Install OpenSSL and ensure openssl.exe is available on PATH."
    exit 1
}

Write-Host "Generating RS256 key pair..."
$temporaryPrivate = Join-Path $keysDir "private.$([guid]::NewGuid().ToString('N')).tmp"
$temporaryPublic = Join-Path $keysDir "public.$([guid]::NewGuid().ToString('N')).tmp"
try {
    if (Test-Path $privatePath) {
        & openssl pkey -in $privatePath -pubout -out $temporaryPublic 2>$null
        if ($LASTEXITCODE -ne 0) { throw "OpenSSL failed to derive the public key from the existing private key." }
    } else {
        & openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $temporaryPrivate 2>$null
        if ($LASTEXITCODE -ne 0) { throw "OpenSSL failed to generate the private key." }
        & openssl pkey -in $temporaryPrivate -pubout -out $temporaryPublic 2>$null
        if ($LASTEXITCODE -ne 0) { throw "OpenSSL failed to extract the public key." }
        & openssl pkey -in $temporaryPrivate -check -noout 2>$null
        if ($LASTEXITCODE -ne 0) { throw "OpenSSL could not verify the generated private key." }
        Move-Item $temporaryPrivate $privatePath
    }
    Move-Item $temporaryPublic $publicPath
} finally {
    Remove-Item $temporaryPrivate, $temporaryPublic -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Keys ready. Add to .env:" -ForegroundColor Green
Write-Host "JWT_PRIVATE_KEY_PATH=./keys/private.pem"
Write-Host "JWT_PUBLIC_KEY_PATH=./keys/public.pem"
Write-Host "Never commit these files; they are excluded by .gitignore."