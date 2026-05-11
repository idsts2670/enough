#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAILED=0

pass() { printf "PASS %s\n" "$1"; }
warn() { printf "WARN %s\n" "$1"; }
fail() {
  printf "FAIL %s\n" "$1"
  FAILED=1
}

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

has_env_key() {
  key="$1"
  file="$2"
  grep -Eq "^${key}=.+" "$file"
}

printf "Enough local setup doctor\n"
printf "Repo: %s\n\n" "$ROOT"

if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -v)"
  NODE_MAJOR="$(printf "%s" "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)"
  if [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then
    pass "Node $NODE_VERSION is installed"
  else
    fail "Node $NODE_VERSION is installed, but this repo expects Node 22+"
  fi
else
  fail "Node is missing"
fi

if command -v yarn >/dev/null 2>&1; then
  pass "Yarn is available: $(yarn --version)"
else
  fail "Yarn is missing. Enable Corepack, then run yarn install."
fi

if command -v corepack >/dev/null 2>&1; then
  pass "Corepack is available"
else
  warn "Corepack is missing; Yarn version management may fail"
fi

if [ -d "$ROOT/node_modules" ]; then
  pass "Dependencies appear installed"
else
  warn "node_modules is missing; run yarn personal:setup or yarn install"
fi

if ENV_FILE="$(find_env_file)"; then
  pass "Environment file found at $ENV_FILE"
  for key in PLAID_CLIENT_ID PLAID_SECRET PLAID_ENV; do
    if has_env_key "$key" "$ENV_FILE"; then
      pass "$key is present"
    else
      fail "$key is missing from $ENV_FILE"
    fi
  done
else
  fail "No .env file found. Copy .env.example to .env and add Plaid credentials."
fi

for port in 3001 5006; do
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      warn "Port $port is already in use"
    else
      pass "Port $port is free"
    fi
  else
    warn "lsof is unavailable; skipping port $port check"
  fi
done

if [ "$(uname -s)" = "Darwin" ]; then
  if [ -d "/Applications/Google Chrome.app" ]; then
    pass "Google Chrome is installed"
  else
    warn "Google Chrome app was not found in /Applications"
  fi
else
  warn "open-chrome.sh is macOS-specific; use http://localhost:3001/login manually"
fi

printf "\n"
if [ "$FAILED" -eq 0 ]; then
  pass "Doctor completed. Start with: yarn personal:start"
else
  fail "Doctor found blockers. Fix them before starting."
fi

exit "$FAILED"
