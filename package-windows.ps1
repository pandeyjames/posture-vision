$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistDir = Join-Path $AppDir "dist\PostureVision"

if (Test-Path $DistDir) {
    Remove-Item -LiteralPath $DistDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

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
    "README.md",
    "PRIVACY.md",
    "TERMS.md",
    "RELEASE_CHECKLIST.md",
    "product.json"
)

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $AppDir $file) -Destination $DistDir -Force
}

Compress-Archive -Path $DistDir -DestinationPath (Join-Path $AppDir "dist\PostureVision-beta.zip") -Force

Write-Output "Created beta package:"
Write-Output (Join-Path $AppDir "dist\PostureVision-beta.zip")
