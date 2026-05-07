#!/usr/bin/env bash
set -euo pipefail

AUTOSTART_FILE="$HOME/.config/autostart/posture-vision.desktop"
rm -f "$AUTOSTART_FILE"
echo "Startup shortcut removed."
