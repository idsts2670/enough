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

## Local AI Setup: Ollama and qwen3:8b

Enough's Dashboard Savings advisor uses local Ollama by default:

- Base URL: `http://localhost:11434`
- Model: `qwen3:8b`
- Override knobs: `OLLAMA_BASE_URL` and `OLLAMA_MODEL`

Use the official Ollama model tag exactly. Do not pick random `qwen3:8b` lookalikes from search results or user-published variants.

### Install Ollama on macOS

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

The installer should place `Ollama.app` in `/Applications`. In non-interactive agent terminals, the final CLI symlink step can fail because `sudo` needs the user's password. That is not fatal if the app bundle exists. Use the bundled CLI path directly:

```bash
/Applications/Ollama.app/Contents/Resources/ollama --version
```

Start Ollama:

```bash
open -a Ollama
```

Verify the local API is listening:

```bash
curl -s http://localhost:11434/api/tags
```

If it returns `{"models":[]}`, Ollama is running but no models are installed yet.

### Pull and verify qwen3:8b

```bash
/Applications/Ollama.app/Contents/Resources/ollama pull qwen3:8b
```

Confirm the model appears:

```bash
curl -s http://localhost:11434/api/tags
```

Run a real local chat completion:

```bash
curl -s http://localhost:11434/api/chat \
  -d '{"model":"qwen3:8b","stream":false,"messages":[{"role":"user","content":"Reply with exactly: local qwen ready"}]}'
```

The response should include `"model":"qwen3:8b"` and assistant content `local qwen ready`. qwen may also return internal thinking fields; Enough strips `<think>...</think>` style visible output before showing replies.

### Dashboard verification

After Ollama is running and `qwen3:8b` is pulled:

1. Open `http://localhost:5006/budget`.
2. Find the Dashboard Savings advisor panel.
3. Ask a short question, for example `What should I review this month?`.
4. If the UI says `Local AI unavailable`, recheck `curl -s http://localhost:11434/api/tags` and confirm `qwen3:8b` is listed.

## Always-on Daemon (macOS launchd)

The production server can run as a login-item daemon instead of via `yarn personal:start`. When set up, the app is always available at `http://localhost:5006` without any terminal window.

### Plist location

```
~/Library/LaunchAgents/com.enough.budget.plist
```

The plist calls `/opt/homebrew/bin/node` directly with `NODE_ENV=production` and the three Plaid env vars embedded. It is `chmod 600` — never print or log its contents.

### Build before starting the daemon

The daemon runs the compiled output, not the dev server. Rebuild whenever code changes:

```bash
yarn workspace @actual-app/sync-server build   # compiles to packages/sync-server/build/
yarn build:browser                             # compiles to packages/desktop-client/build/
```

The sync-server resolves `@actual-app/web/build` automatically via the Yarn workspace symlink, so both builds are picked up without any extra config.

### Managing the daemon

```bash
# Health check
curl http://localhost:5006/health   # → {"status":"UP"}

# Logs
tail -f /tmp/enough-server.log
tail -f /tmp/enough-server.err

# Stop / start without unloading
launchctl stop  com.enough.budget
launchctl start com.enough.budget

# Force-restart after a rebuild (kills the running process and relaunches)
launchctl kickstart -k gui/$(id -u)/com.enough.budget

# Check state and last exit code
launchctl print gui/$(id -u)/com.enough.budget | grep -E "state|pid|last exit"

# Remove the daemon entirely
launchctl bootout gui/$(id -u)/com.enough.budget
rm ~/Library/LaunchAgents/com.enough.budget.plist
```

### When to rebuild and restart

| Situation                   | Action                                                     |
| --------------------------- | ---------------------------------------------------------- |
| Pulled new sync-server code | `yarn workspace @actual-app/sync-server build` + kickstart |
| Pulled new UI code          | `yarn build:browser` + kickstart                           |
| Changed Plaid credentials   | Edit plist (never commit it), then kickstart               |
| Daemon not responding       | Check `enough-server.err`, then kickstart                  |

### macOS TCC note

launchd agents cannot read files in `~/Documents/` without Full Disk Access. That is why the plist uses `EnvironmentVariables` directly (lives in `~/Library/LaunchAgents/`, outside TCC) rather than sourcing the `.env` file at runtime.

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
