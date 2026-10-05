[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageJson = Join-Path $repositoryRoot "package.json"

if (-not (Test-Path -LiteralPath $packageJson -PathType Leaf)) {
  throw "Repository package.json was not found at $repositoryRoot"
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
  throw "pnpm was not found. Install Node.js 20.10+ and enable Corepack, then retry."
}

Write-Host "Repository: $repositoryRoot"
Write-Host "pnpm version: $(& pnpm --version)"
Write-Host ""
Write-Host "Checking dependency directories before cleanup..."

$dependencyDirectories = [System.Collections.Generic.List[string]]::new()
$dependencyDirectories.Add((Join-Path $repositoryRoot "node_modules"))
foreach ($workspaceGroup in @("apps", "packages")) {
  $groupPath = Join-Path $repositoryRoot $workspaceGroup
  if (-not (Test-Path -LiteralPath $groupPath -PathType Container)) {
    continue
  }
  foreach ($workspace in Get-ChildItem -LiteralPath $groupPath -Directory -Force) {
    $dependencyDirectories.Add((Join-Path $workspace.FullName "node_modules"))
  }
}

foreach ($directory in $dependencyDirectories) {
  if (Test-Path -LiteralPath $directory) {
    Write-Host "Removing $directory"
    Remove-Item -LiteralPath $directory -Recurse -Force
  }
}

Write-Host ""
Write-Host "Pruning the pnpm store configured in .npmrc..."
& pnpm store prune --store-dir (Join-Path $repositoryRoot ".pnpm-store")
if ($LASTEXITCODE -ne 0) {
  throw "pnpm store prune failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Restoring dependencies from pnpm-lock.yaml..."
& pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
  throw "pnpm install failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Dependencies restored. Run 'make verify-install' or the verification commands in the project instructions."
