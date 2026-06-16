# Packs a LOCALLY-BUILT Next.js app for upload (run-only deploy).
#
# Use this after `npm run build` when the server can't build (OOM). It bundles
# the compiled .next/ output so the server only needs `npm install --omit=dev`,
# never a build. Excludes .next/cache and .next/trace (build-only, ~500MB).
#
# IMPORTANT: build with the production env active. Move .env.local aside first
# so it doesn't override .env.production:
#     mv .env.local .env.local.bak ; npm run build ; mv .env.local.bak .env.local
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\deploy-pack-built.ps1

$ErrorActionPreference = "Stop"
$root  = $PSScriptRoot
$stage = Join-Path $env:TEMP "veragig-deploy-stage"
$out   = Join-Path $root "veragig-frontend-built.zip"

if (-not (Test-Path (Join-Path $root ".next"))) {
    throw "No .next/ found. Run 'npm run build' first."
}

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# .next without the build-only cache/trace dirs.
robocopy "$root\.next" "$stage\.next" /E /XD "$root\.next\cache" "$root\.next\trace" /NFL /NDL /NJH /NJS /NP | Out-Null

# Static assets and the files needed to install runtime deps + start.
Copy-Item "$root\public" "$stage\public" -Recurse
$files = @("package.json","package-lock.json","next.config.js","server.js",".env.production",".nvmrc")
foreach ($f in $files) {
    $p = Join-Path $root $f
    if (Test-Path $p) { Copy-Item $p (Join-Path $stage $f) } else { Write-Warning "Skipping (not found): $f" }
}

if (Test-Path $out) { Remove-Item $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $out)
Remove-Item $stage -Recurse -Force

$sizeMB = [math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host ""
Write-Host "Built bundle -> $out ($sizeMB MB)" -ForegroundColor Green
Write-Host "On the server, after extracting: npm install --omit=dev  ->  Restart" -ForegroundColor Cyan
