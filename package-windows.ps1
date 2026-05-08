$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Product = Get-Content -Raw -LiteralPath (Join-Path $AppDir "product.json") | ConvertFrom-Json
$Version = [string]$Product.version
$DistDir = Join-Path $AppDir "dist\PostureVision"
$VersionedZip = Join-Path $AppDir "dist\PostureVision-$Version-windows.zip"
$BetaZip = Join-Path $AppDir "dist\PostureVision-beta.zip"

if (Test-Path $DistDir) {
    Remove-Item -LiteralPath $DistDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
& (Join-Path $AppDir "build-icon.ps1") | Out-Null

$files = @(
    "app.js",
    "index.html",
    "styles.css",
    "serve.py",
    "Install Posture Vision.cmd",
    "Uninstall Posture Vision.cmd",
    "install-posture-vision.ps1",
    "uninstall-posture-vision.ps1",
    "launch-posture-vision.ps1",
    "tray-posture-vision.ps1",
    "install-startup.ps1",
    "uninstall-startup.ps1",
    "launch-posture-vision.sh",
    "install-posture-vision.sh",
    "uninstall-posture-vision.sh",
    "install-startup.sh",
    "uninstall-startup.sh",
    "build-icon.ps1",
    "README.md",
    "PRIVACY.md",
    "TERMS.md",
    "RELEASE_CHECKLIST.md",
    "product.json"
)

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $AppDir $file) -Destination $DistDir -Force
}

Copy-Item -LiteralPath (Join-Path $AppDir "assets") -Destination (Join-Path $DistDir "assets") -Recurse -Force

Compress-Archive -Path $DistDir -DestinationPath $VersionedZip -Force
Copy-Item -LiteralPath $VersionedZip -Destination $BetaZip -Force

Write-Output "Created versioned package:"
Write-Output $VersionedZip
Write-Output "Updated beta package:"
Write-Output $BetaZip
