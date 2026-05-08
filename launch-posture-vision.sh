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

centered_window_args() {
  local width=1280
  local height=900
  local left=80
  local top=80

  if command -v xrandr >/dev/null 2>&1; then
    local geometry
    geometry="$(xrandr --current 2>/dev/null | awk '/ connected primary/{print $4; exit} / connected/{print $3; exit}')"
    if [[ "$geometry" =~ ^([0-9]+)x([0-9]+)\+([-0-9]+)\+([-0-9]+)$ ]]; then
      local screen_width="${BASH_REMATCH[1]}"
      local screen_height="${BASH_REMATCH[2]}"
      local screen_left="${BASH_REMATCH[3]}"
      local screen_top="${BASH_REMATCH[4]}"

      width=$(( screen_width - 120 ))
      height=$(( screen_height - 120 ))
      [ "$width" -gt 1280 ] && width=1280
      [ "$height" -gt 900 ] && height=900
      [ "$width" -lt 900 ] && width=900
      [ "$height" -lt 700 ] && height=700
      left=$(( screen_left + (screen_width - width) / 2 ))
      top=$(( screen_top + (screen_height - height) / 2 ))
    fi
  fi

  printf '%s\n' "--window-size=$width,$height" "--window-position=$left,$top"
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
  mapfile -t centered_args < <(centered_window_args)
  args+=("${centered_args[@]}")

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
