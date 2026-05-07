from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import base64
import ctypes
import datetime as dt
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import threading
from ctypes import wintypes
from urllib.parse import parse_qs, urlparse


HOST = "127.0.0.1"
PORT = 8765
APP_NAME = "Posture Vision"
APP_VERSION = "0.1.0-beta.1"
ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "posture-vision.db"
WINDOW_STATE_PATH = DATA_DIR / "hidden-windows.json"
CONTROL_STATE = {
    "pauseToggleSeq": 0,
    "notificationSeq": 0,
    "notificationAckSeq": 0,
    "notifications": [],
}


def startup_shortcut_path():
    if sys.platform != "win32":
        return Path.home() / ".config" / "autostart" / "posture-vision.desktop"

    startup = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    return startup / f"{APP_NAME}.lnk"


def json_response(handler, payload, status=200):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def init_db():
    DATA_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.commit()


def db_get(key):
    init_db()
    with sqlite3.connect(DB_PATH) as connection:
        row = connection.execute("SELECT value FROM kv_store WHERE key = ?", (key,)).fetchone()
    if not row:
        return None
    return json.loads(row[0])


def db_set(key, value):
    init_db()
    updated_at = dt.datetime.now(dt.timezone.utc).isoformat()
    encoded = json.dumps(value)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO kv_store (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (key, encoded, updated_at),
        )
        connection.commit()


def db_delete(key):
    init_db()
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("DELETE FROM kv_store WHERE key = ?", (key,))
        connection.commit()


def db_export():
    init_db()
    with sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute("SELECT key, value, updated_at FROM kv_store ORDER BY key").fetchall()
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "exportedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "items": [
            {"key": key, "value": json.loads(value), "updatedAt": updated_at}
            for key, value, updated_at in rows
        ],
    }


def storage_status():
    init_db()
    return {
        "ok": True,
        "database": str(DB_PATH),
        "exists": DB_PATH.exists(),
        "sizeBytes": DB_PATH.stat().st_size if DB_PATH.exists() else 0,
    }


def storage_key_from_path(path):
    parsed = urlparse(path)
    values = parse_qs(parsed.query).get("key", [])
    return values[0] if values else ""


def read_json_body(handler):
    length = int(handler.headers.get("Content-Length") or 0)
    if not length:
        return None
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def native_notify(title, message):
    safe_title = str(title or APP_NAME)[:64]
    safe_message = str(message or "")[:255]

    if sys.platform.startswith("linux"):
        notify_send = shutil.which("notify-send")
        if not notify_send:
            return False

        subprocess.Popen(
            [notify_send, safe_title, safe_message, "--app-name", APP_NAME, "--urgency", "normal"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True

    if sys.platform != "win32":
        return False

    command = f"""
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Text = {json.dumps(APP_NAME)}
$icon.Icon = [System.Drawing.SystemIcons]::Information
$icon.Visible = $true
$icon.ShowBalloonTip(4000, {json.dumps(safe_title)}, {json.dumps(safe_message)}, [System.Windows.Forms.ToolTipIcon]::Warning)
Start-Sleep -Seconds 5
$icon.Visible = $false
$icon.Dispose()
"""
    encoded = base64.b64encode(command.encode("utf-16le")).decode("ascii")
    subprocess.Popen(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    return True


def lock_workstation():
    if sys.platform == "win32":
        locked = ctypes.windll.user32.LockWorkStation()
        if not locked:
            raise OSError("LockWorkStation returned 0")
        return True

    if sys.platform.startswith("linux"):
        commands = [
            ["loginctl", "lock-session"],
            ["xdg-screensaver", "lock"],
            ["gnome-screensaver-command", "-l"],
            ["qdbus", "org.freedesktop.ScreenSaver", "/ScreenSaver", "Lock"],
        ]

        for command in commands:
            executable = shutil.which(command[0])
            if not executable:
                continue
            result = subprocess.run(
                [executable, *command[1:]],
                cwd=str(ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            if result.returncode == 0:
                return True

        raise OSError("No supported Linux lock command was found")

    raise OSError("Computer lock is only implemented for Windows and Linux")


def queue_notification(title, body, announce=False):
    CONTROL_STATE["notificationSeq"] += 1
    item = {
        "seq": CONTROL_STATE["notificationSeq"],
        "title": str(title or APP_NAME)[:64],
        "body": str(body or "")[:255],
        "announce": bool(announce),
    }
    CONTROL_STATE["notifications"].append(item)
    CONTROL_STATE["notifications"] = CONTROL_STATE["notifications"][-20:]
    return item


def start_tray_helper():
    if sys.platform != "win32":
        return False

    script = ROOT / "tray-posture-vision.ps1"
    if not script.exists():
        raise FileNotFoundError(f"Tray helper not found: {script}")

    subprocess.Popen(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-File",
            str(script),
        ],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    return True


def get_window_long(hwnd, index):
    if ctypes.sizeof(ctypes.c_void_p) == ctypes.sizeof(ctypes.c_longlong):
        return ctypes.windll.user32.GetWindowLongPtrW(hwnd, index)
    return ctypes.windll.user32.GetWindowLongW(hwnd, index)


def set_window_long(hwnd, index, value):
    if ctypes.sizeof(ctypes.c_void_p) == ctypes.sizeof(ctypes.c_longlong):
        return ctypes.windll.user32.SetWindowLongPtrW(hwnd, index, value)
    return ctypes.windll.user32.SetWindowLongW(hwnd, index, value)


def app_windows():
    if sys.platform != "win32":
        return []

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    windows = []
    process_query_limited_information = 0x1000
    browser_process_names = {"msedge.exe", "chrome.exe", "msedgewebview2.exe"}

    def process_name_for_window(hwnd):
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if not pid.value:
            return ""

        handle = kernel32.OpenProcess(process_query_limited_information, False, pid.value)
        if not handle:
            return ""

        try:
            size = wintypes.DWORD(32768)
            buffer = ctypes.create_unicode_buffer(size.value)
            if not kernel32.QueryFullProcessImageNameW(handle, 0, buffer, ctypes.byref(size)):
                return ""
            return Path(buffer.value).name.lower()
        finally:
            kernel32.CloseHandle(handle)

    def enum_proc(hwnd, _):
        text = ctypes.create_unicode_buffer(512)
        user32.GetWindowTextW(hwnd, text, 512)
        title = text.value
        process_name = process_name_for_window(hwnd)
        if process_name in browser_process_names and ("Posture Vision" in title or "127.0.0.1:8765" in title):
            windows.append(hwnd)
        return True

    callback = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)(enum_proc)
    user32.EnumWindows(callback, 0)
    return windows


def app_window_visible_on_screen():
    if sys.platform != "win32":
        return False

    user32 = ctypes.windll.user32
    for hwnd in app_windows():
        if not user32.IsWindowVisible(hwnd):
            continue
        rect = wintypes.RECT()
        if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            continue
        width = rect.right - rect.left
        height = rect.bottom - rect.top
        if width > 100 and height > 100 and rect.right > 0 and rect.bottom > 0 and rect.left < 10000 and rect.top < 10000:
            return True
    return False


def set_app_window_visibility(action):
    if sys.platform != "win32":
        return False

    user32 = ctypes.windll.user32
    g_exstyle = -20
    ws_ex_toolwindow = 0x00000080
    ws_ex_appwindow = 0x00040000
    sw_restore = 9
    sw_shownoactivate = 4
    swp_nozorder = 0x0004
    swp_noactivate = 0x0010
    swp_framechanged = 0x0020
    swp_showwindow = 0x0040

    if action == "hide":
        states = []
        for hwnd in app_windows():
            rect = wintypes.RECT()
            if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                continue

            exstyle = get_window_long(hwnd, g_exstyle)
            width = max(rect.right - rect.left, 320)
            height = max(rect.bottom - rect.top, 240)
            states.append({
                "handle": int(hwnd),
                "left": rect.left,
                "top": rect.top,
                "width": width,
                "height": height,
                "exstyle": int(exstyle),
            })

            tray_style = (int(exstyle) | ws_ex_toolwindow) & ~ws_ex_appwindow
            set_window_long(hwnd, g_exstyle, tray_style)
            user32.SetWindowPos(
                hwnd,
                None,
                -32000,
                -32000,
                320,
                240,
                swp_nozorder | swp_noactivate | swp_framechanged | swp_showwindow,
            )
            user32.ShowWindowAsync(hwnd, sw_shownoactivate)

        if states:
            DATA_DIR.mkdir(exist_ok=True)
            WINDOW_STATE_PATH.write_text(json.dumps({"windows": states}), encoding="utf-8")
        return bool(states)

    if action == "show":
        states = []
        if WINDOW_STATE_PATH.exists():
            try:
                states = json.loads(WINDOW_STATE_PATH.read_text(encoding="utf-8")).get("windows", [])
            except (OSError, json.JSONDecodeError):
                states = []

        restored = False
        for state in states:
            hwnd = int(state.get("handle") or 0)
            if not hwnd or not user32.IsWindow(hwnd):
                continue
            set_window_long(hwnd, g_exstyle, int(state.get("exstyle") or 0))
            user32.SetWindowPos(
                hwnd,
                None,
                int(state.get("left") or 100),
                int(state.get("top") or 100),
                int(state.get("width") or 900),
                int(state.get("height") or 700),
                swp_nozorder | swp_framechanged | swp_showwindow,
            )
            user32.ShowWindowAsync(hwnd, sw_restore)
            user32.SetForegroundWindow(hwnd)
            restored = True

        if WINDOW_STATE_PATH.exists():
            try:
                WINDOW_STATE_PATH.unlink()
            except OSError:
                pass

        if restored:
            return True

        windows = app_windows()
        for hwnd in windows:
            user32.ShowWindowAsync(hwnd, sw_restore)
            user32.SetForegroundWindow(hwnd)
        return bool(windows)

    return False


def close_app_windows():
    if sys.platform != "win32":
        return False

    command = """
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class WindowTools {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    public static IntPtr[] GetProcessWindows(uint targetProcessId) {
        List<IntPtr> windows = new List<IntPtr>();
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            uint windowProcessId;
            GetWindowThreadProcessId(hWnd, out windowProcessId);
            if (windowProcessId == targetProcessId) {
                windows.Add(hWnd);
            }
            return true;
        }, IntPtr.Zero);
        return windows.ToArray();
    }

    public static string GetTitle(IntPtr hWnd) {
        StringBuilder text = new StringBuilder(512);
        GetWindowText(hWnd, text, text.Capacity);
        return text.ToString();
    }
}
"@
$targetUrl = "127.0.0.1:8765"
$commandLines = @{}
Get-CimInstance Win32_Process -Filter "name = 'msedge.exe' or name = 'chrome.exe'" |
    ForEach-Object { $commandLines[[int]$_.ProcessId] = $_.CommandLine }
$count = 0
Get-Process msedge, chrome -ErrorAction SilentlyContinue |
    Where-Object {
        $_.MainWindowTitle -like "*Posture Vision*" -or
        $_.MainWindowTitle -like "*127.0.0.1:8765*" -or
        (($commandLines[[int]$_.Id] -as [string]) -like "*$targetUrl*")
    } |
    ForEach-Object {
        foreach ($handle in [WindowTools]::GetProcessWindows([uint32]$_.Id)) {
            $title = [WindowTools]::GetTitle($handle)
            if ($title -like "*Posture Vision*" -or $title -like "*127.0.0.1:8765*" -or (($commandLines[[int]$_.Id] -as [string]) -like "*$targetUrl*")) {
                [WindowTools]::PostMessage($handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
                $count += 1
            }
        }
    }
Write-Output $count
"""
    encoded = base64.b64encode(command.encode("utf-16le")).decode("ascii")
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
        cwd=str(ROOT),
        check=False,
        capture_output=True,
        text=True,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    try:
        return int((result.stdout or "0").strip().splitlines()[-1]) > 0
    except (ValueError, IndexError):
        return False


def shutdown_server_later(handler):
    def shutdown():
        handler.server.shutdown()

    threading.Timer(0.2, shutdown).start()


def diagnostics_payload():
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "python": sys.version.split()[0],
        "platform": sys.platform,
        "cwd": str(ROOT),
        "database": str(DB_PATH),
        "databaseExists": DB_PATH.exists(),
        "startupInstalled": startup_shortcut_path().exists() if sys.platform == "win32" else False,
    }


def requirements_payload():
    python_version = sys.version_info
    requirements = [
        {
            "name": "Supported desktop OS",
            "ok": sys.platform == "win32" or sys.platform.startswith("linux"),
            "detail": "Windows has full tray support. Linux supports local server launchers, desktop/autostart files, notify-send notifications, and common lock commands.",
        },
        {
            "name": "Python 3.10 or newer",
            "ok": python_version >= (3, 10),
            "detail": f"Detected Python {sys.version.split()[0]}. The installer can install Python 3.12 automatically with winget if Python is missing.",
        },
        {
            "name": "SQLite local database",
            "ok": True,
            "detail": f"Built into Python. Database path: {DB_PATH}",
        },
        {
            "name": "Edge or Chrome app window",
            "ok": True,
            "detail": "The launcher opens a standalone app window. Normal browser tabs may throttle monitoring when you switch tabs.",
        },
        {
            "name": "Webcam",
            "ok": None,
            "detail": "Allow camera permission in the browser. The app verifies camera access when monitoring starts.",
        },
        {
            "name": "Internet for first model load",
            "ok": None,
            "detail": "MediaPipe model/runtime files are currently loaded from external CDNs.",
        },
        {
            "name": "PowerShell script execution",
            "ok": True,
            "detail": "Windows launchers use PowerShell. Linux launchers use Bash shell scripts.",
        },
    ]

    return {
        "ok": all(item["ok"] is not False for item in requirements),
        "requirements": requirements,
    }


def run_script(root, script_name):
    script = root / script_name
    subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script)],
        cwd=str(root),
        check=True,
        capture_output=True,
        text=True,
    )


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        root = ROOT

        if self.path.startswith("/storage/set"):
            try:
                key = storage_key_from_path(self.path)
                if not key:
                    self.send_error(400, "Missing storage key")
                    return
                value = read_json_body(self)
                db_set(key, value)
                json_response(self, {"ok": True, "key": key})
            except Exception as error:
                self.send_error(500, f"Could not save local data: {error}")
            return

        if self.path.startswith("/storage/delete"):
            try:
                key = storage_key_from_path(self.path)
                if not key:
                    self.send_error(400, "Missing storage key")
                    return
                db_delete(key)
                json_response(self, {"ok": True, "key": key})
            except Exception as error:
                self.send_error(500, f"Could not delete local data: {error}")
            return

        if self.path == "/storage/backup":
            try:
                init_db()
                backup_dir = DATA_DIR / "backups"
                backup_dir.mkdir(exist_ok=True)
                timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
                backup_path = backup_dir / f"posture-vision-{timestamp}.db"
                shutil.copy2(DB_PATH, backup_path)
                json_response(self, {"ok": True, "backup": str(backup_path)})
            except Exception as error:
                self.send_error(500, f"Could not back up local database: {error}")
            return

        if self.path == "/startup/install":
            try:
                if sys.platform == "win32":
                    run_script(root, "install-startup.ps1")
                elif sys.platform.startswith("linux"):
                    startup_path = startup_shortcut_path()
                    startup_path.parent.mkdir(parents=True, exist_ok=True)
                    launcher = ROOT / "launch-posture-vision.sh"
                    startup_path.write_text(
                        "\n".join(
                            [
                                "[Desktop Entry]",
                                "Type=Application",
                                f"Name={APP_NAME}",
                                f"Exec={launcher}",
                                "Terminal=false",
                                "X-GNOME-Autostart-enabled=true",
                                "",
                            ]
                        ),
                        encoding="utf-8",
                    )
                else:
                    self.send_error(501, "Startup install is only implemented for Windows and Linux")
                    return
                json_response(self, {"ok": True, "installed": startup_shortcut_path().exists()})
            except Exception as error:
                self.send_error(500, f"Could not install startup shortcut: {error}")
            return

        if self.path == "/startup/remove":
            try:
                path = startup_shortcut_path()
                if path.exists():
                    path.unlink()
                json_response(self, {"ok": True, "installed": False})
            except Exception as error:
                self.send_error(500, f"Could not remove startup shortcut: {error}")
            return

        if self.path == "/control/pause-toggle":
            CONTROL_STATE["pauseToggleSeq"] += 1
            json_response(self, {"ok": True, **CONTROL_STATE})
            return

        if self.path == "/notify":
            try:
                payload = read_json_body(self) or {}
                announce = bool(payload.get("announce"))
                if sys.platform == "win32":
                    start_tray_helper()
                else:
                    native_notify(payload.get("title"), payload.get("body"))
                item = queue_notification(payload.get("title"), payload.get("body"), announce)
                json_response(self, {"ok": True, "queued": item["seq"]})
            except Exception as error:
                self.send_error(500, f"Could not show notification: {error}")
            return

        if self.path == "/notify/ack":
            try:
                payload = read_json_body(self) or {}
                seq = int(payload.get("seq") or 0)
                CONTROL_STATE["notificationAckSeq"] = max(CONTROL_STATE["notificationAckSeq"], seq)
                json_response(self, {"ok": True, "ack": CONTROL_STATE["notificationAckSeq"]})
            except Exception as error:
                self.send_error(500, f"Could not acknowledge notification: {error}")
            return

        if self.path == "/tray/start":
            try:
                started = start_tray_helper()
                json_response(self, {"ok": True, "started": started})
            except Exception as error:
                self.send_error(500, f"Could not start tray helper: {error}")
            return

        if self.path == "/window/minimize":
            try:
                start_tray_helper()
                minimized = set_app_window_visibility("hide")
                json_response(self, {"ok": True, "minimized": minimized})
            except Exception as error:
                self.send_error(500, f"Could not minimize app window: {error}")
            return

        if self.path == "/window/show":
            try:
                shown = set_app_window_visibility("show")
                json_response(self, {"ok": True, "shown": shown})
            except Exception as error:
                self.send_error(500, f"Could not show app window: {error}")
            return

        if self.path == "/app/quit":
            try:
                closed = close_app_windows()
                json_response(self, {"ok": True, "closedWindows": closed})
                shutdown_server_later(self)
            except Exception as error:
                self.send_error(500, f"Could not quit app: {error}")
            return

        if self.path != "/lock":
            self.send_error(404, "Not found")
            return

        try:
            lock_workstation()
            json_response(self, {"ok": True})
        except Exception as error:
            self.send_error(500, f"Could not lock workstation: {error}")

    def do_GET(self):
        if self.path.startswith("/storage/get"):
            try:
                key = storage_key_from_path(self.path)
                if not key:
                    self.send_error(400, "Missing storage key")
                    return
                value = db_get(key)
                json_response(self, {"found": value is not None, "value": value})
            except Exception as error:
                self.send_error(500, f"Could not read local data: {error}")
            return

        if self.path == "/storage/status":
            try:
                json_response(self, storage_status())
            except Exception as error:
                self.send_error(500, f"Could not read storage status: {error}")
            return

        if self.path == "/storage/export":
            try:
                json_response(self, db_export())
            except Exception as error:
                self.send_error(500, f"Could not export local data: {error}")
            return

        if self.path == "/startup/status":
            try:
                json_response(self, {"installed": startup_shortcut_path().exists()})
            except Exception as error:
                self.send_error(500, f"Could not read startup status: {error}")
            return

        if self.path == "/control":
            json_response(self, CONTROL_STATE)
            return

        if self.path == "/version":
            json_response(self, {"name": APP_NAME, "version": APP_VERSION})
            return

        if self.path == "/diagnostics":
            json_response(self, diagnostics_payload())
            return

        if self.path == "/requirements":
            json_response(self, requirements_payload())
            return

        super().do_GET()


if __name__ == "__main__":
    root = ROOT
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Posture Vision is running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        os.chdir(root)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
