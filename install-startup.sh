#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTOSTART_DIR="$HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/posture-vision.desktop"

mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Posture Vision
Comment=Start Posture Vision after login
Exec=$APP_DIR/launch-posture-vision.sh --no-browser
Path=$APP_DIR
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

chmod +x "$AUTOSTART_FILE"
echo "Startup shortcut installed: $AUTOSTART_FILE"
