[CmdletBinding()]
param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile
} else {
  Join-Path $repositoryRoot $EnvFile
}
$passCount = 0
$failCount = 0

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
  Write-Error "ERROR: .env not found at $envFile"
  exit 1
}

$supportedVariables = @(
  "DATABASE_URL", "REDIS_URL", "SESSION_SECRET", "JWT_PRIVATE_KEY_PATH",
  "JWT_PUBLIC_KEY_PATH", "FRONTEND_URL", "RESEND_API_KEY", "EMAIL_FROM",
  "EMAIL_FROM_NAME", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL",
  "GITHUB_CLIENT_ID", "GOOGLE_CLIENT_ID", "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_SECRET", "GITHUB_CALLBACK_URL", "GOOGLE_CALLBACK_URL",
  "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SOCKET_URL", "NEXT_PUBLIC_AI_URL",
  "AI_URL", "AI_PORT", "PORT", "NODE_ENV", "TEST_CLEANUP_SECRET"
)
$values = @{}

foreach ($line in [System.IO.File]::ReadLines($envFile)) {
  if ($line -match '^\s*(?:#|$)') {
    continue
  }
  if ($line -notmatch '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
    continue
  }

  $name = $Matches[1]
  if ($supportedVariables -notcontains $name) {
    continue
  }

  $value = $Matches[2].Trim()
  if ($value.Length -ge 2) {
    $first = $value[0]
    $last = $value[$value.Length - 1]
    if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }
  }
  $values[$name] = $value
}

function Test-Credential {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][ValidateSet("required", "optional")][string]$Requirement
  )

  if (-not $values.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace([string]$values[$Name])) {
    if ($Requirement -eq "required") {
      Write-Host "[FAIL] $Name - missing (required)"
      $script:failCount++
    } else {
      Write-Host "[WARN] $Name - not set (optional)"
    }
    return
  }

  $value = [string]$values[$Name]
  if ($value -match '(?i)(your[-_ ]?(actual[-_ ]?)?(key|api[-_ ]?key)|paste[-_ ]|replace[-_ ]|placeholder|changeme|<[^>]+>)') {
    Write-Host "[FAIL] $Name - placeholder value (replace it; value hidden)"
    $script:failCount++
    return
  }

  if ($Name -eq "SESSION_SECRET" -and $value.Length -lt 32) {
    Write-Host "[FAIL] $Name - must be at least 32 characters (value hidden)"
    $script:failCount++
    return
  }
  if ($Name -eq "RESEND_API_KEY" -and -not $value.StartsWith("re_", [System.StringComparison]::Ordinal)) {
    Write-Host "[FAIL] $Name - expected a key beginning with re_ (value hidden)"
    $script:failCount++
    return
  }
  if ($Name -eq "ANTHROPIC_API_KEY" -and -not $value.StartsWith("sk-ant-", [System.StringComparison]::Ordinal)) {
    Write-Host "[FAIL] $Name - expected a key beginning with sk-ant- (value hidden)"
    $script:failCount++
    return
  }

  $prefixLength = [Math]::Min(8, $value.Length)
  $prefix = $value.Substring(0, $prefixLength)
  Write-Host "[OK] $Name = $prefix..."
  $script:passCount++
}

Write-Host "=== Credential Verification ==="
Write-Host "Reading .env values without executing the file; values are masked."
Write-Host ""
Write-Host "Required:"
Test-Credential DATABASE_URL required
Test-Credential REDIS_URL required
Test-Credential SESSION_SECRET required
Test-Credential JWT_PRIVATE_KEY_PATH required
Test-Credential JWT_PUBLIC_KEY_PATH required
Test-Credential FRONTEND_URL required

Write-Host ""
Write-Host "Email (Resend):"
Test-Credential RESEND_API_KEY optional
Test-Credential EMAIL_FROM optional
Test-Credential EMAIL_FROM_NAME optional

Write-Host ""
Write-Host "AI (Anthropic):"
Test-Credential ANTHROPIC_API_KEY optional
Test-Credential ANTHROPIC_MODEL optional

Write-Host ""
Write-Host "OAuth (optional):"
Test-Credential GITHUB_CLIENT_ID optional
Test-Credential GOOGLE_CLIENT_ID optional

Write-Host ""
Write-Host "Results: $passCount configured, $failCount failed"
if ($failCount -gt 0) {
  Write-Host "Fix the missing or placeholder required values before starting services."
  exit 1
}
