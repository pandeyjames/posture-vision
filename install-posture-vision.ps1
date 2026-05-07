param(
    [switch]$Startup,
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppName = "Posture Vision"
$LauncherPath = Join-Path $AppDir "launch-posture-vision.ps1"
$TrayPath = Join-Path $AppDir "tray-posture-vision.ps1"
$DataDir = Join-Path $AppDir "data"

if (-not (Test-Path $LauncherPath)) {
    throw "Launcher not found: $LauncherPath"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python was not found. Install Python 3, then run this installer again."
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

function New-PostureShortcut {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,

        [string]$ScriptArguments = "",

        [string]$Description = "Open Posture Vision"
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`" $ScriptArguments"
    $shortcut.WorkingDirectory = $AppDir
    $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
    $shortcut.Description = $Description
    $shortcut.Save()
}

$DesktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "$AppName.lnk"
$ProgramsDir = Join-Path ([Environment]::GetFolderPath("Programs")) $AppName
$StartMenuShortcut = Join-Path $ProgramsDir "$AppName.lnk"

New-Item -ItemType Directory -Force -Path $ProgramsDir | Out-Null
New-PostureShortcut -Path $DesktopShortcut -ScriptPath $TrayPath -ScriptArguments "-OpenOnStart" -Description "Open Posture Vision with tray support"
New-PostureShortcut -Path $StartMenuShortcut -ScriptPath $TrayPath -ScriptArguments "-OpenOnStart" -Description "Open Posture Vision with tray support"

if ($Startup) {
    if (-not (Test-Path $TrayPath)) {
        throw "Tray helper not found: $TrayPath"
    }
    & (Join-Path $AppDir "install-startup.ps1") | Out-Null
}

Write-Output "$AppName installed for this Windows user."
Write-Output "Desktop shortcut: $DesktopShortcut"
Write-Output "Start Menu shortcut: $StartMenuShortcut"
Write-Output "Local database folder: $DataDir"

if (-not $NoLaunch) {
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TrayPath`" -OpenOnStart" `
        -WorkingDirectory $AppDir `
        -WindowStyle Hidden
}
