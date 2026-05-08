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

function Get-CenteredWindowArgs {
    $fallback = @("--window-size=1280,900", "--window-position=80,80")

    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
        $width = [Math]::Min(1280, [Math]::Max(900, $area.Width - 120))
        $height = [Math]::Min(900, [Math]::Max(700, $area.Height - 120))
        $left = [Math]::Max($area.Left, [int]($area.Left + (($area.Width - $width) / 2)))
        $top = [Math]::Max($area.Top, [int]($area.Top + (($area.Height - $height) / 2)))

        return @("--window-size=$width,$height", "--window-position=$left,$top")
    } catch {
        return $fallback
    }
}

function Test-PythonCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$Arguments = @()
    )

    try {
        & $FilePath @Arguments -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-PythonLaunch {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python -and (Test-PythonCommand -FilePath $python.Source)) {
        return @{ FilePath = $python.Source; Arguments = @("serve.py") }
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py -and (Test-PythonCommand -FilePath $py.Source -Arguments @("-3"))) {
        return @{ FilePath = $py.Source; Arguments = @("-3", "serve.py") }
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
            return @{ FilePath = $candidate.FullName; Arguments = @("serve.py") }
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
        $browserArgs += Get-CenteredWindowArgs

        Start-Process `
            -FilePath $browser `
            -ArgumentList $browserArgs
        return
    }

    Start-Process $Url
}

if (-not (Test-PostureServer)) {
    $python = Get-PythonLaunch
    if (-not $python) {
        throw "Python 3.10+ was not found. Run Install Posture Vision.cmd first so Python can be installed automatically."
    }

    Start-Process `
        -FilePath $python.FilePath `
        -ArgumentList $python.Arguments `
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
