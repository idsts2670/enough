#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT"

if [ ! -f "$ROOT/.env" ] && [ ! -f "$ROOT/../.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  printf "Created %s from .env.example.\n" "$ROOT/.env"
  printf "Add your own Plaid credentials before starting the app.\n"
  exit 1
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi

yarn install
yarn personal:doctor
