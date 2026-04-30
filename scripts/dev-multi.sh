#!/usr/bin/env bash
# Boot one Next dev server and open 4 isolated browser windows:
#   - 1 admin window (your default Chrome profile)
#   - 3 judge windows in throwaway Chrome profiles, each with its own cookies
#
# Each judge window has its own /tmp/judge-N profile dir, so guest sessions /
# Firebase auth state don't collide. Profiles persist across runs; pass
# --fresh to wipe them first.
#
# Usage:  ./scripts/dev-multi.sh         # keep judge profiles
#         ./scripts/dev-multi.sh --fresh # wipe judge profiles first

set -euo pipefail

URL="http://localhost:3000"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ "${1:-}" == "--fresh" ]]; then
  echo "Wiping /tmp/judge-{1,2,3}..."
  rm -rf /tmp/judge-1 /tmp/judge-2 /tmp/judge-3
fi

cleanup() {
  echo ""
  echo "Stopping dev server (pid $DEV_PID)..."
  kill "$DEV_PID" 2>/dev/null || true
  pkill -P "$DEV_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting next dev..."
npm run dev &
DEV_PID=$!

echo "Waiting for $URL..."
for _ in {1..60}; do
  if curl -sSf -o /dev/null "$URL"; then
    break
  fi
  sleep 0.5
done

if ! curl -sSf -o /dev/null "$URL"; then
  echo "Dev server didn't come up in 30s — check the log above."
  exit 1
fi
echo "Server ready."

# Admin window: use your default Chrome profile so saved logins / bookmarks work
echo "Opening admin window → $URL/signin"
open -a "Google Chrome" "$URL/signin"

# Three judge windows, each in an isolated Chrome profile
for i in 1 2 3; do
  echo "Opening judge $i → $URL/judge  (profile /tmp/judge-$i)"
  "$CHROME" \
    --user-data-dir="/tmp/judge-$i" \
    --no-first-run \
    --no-default-browser-check \
    --new-window "$URL/judge" \
    >/dev/null 2>&1 &
done

echo ""
echo "All windows open. Press Ctrl-C to stop the dev server."
wait "$DEV_PID"
