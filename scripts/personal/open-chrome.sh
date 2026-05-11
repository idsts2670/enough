#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_URL="${ACTUAL_WEB_URL:-http://localhost:3001/login}"
PROFILE_DIR="${ACTUAL_CHROME_PROFILE:-$ROOT/.chrome-actual-profile}"

if [ "$(uname -s)" != "Darwin" ]; then
  printf "Open %s in a browser. Dedicated Chrome profile automation is macOS-only.\n" "$WEB_URL"
  exit 0
fi

if [ ! -d "/Applications/Google Chrome.app" ]; then
  printf "Google Chrome was not found. Open %s manually in a Chromium-based browser.\n" "$WEB_URL"
  exit 0
fi

mkdir -p "$PROFILE_DIR"

open -n -a "Google Chrome" --args \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --new-window "$WEB_URL"
