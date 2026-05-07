$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Posture Vision.lnk"
$LauncherPath = Join-Path $AppDir "tray-posture-vision.ps1"

if (-not (Test-Path $LauncherPath)) {
    throw "Tray helper not found: $LauncherPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$LauncherPath`""
$shortcut.WorkingDirectory = $AppDir
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
$shortcut.Save()

Write-Output "Installed startup shortcut:"
Write-Output $ShortcutPath
