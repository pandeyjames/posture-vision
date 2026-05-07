$ErrorActionPreference = "Stop"

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Posture Vision.lnk"

if (Test-Path $ShortcutPath) {
    Remove-Item -LiteralPath $ShortcutPath -Force
    Write-Output "Removed startup shortcut:"
    Write-Output $ShortcutPath
} else {
    Write-Output "Startup shortcut was not installed."
}
