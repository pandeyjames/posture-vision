param(
    [switch]$OpenOnStart
)

$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = "http://127.0.0.1:8765"
$LogPath = Join-Path $AppDir "data\tray-helper.log"
$IconPath = Join-Path $AppDir "assets\posture-vision.ico"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies @("System.Windows.Forms", "System.Drawing") -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class HotkeyWindow : Form {
    public const int WM_HOTKEY = 0x0312;
    public event Action<int> HotkeyPressed;

    protected override void SetVisibleCore(bool value) {
        base.SetVisibleCore(false);
    }

    protected override void WndProc(ref Message m) {
        if (m.Msg == WM_HOTKEY && HotkeyPressed != null) {
            HotkeyPressed(m.WParam.ToInt32());
        }
        base.WndProc(ref m);
    }
}

public static class HotkeyNative {
    [DllImport("user32.dll")]
    public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
}
"@

function Invoke-PostureLaunch {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File (Join-Path $AppDir "launch-posture-vision.ps1")
}

function Invoke-PostureServerOnly {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File (Join-Path $AppDir "launch-posture-vision.ps1") -NoBrowser | Out-Null
}

function Write-TrayLog {
    param([string]$Message)
    try {
        $logDir = Split-Path -Parent $LogPath
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Force -Path $logDir | Out-Null
        }
        Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o) $Message"
    } catch {
        # Logging must never break notifications.
    }
}

function Invoke-PauseToggle {
    try {
        Invoke-PostureServerOnly
        Invoke-WebRequest -Uri "$Url/control/pause-toggle" -Method Post -UseBasicParsing -TimeoutSec 3 | Out-Null
        $notifyIcon.ShowBalloonTip(1200, "Posture Vision", "Pause/resume command sent.", [System.Windows.Forms.ToolTipIcon]::Info)
    } catch {
        $notifyIcon.ShowBalloonTip(2000, "Posture Vision", "Could not send pause command.", [System.Windows.Forms.ToolTipIcon]::Warning)
    }
}

function Invoke-OpenApp {
    try {
        Invoke-PostureServerOnly
        $response = Invoke-WebRequest -Uri "$Url/window/show" -Method Post -UseBasicParsing -TimeoutSec 3
        $payload = $response.Content | ConvertFrom-Json
        if ($payload.shown) {
            return
        }
    } catch {
        # Fall back to launching a fresh app window below.
    }

    Invoke-PostureLaunch
}

function Invoke-InstallStartup {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File (Join-Path $AppDir "install-startup.ps1") | Out-Null
    $notifyIcon.ShowBalloonTip(1500, "Posture Vision", "Startup shortcut installed.", [System.Windows.Forms.ToolTipIcon]::Info)
}

function Invoke-RemoveStartup {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File (Join-Path $AppDir "uninstall-startup.ps1") | Out-Null
    $notifyIcon.ShowBalloonTip(1500, "Posture Vision", "Startup shortcut removed.", [System.Windows.Forms.ToolTipIcon]::Info)
}

function Show-PosturePopup {
    param(
        [string]$Title,
        [string]$Body
    )

    foreach ($screen in [System.Windows.Forms.Screen]::AllScreens) {
        $form = New-Object System.Windows.Forms.Form
        $form.Text = "Posture Vision"
        $form.ClientSize = New-Object System.Drawing.Size(420, 180)
        $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
        $form.MaximizeBox = $false
        $form.MinimizeBox = $false
        $form.ShowInTaskbar = $false
        $form.TopMost = $true
        $form.BackColor = [System.Drawing.Color]::FromArgb(255, 247, 237)
        $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual

        $area = $screen.WorkingArea
        $form.Left = $area.Right - $form.Width - 24
        $form.Top = $area.Top + 24

        $titleLabel = New-Object System.Windows.Forms.Label
        $titleLabel.Text = $Title
        $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
        $titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(124, 45, 18)
        $titleLabel.AutoSize = $false
        $titleLabel.Left = 16
        $titleLabel.Top = 14
        $titleLabel.Width = 370
        $titleLabel.Height = 30

        $bodyLabel = New-Object System.Windows.Forms.Label
        $bodyLabel.Text = $Body
        $bodyLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11)
        $bodyLabel.ForeColor = [System.Drawing.Color]::FromArgb(24, 31, 30)
        $bodyLabel.AutoSize = $false
        $bodyLabel.Left = 16
        $bodyLabel.Top = 54
        $bodyLabel.Width = 380
        $bodyLabel.Height = 70

        $closeButton = New-Object System.Windows.Forms.Button
        $closeButton.Text = "OK"
        $closeButton.Left = 316
        $closeButton.Top = 136
        $closeButton.Width = 84
        $closeButton.Height = 30
        $closeButton.Add_Click({
            try {
                if ($this.FindForm()) {
                    $this.FindForm().Close()
                }
            } catch {
                Write-TrayLog "Popup close button failed: $($_.Exception.Message)"
            }
        })

        $timer = New-Object System.Windows.Forms.Timer
        $timer.Interval = 15000
        $timer.Tag = $form
        $timer.Add_Tick({
            try {
                $sender = [System.Windows.Forms.Timer]$this
                $sender.Stop()
                if ($sender.Tag -and -not $sender.Tag.IsDisposed) {
                    $sender.Tag.Close()
                }
            } catch {
                Write-TrayLog "Popup timer close failed: $($_.Exception.Message)"
            }
        })

        $form.Controls.Add($titleLabel)
        $form.Controls.Add($bodyLabel)
        $form.Controls.Add($closeButton)
        $form.Tag = $timer
        $form.Add_Shown({
            try {
                [System.Media.SystemSounds]::Exclamation.Play()
                $this.TopMost = $true
                $this.Activate()
                $this.BringToFront()
                $this.Focus()
                if ($this.Tag) {
                    $this.Tag.Start()
                }
            } catch {
                Write-TrayLog "Popup timer start failed: $($_.Exception.Message)"
            }
        })
        $form.Add_FormClosed({
            try {
                if ($this.Tag) {
                    $this.Tag.Stop()
                    $this.Tag.Dispose()
                    $this.Tag = $null
                }
            } catch {
                Write-TrayLog "Popup cleanup failed: $($_.Exception.Message)"
            }
        })
        try {
            $form.Show()
            Write-TrayLog "Popup shown at left=$($form.Left) top=$($form.Top) width=$($form.Width) height=$($form.Height) screen=$($screen.DeviceName)"
        } catch {
            Write-TrayLog "Popup show failed: $($_.Exception.Message)"
            try { $form.Dispose() } catch {}
        }
    }
}

function Invoke-NotificationPoll {
    try {
        Invoke-PostureServerOnly
        $response = Invoke-WebRequest -Uri "$Url/control" -UseBasicParsing -TimeoutSec 3
        $payload = $response.Content | ConvertFrom-Json
        if ([int]$payload.notificationSeq -lt $script:lastNotificationSeq) {
            Write-TrayLog "Notification sequence reset from $script:lastNotificationSeq to $($payload.notificationSeq). Resetting cursor."
            $script:lastNotificationSeq = 0
        }
        foreach ($notification in @($payload.notifications)) {
            if ([int]$notification.seq -gt $script:lastNotificationSeq) {
                try {
                    $notifyIcon.ShowBalloonTip(
                        5000,
                        ([string]$notification.title),
                        ([string]$notification.body),
                        [System.Windows.Forms.ToolTipIcon]::Warning
                    )
                    Write-TrayLog "Balloon shown for seq=$($notification.seq)"
                } catch {
                    Write-TrayLog "Balloon show failed for seq=$($notification.seq): $($_.Exception.Message)"
                }
                if ($notification.announce) {
                    $script:speaker.SpeakAsyncCancelAll()
                    $script:speaker.SpeakAsync([string]$notification.body) | Out-Null
                }
                $script:lastNotificationSeq = [int]$notification.seq
                Write-TrayLog "Displayed notification seq=$($notification.seq) title=$($notification.title) announce=$($notification.announce)"
                try {
                    $ackBody = @{ seq = [int]$notification.seq } | ConvertTo-Json -Compress
                    Invoke-WebRequest -Uri "$Url/notify/ack" -Method Post -ContentType "application/json" -Body $ackBody -UseBasicParsing -TimeoutSec 3 | Out-Null
                } catch {
                    Write-TrayLog "Failed to acknowledge notification seq=$($notification.seq): $($_.Exception.Message)"
                }
            }
        }
    } catch {
        Write-TrayLog "Notification poll failed: $($_.Exception.Message)"
        # Keep the tray helper quiet if the local server is restarting.
    }
}

function Invoke-QuitApp {
    try {
        Invoke-WebRequest -Uri "$Url/app/quit" -Method Post -UseBasicParsing -TimeoutSec 3 | Out-Null
        Write-TrayLog "Quit requested: app windows and server shutdown requested."
    } catch {
        Write-TrayLog "Quit app request failed: $($_.Exception.Message)"
    }

    [System.Windows.Forms.Application]::Exit()
}

$createdNew = $false
$trayMutex = New-Object System.Threading.Mutex($true, "Local\PostureVisionTrayHelper", [ref]$createdNew)
if (-not $createdNew) {
    if ($OpenOnStart) {
        Invoke-PostureLaunch
    }
    return
}

Invoke-PostureServerOnly
Write-TrayLog "Tray helper started."

try {
    $initialResponse = Invoke-WebRequest -Uri "$Url/control" -UseBasicParsing -TimeoutSec 3
    $initialPayload = $initialResponse.Content | ConvertFrom-Json
    $script:lastNotificationSeq = [int]($initialPayload.notificationSeq)
    Write-TrayLog "Initialized notification cursor at seq=$script:lastNotificationSeq"
} catch {
    $script:lastNotificationSeq = 0
    Write-TrayLog "Could not initialize notification cursor: $($_.Exception.Message)"
}

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "Posture Vision"
$notifyIcon.Icon = if (Test-Path $IconPath) { New-Object System.Drawing.Icon $IconPath } else { [System.Drawing.SystemIcons]::Information }
$notifyIcon.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$openItem = $menu.Items.Add("Open app    Ctrl+Alt+O")
$openItem.Add_Click({ Invoke-OpenApp })

$pauseItem = $menu.Items.Add("Pause / Resume    Ctrl+Alt+P")
$pauseItem.Add_Click({ Invoke-PauseToggle })

$menu.Items.Add("-") | Out-Null

$startupItem = $menu.Items.Add("Start with Windows")
$startupItem.Add_Click({ Invoke-InstallStartup })

$removeStartupItem = $menu.Items.Add("Remove startup")
$removeStartupItem.Add_Click({ Invoke-RemoveStartup })

$menu.Items.Add("-") | Out-Null

$quitItem = $menu.Items.Add("Quit Posture Vision")
$quitItem.Add_Click({
    Invoke-QuitApp
})

$notifyIcon.ContextMenuStrip = $menu
$notifyIcon.Add_DoubleClick({ Invoke-OpenApp })

$window = New-Object HotkeyWindow
$window.add_HotkeyPressed({
    param($id)
    if ($id -eq 1) { Invoke-PauseToggle }
    if ($id -eq 2) { Invoke-OpenApp }
})

$MOD_ALT = 0x0001
$MOD_CONTROL = 0x0002
$VK_P = 0x50
$VK_O = 0x4F

[HotkeyNative]::RegisterHotKey($window.Handle, 1, ($MOD_CONTROL -bor $MOD_ALT), $VK_P) | Out-Null
[HotkeyNative]::RegisterHotKey($window.Handle, 2, ($MOD_CONTROL -bor $MOD_ALT), $VK_O) | Out-Null

$script:speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$script:speaker.Volume = 90
$script:speaker.Rate = 0
$notificationTimer = New-Object System.Windows.Forms.Timer
$notificationTimer.Interval = 1500
$notificationTimer.Add_Tick({ Invoke-NotificationPoll })
$notificationTimer.Start()

if ($OpenOnStart) {
    Invoke-OpenApp
}

$notifyIcon.ShowBalloonTip(1800, "Posture Vision", "Tray helper running. Ctrl+Alt+P pauses/resumes, Ctrl+Alt+O opens the app.", [System.Windows.Forms.ToolTipIcon]::Info)

try {
    [System.Windows.Forms.Application]::Run($window)
} finally {
    [HotkeyNative]::UnregisterHotKey($window.Handle, 1) | Out-Null
    [HotkeyNative]::UnregisterHotKey($window.Handle, 2) | Out-Null
    $notificationTimer.Stop()
    $notificationTimer.Dispose()
    $script:speaker.SpeakAsyncCancelAll()
    $script:speaker.Dispose()
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    $trayMutex.ReleaseMutex()
    $trayMutex.Dispose()
}
