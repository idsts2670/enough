#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_PORT="${ACTUAL_SERVER_PORT:-5006}"
WEB_PORT="${ACTUAL_WEB_PORT:-3001}"

find_env_file() {
  if [ -n "${ACTUAL_PERSONAL_ENV:-}" ] && [ -f "$ACTUAL_PERSONAL_ENV" ]; then
    printf "%s\n" "$ACTUAL_PERSONAL_ENV"
    return 0
  fi

  if [ -f "$ROOT/.env" ]; then
    printf "%s\n" "$ROOT/.env"
    return 0
  fi

  if [ -f "$ROOT/../.env" ]; then
    printf "%s\n" "$ROOT/../.env"
    return 0
  fi

  return 1
}

port_in_use() {
  port="$1"
  command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_url() {
  url="$1"
  timeout_seconds="$2"
  elapsed=0

  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi

  until curl -fsS "$url" >/dev/null 2>&1; do
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      printf "Timed out waiting for %s\n" "$url"
      return 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
}

if port_in_use "$SERVER_PORT" || port_in_use "$WEB_PORT"; then
  printf "One or both local ports are already in use.\n"
  printf "Server port: %s\n" "$SERVER_PORT"
  printf "Web port: %s\n" "$WEB_PORT"

  if port_in_use "$SERVER_PORT" && port_in_use "$WEB_PORT"; then
    printf "Both ports are already listening; not starting duplicate servers.\n"
    if [ "${OPEN_CHROME:-1}" != "0" ]; then
      "$ROOT/scripts/personal/open-chrome.sh"
    fi
    exit 0
  fi

  printf "Stop the process using the occupied port, then rerun yarn personal:start.\n"
  exit 1
fi

if [ ! -d "$ROOT/node_modules" ]; then
  printf "Dependencies are missing. Run yarn personal:setup first.\n"
  exit 1
fi

ENV_FILE="$(find_env_file || true)"
if [ -z "$ENV_FILE" ]; then
  printf "No .env file found. Copy .env.example to .env and add Plaid credentials.\n"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${PLAID_CLIENT_ID:?Missing PLAID_CLIENT_ID in $ENV_FILE}"
: "${PLAID_SECRET:?Missing PLAID_SECRET in $ENV_FILE}"
: "${PLAID_ENV:?Missing PLAID_ENV in $ENV_FILE}"

printf "Starting Enough\n"
printf "Env file: %s\n" "$ENV_FILE"
printf "Server: http://localhost:%s\n" "$SERVER_PORT"
printf "Web: http://localhost:%s/login\n\n" "$WEB_PORT"

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "${WEB_PID:-}" ]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup INT TERM EXIT

(
  cd "$ROOT"
  NODE_ENV=development BROWSER_OPEN=localhost:"$SERVER_PORT" yarn workspace @actual-app/sync-server start-monitor
) &
SERVER_PID=$!

(
  cd "$ROOT"
  PORT="$WEB_PORT" REACT_APP_BACKEND_WORKER_HASH=dev yarn workspace @actual-app/web start --mode=browser --force
) &
WEB_PID=$!

(
  wait_for_url "http://localhost:${SERVER_PORT}/health" 120 || true
  wait_for_url "http://localhost:${WEB_PORT}/login" 120 || true
  if [ "${OPEN_CHROME:-1}" != "0" ]; then
    "$ROOT/scripts/personal/open-chrome.sh"
  fi
) &

while kill -0 "$SERVER_PID" >/dev/null 2>&1 && kill -0 "$WEB_PID" >/dev/null 2>&1; do
  sleep 2
done

printf "A dev process exited; stopping the remaining process.\n"
exit 1
