param(
    [switch]$RemoveLocalData
)

$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppName = "Posture Vision"
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "$AppName.lnk"
$ProgramsDir = Join-Path ([Environment]::GetFolderPath("Programs")) $AppName
$StartMenuShortcut = Join-Path $ProgramsDir "$AppName.lnk"
$DataDir = Join-Path $AppDir "data"

foreach ($path in @($DesktopShortcut, $StartMenuShortcut)) {
    if (Test-Path $path) {
        Remove-Item -LiteralPath $path -Force
        Write-Output "Removed shortcut: $path"
    }
}

if (Test-Path (Join-Path $AppDir "uninstall-startup.ps1")) {
    & (Join-Path $AppDir "uninstall-startup.ps1") | Out-Null
}

if ((Test-Path $ProgramsDir) -and -not (Get-ChildItem -LiteralPath $ProgramsDir -Force)) {
    Remove-Item -LiteralPath $ProgramsDir -Force
}

if ($RemoveLocalData -and (Test-Path $DataDir)) {
    Remove-Item -LiteralPath $DataDir -Recurse -Force
    Write-Output "Removed local data: $DataDir"
}

Write-Output "$AppName shortcuts removed."
