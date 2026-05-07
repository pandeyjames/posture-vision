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

function Test-PythonCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$Arguments = @()
    )

    try {
        $output = & $FilePath @Arguments -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-PosturePython {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python -and (Test-PythonCommand -FilePath $python.Source)) {
        return $python.Source
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py -and (Test-PythonCommand -FilePath $py.Source -Arguments @("-3"))) {
        return $py.Source
    }

    $roots = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python"),
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)}
    )

    foreach ($root in $roots) {
        if (-not $root -or -not (Test-Path $root)) {
            continue
        }

        $candidate = Get-ChildItem -Path $root -Recurse -Filter python.exe -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notlike "*WindowsApps*" } |
            Sort-Object FullName -Descending |
            Select-Object -First 1

        if ($candidate -and (Test-PythonCommand -FilePath $candidate.FullName)) {
            return $candidate.FullName
        }
    }

    return $null
}

function Install-PythonIfMissing {
    if (Get-PosturePython) {
        return
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        throw "Python 3.10+ was not found and winget is not available. Install Python 3.10 or newer, then run this installer again."
    }

    Write-Output "Python 3.10+ was not found. Installing Python 3.12 with winget..."
    & $winget.Source install --id Python.Python.3.12 --source winget --scope user --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "Python installation failed. Install Python 3.10 or newer, then run this installer again."
    }

    if (-not (Get-PosturePython)) {
        throw "Python was installed, but this PowerShell session cannot find it yet. Close this window, reopen the installer, and run it again."
    }
}

Install-PythonIfMissing
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
