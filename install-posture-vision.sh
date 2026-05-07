#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Posture Vision"
DESKTOP_FILE="$HOME/.local/share/applications/posture-vision.desktop"
DESKTOP_SHORTCUT="$HOME/Desktop/posture-vision.desktop"
AUTOSTART_FILE="$HOME/.config/autostart/posture-vision.desktop"
INSTALL_STARTUP=0
NO_LAUNCH=0

for arg in "$@"; do
  case "$arg" in
    --startup) INSTALL_STARTUP=1 ;;
    --no-launch) NO_LAUNCH=1 ;;
  esac
done

find_python() {
  for python in python3 python; do
    if command -v "$python" >/dev/null 2>&1 && "$python" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

if ! find_python; then
  echo "Python 3.10 or newer was not found."
  echo "Install it with your package manager, for example:"
  echo "  sudo apt install python3"
  echo "  sudo dnf install python3"
  echo "  sudo pacman -S python"
  exit 1
fi

mkdir -p "$APP_DIR/data" "$HOME/.local/share/applications"
chmod +x "$APP_DIR/launch-posture-vision.sh" "$APP_DIR/install-startup.sh" "$APP_DIR/uninstall-startup.sh" "$APP_DIR/uninstall-posture-vision.sh"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Local webcam posture monitor
Exec=$APP_DIR/launch-posture-vision.sh
Path=$APP_DIR
Terminal=false
Categories=Utility;Health;
EOF

chmod +x "$DESKTOP_FILE"

if [ -d "$HOME/Desktop" ]; then
  cp "$DESKTOP_FILE" "$DESKTOP_SHORTCUT"
  chmod +x "$DESKTOP_SHORTCUT"
fi

if [ "$INSTALL_STARTUP" -eq 1 ]; then
  "$APP_DIR/install-startup.sh"
fi

echo "$APP_NAME installed for this Linux user."
echo "Application shortcut: $DESKTOP_FILE"
if [ -f "$DESKTOP_SHORTCUT" ]; then
  echo "Desktop shortcut: $DESKTOP_SHORTCUT"
fi
echo "Local database folder: $APP_DIR/data"

if [ "$NO_LAUNCH" -eq 0 ]; then
  "$APP_DIR/launch-posture-vision.sh" >/dev/null 2>&1 &
fi
