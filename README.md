# Posture Vision

A local webcam posture monitor that detects when your head/upper body moves forward from your calibrated upright baseline.

## Run

```powershell
cd D:\Research\LLLM\posture-vision
python serve.py
```

Open `http://127.0.0.1:8765` in a browser, allow camera access, sit upright, and press **Calibrate upright**.

## First-Time Install

Prerequisites:

- Windows 10 or Windows 11
- Internet access during first-time install if Python is not already installed
- Microsoft Edge or Google Chrome for the standalone app window
- A webcam that can see your head and shoulders while seated
- Internet access for the current MediaPipe runtime/model files
- PowerShell, included with Windows, for the launcher and shortcuts

The installer checks for Python 3.10 or newer. If Python is missing, it attempts to install Python 3.12 automatically with Windows Package Manager (`winget`).

For normal use, double-click:

```text
Install Posture Vision.cmd
```

Install Posture Vision for the current Windows user and create Desktop/Start Menu shortcuts:

```powershell
cd D:\Research\LLLM\posture-vision
.\install-posture-vision.ps1
```

Install it and also start the tray helper automatically after Windows login:

```powershell
cd D:\Research\LLLM\posture-vision
.\install-posture-vision.ps1 -Startup
```

Remove app shortcuts later:

```powershell
cd D:\Research\LLLM\posture-vision
.\uninstall-posture-vision.ps1
```

Remove shortcuts and local saved data:

```powershell
cd D:\Research\LLLM\posture-vision
.\uninstall-posture-vision.ps1 -RemoveLocalData
```

## Windows Launcher

Start the app in a standalone Edge/Chrome app window:

```powershell
cd D:\Research\LLLM\posture-vision
.\launch-posture-vision.ps1
```

Open it as a normal browser tab only when debugging:

```powershell
cd D:\Research\LLLM\posture-vision
.\launch-posture-vision.ps1 -BrowserTab
```

Install it to start after Windows login:

```powershell
cd D:\Research\LLLM\posture-vision
.\install-startup.ps1
```

Remove it from Windows startup:

```powershell
cd D:\Research\LLLM\posture-vision
.\uninstall-startup.ps1
```

Run the tray helper:

```powershell
cd D:\Research\LLLM\posture-vision
.\tray-posture-vision.ps1
```

Tray hotkeys:

- `Ctrl+Alt+P`: pause/resume monitoring
- `Ctrl+Alt+O`: open the app
- Use **Automation > Minimize to tray** to hide the app window while keeping the tray icon available.
- Use tray **Quit Posture Vision** to close the app window, stop the local server, and exit the tray helper.

## Notes

- The app runs locally in your browser with a local Python server.
- The app does not record video, audio, screenshots, or webcam images.
- For reliable monitoring, use the Desktop shortcut or `launch-posture-vision.ps1`; normal browser tabs can be throttled when you switch tabs.
- The launcher is single-instance aware. Opening Posture Vision again restores/focuses the existing app window instead of creating another one.
- Use **Settings > Start camera when app opens** to control automatic camera startup after consent is accepted.
- Use **Minimize to tray** instead of closing the standalone app window. Closing the window stops camera processing.
- Minimized posture reminders are queued to the Posture Vision tray helper, which shows a custom topmost alert popup instead of relying on Windows notification balloons.
- Browser notifications are not used, so reminders should not appear twice.
- Use **Automation > Spoken announcements** to turn voice announcements on or off, and **Test announcement** to verify audio.
- Settings, calibration, consent, statistics, profiles, and habit logs are stored in a portable SQLite database at `data\posture-vision.db`.
- Browser storage is used only as a cache/fallback. If browser site data is cleared, the app reloads saved data from SQLite.
- Use **Settings > Back up database** to create a copy under `data\backups`.
- It works best when your webcam can see your head and both shoulders while seated.
- Use **Monitor > Lean score threshold** to choose exactly which score triggers leaning alerts. Lower values are stricter.
- Recalibrate when you change chair position, camera angle, or lighting.
- This is a posture reminder, not a medical assessment tool.
