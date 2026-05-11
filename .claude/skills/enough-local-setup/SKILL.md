---
name: Enough Local Setup
description: Set up, build, start, open, troubleshoot, or share this personal Enough + Plaid app. Use when the user asks to run the local dashboard, configure Plaid, connect banks, fix localhost/Plaid/SharedArrayBuffer issues, or help another person run this repo.
---

# Enough Local Setup

This project is a personal Enough app forked from Actual Budget with Plaid bank sync. Treat local data and Plaid credentials as sensitive.

## Operating Rules

1. Never print real `.env` values, Plaid access tokens, or personal financial SQLite rows.
2. Do not commit `.env`, `.chrome-actual-profile/`, `packages/sync-server/server-files/`, or `packages/sync-server/user-files/`.
3. Use real Chrome for app verification. Embedded AI browsers may fail Enough's `SharedArrayBuffer` requirement even when Chrome is correct.
4. Share code only. Each user must create their own Plaid app, `.env`, and local data.
5. If Plaid reports OAuth institution registration or review status, check the Plaid dashboard; do not keep changing local code.

## Local Setup Workflow

Run these from the repo root:

```bash
yarn personal:doctor
```

If dependencies are missing:

```bash
yarn personal:setup
```

If the user asks to build everything:

```bash
yarn personal:build
```

Start the app:

```bash
yarn personal:start
```

This starts:

- Backend: `http://localhost:5006`
- Frontend: `http://localhost:3001/login`

If Enough asks for the server URL, use:

```text
http://localhost:5006
```

## Scripts

- `scripts/personal/doctor.sh`: checks Node 22+, Yarn, `.env`, ports, and Chrome.
- `scripts/personal/setup-local.sh`: enables Corepack when available, installs dependencies, and runs the doctor.
- `scripts/personal/start-local.sh`: starts both dev servers and opens Chrome.
- `scripts/personal/open-chrome.sh`: opens Chrome with the repo-local `.chrome-actual-profile/`.

## Environment

Use `.env.example` as the template:

```bash
cp .env.example .env
```

Required keys:

```text
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=production
```

The script also accepts an outer workspace `.env` at `../.env`, which is useful when this repo lives under `money-tracker/`.

## Troubleshooting

If Enough shows a `SharedArrayBuffer` fatal error in an embedded browser but works in Chrome, Chrome is the source of truth.

If real Chrome shows the fatal error, verify:

```bash
curl -I http://localhost:3001/login
```

Expected headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

If Plaid Link is stuck or stale, clear only scoped browser site data:

- `localhost:3001`
- `localhost:5006`
- `plaid.com`
- `cdn.plaid.com`

If Chase or another OAuth bank says registration is required or pending, the fix is in Plaid Dashboard OAuth institution status, not local browser cache.
