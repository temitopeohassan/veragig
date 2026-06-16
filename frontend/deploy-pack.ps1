# Packs only the files needed for a cPanel (Passenger) deploy into a zip
# ready to upload via FTP and extract on the server.
#
# node_modules and .next are intentionally excluded — they are built on the
# server (Windows-built binaries won't run on Linux). Run npm install + build
# in cPanel after extracting.
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\deploy-pack.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$out  = Join-Path $root "veragig-frontend-deploy.zip"

# Folders and files that must ship to the server.
$include = @(
    "app", "components", "hooks", "lib", "abis", "public",
    "package.json", "package-lock.json",
    "next.config.js", "tsconfig.json", "postcss.config.js", "tailwind.config.js",
    "server.js", ".nvmrc", ".env.production", "next-env.d.ts"
)

# Collect existing paths; warn about anything missing so the build won't break.
$paths = @()
foreach ($item in $include) {
    $p = Join-Path $root $item
    if (Test-Path $p) {
        $paths += $p
    } else {
        Write-Warning "Skipping (not found): $item"
    }
}

if (Test-Path $out) { Remove-Item $out -Force }

Compress-Archive -Path $paths -DestinationPath $out -CompressionLevel Optimal

$sizeMB = [math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host ""
Write-Host "Packed $($paths.Count) items -> $out ($sizeMB MB)" -ForegroundColor Green
Write-Host "Upload this zip via FTP, extract on the server, then in cPanel:" -ForegroundColor Cyan
Write-Host "  Run NPM Install -> build (Run JS script or 'npm run build') -> Restart"
