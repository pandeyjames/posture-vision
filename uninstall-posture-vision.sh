#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOVE_LOCAL_DATA=0

for arg in "$@"; do
  case "$arg" in
    --remove-local-data) REMOVE_LOCAL_DATA=1 ;;
  esac
done

rm -f "$HOME/.local/share/applications/posture-vision.desktop"
rm -f "$HOME/Desktop/posture-vision.desktop"
rm -f "$HOME/.config/autostart/posture-vision.desktop"

if [ "$REMOVE_LOCAL_DATA" -eq 1 ]; then
  rm -rf "$APP_DIR/data"
fi

echo "Posture Vision Linux shortcuts removed."
