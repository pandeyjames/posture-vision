param(
    [switch]$NoBrowser,
    [switch]$BrowserTab
)

$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8765
$Url = "http://127.0.0.1:$Port"
$BrowserProfileDir = Join-Path $AppDir "data\browser-profile"

function Test-PostureServer {
    try {
        $response = Invoke-WebRequest -Uri "$Url/index.html" -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-AppBrowser {
    $paths = @(
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
    )

    foreach ($path in $paths) {
        if ($path -and (Test-Path $path)) {
            return $path
        }
    }

    $commands = @("msedge", "chrome")
    foreach ($command in $commands) {
        $found = Get-Command $command -ErrorAction SilentlyContinue
        if ($found -and $found.Source) {
            return $found.Source
        }
    }

    return $null
}

function Open-PostureApp {
    if ($BrowserTab) {
        Start-Process $Url
        return
    }

    $browser = Get-AppBrowser
    if ($browser) {
        New-Item -ItemType Directory -Force -Path $BrowserProfileDir | Out-Null
        $browserArgs = @(
            "--app=$Url",
            "--new-window",
            "--user-data-dir=$BrowserProfileDir",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--disable-features=CalculateNativeWinOcclusion"
        )

        Start-Process `
            -FilePath $browser `
            -ArgumentList $browserArgs
        return
    }

    Start-Process $Url
}

if (-not (Test-PostureServer)) {
    $python = Get-Command python -ErrorAction Stop
    Start-Process `
        -FilePath $python.Source `
        -ArgumentList "serve.py" `
        -WorkingDirectory $AppDir `
        -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline) {
        if (Test-PostureServer) {
            break
        }
        Start-Sleep -Milliseconds 300
    }
}

if (-not (Test-PostureServer)) {
    throw "Posture Vision server did not start on $Url"
}

if (-not $NoBrowser) {
    Open-PostureApp
}
if ($Host.Name -ne "ConsoleHost") {
    Write-Output "Posture Vision is running at $Url"
}
