#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="http://127.0.0.1:8765"
PROFILE_DIR="$APP_DIR/data/browser-profile-linux"

no_browser=0
browser_tab=0
for arg in "$@"; do
  case "$arg" in
    --no-browser) no_browser=1 ;;
    --browser-tab) browser_tab=1 ;;
  esac
done

find_python() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1 && {
      command -v python3
      return 0
    }
  fi

  if command -v python >/dev/null 2>&1; then
    python -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1 && {
      command -v python
      return 0
    }
  fi

  return 1
}

server_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$URL/index.html" >/dev/null 2>&1
    return
  fi

  "$PYTHON" - <<PY >/dev/null 2>&1
from urllib.request import urlopen
urlopen("$URL/index.html", timeout=2).read()
PY
}

open_browser() {
  if [ "$browser_tab" -eq 1 ]; then
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$URL" >/dev/null 2>&1 &
      return
    fi
  fi

  mkdir -p "$PROFILE_DIR"
  local args=(
    "--app=$URL"
    "--new-window"
    "--user-data-dir=$PROFILE_DIR"
    "--no-first-run"
    "--no-default-browser-check"
    "--disable-background-timer-throttling"
    "--disable-renderer-backgrounding"
    "--disable-backgrounding-occluded-windows"
  )

  for browser in microsoft-edge-stable microsoft-edge google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$browser" >/dev/null 2>&1; then
      "$browser" "${args[@]}" >/dev/null 2>&1 &
      return
    fi
  done

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
    return
  fi

  echo "Could not find Edge, Chrome, Chromium, or xdg-open." >&2
  return 1
}

PYTHON="$(find_python || true)"
if [ -z "$PYTHON" ]; then
  echo "Python 3.10 or newer was not found. Install python3, then run this launcher again." >&2
  exit 1
fi

if ! server_ready; then
  (cd "$APP_DIR" && "$PYTHON" serve.py >/dev/null 2>&1 &)

  for _ in $(seq 1 40); do
    if server_ready; then
      break
    fi
    sleep 0.25
  done
fi

if ! server_ready; then
  echo "Posture Vision server did not start at $URL" >&2
  exit 1
fi

if [ "$no_browser" -eq 0 ]; then
  open_browser
fi

echo "Posture Vision is running at $URL"
