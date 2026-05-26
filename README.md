<p align="center">
  <img src="/demo.png" alt="Enough — personal finance dashboard" />
</p>

# Enough

A calm personal-finance app for dense, repeated money work. Forked from [Actual Budget](https://github.com/actualbudget/actual) and extended with Plaid bank sync and a redesigned UI.

- **Free for local personal use** — run the app and sync server on your own machine with no Enough subscription, hosting bill, or managed cloud service
- **Local-first** — all data lives in SQLite on your machine, no cloud required
- **Plaid sync** — pull live transactions from your bank accounts automatically
- **Envelope budgeting** — allocate income to categories before you spend it
- **Dashboard** — net worth, spending, categories, and recurring bills at a glance

## Cost Model

Enough is intended to be completely free to run for personal local use:

- The app runs locally from this repository, and the server can be served from your own machine at `http://localhost:5006`.
- Your budget data stays in local SQLite files unless you choose to expose or host the server elsewhere.
- There is no Enough subscription, hosted service, or required paid infrastructure when you run it locally.
- Plaid bank sync can use the [Plaid Trial plan](https://support.plaid.com/hc/en-us/articles/39994173227159-What-is-the-Plaid-Trial-plan), which currently provides free access to Plaid production APIs for eligible US/Canada developers.

Plaid Trial is free, but not unlimited. It currently allows up to 10 production Items, and API calls are unlimited only for Items you have already connected. Plaid also says `/item/remove` is not supported on Trial, so treat each production bank connection as a limited slot. If you need more Items or products outside the Trial plan, you will need a paid Plaid Production account.

## Quick Start

Requires Node.js ≥ 22 and Yarn ^4.9.1.

```bash
# 1. Copy env template and fill in your Plaid credentials
cp .env.example .env

# 2. Check prerequisites
yarn personal:doctor

# 3. Install dependencies (first time)
yarn personal:setup

# 4. Start the app
yarn personal:start
```

`yarn personal:start` launches the sync server on `http://localhost:5006` and the web app on `http://localhost:3001/login`.

When prompted for a server URL, enter `http://localhost:5006`.

## Environment

| Key               | Description                               |
| ----------------- | ----------------------------------------- |
| `PLAID_CLIENT_ID` | Your Plaid app client ID                  |
| `PLAID_SECRET`    | Plaid secret for the target environment   |
| `PLAID_ENV`       | `sandbox`, `development`, or `production` |

See `.env.example` for all available options.

## Always-on via macOS launchd (optional)

Instead of running `yarn personal:start` every time, you can register the production server as a macOS login item. It starts silently on login, restarts on crash, and serves the app at `http://localhost:5006` — no terminal window needed.

**One-time build** (run once, and again after pulling updates):

```bash
yarn workspace @actual-app/sync-server build
yarn build:browser
```

**Create the plist** at `~/Library/LaunchAgents/com.enough.budget.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.enough.budget</string>

  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/node</string>
    <string>/ABSOLUTE/PATH/TO/enough/packages/sync-server/build/app.js</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>        <string>production</string>
    <key>PLAID_CLIENT_ID</key> <string>YOUR_PLAID_CLIENT_ID</string>
    <key>PLAID_SECRET</key>    <string>YOUR_PLAID_SECRET</string>
    <key>PLAID_ENV</key>       <string>production</string>
  </dict>

  <key>RunAtLoad</key>  <true/>
  <key>KeepAlive</key>  <true/>
  <key>ThrottleInterval</key> <integer>10</integer>

  <key>StandardOutPath</key> <string>/tmp/enough-server.log</string>
  <key>StandardErrorPath</key> <string>/tmp/enough-server.err</string>
</dict>
</plist>
```

Replace `/ABSOLUTE/PATH/TO/enough` with the real path (e.g. `$(pwd)` from the repo root).

> **Security note:** The plist stores your Plaid credentials in plaintext. Lock it down:
>
> ```bash
> chmod 600 ~/Library/LaunchAgents/com.enough.budget.plist
> ```
>
> Never commit or share this file.

**Load it:**

```bash
plutil ~/Library/LaunchAgents/com.enough.budget.plist   # validate
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.enough.budget.plist
```

**Verify:**

```bash
curl http://localhost:5006/health   # should return {"status":"UP"}
```

**Day-to-day commands:**

```bash
# View logs
tail -f /tmp/enough-server.log

# Stop / start manually
launchctl stop  com.enough.budget
launchctl start com.enough.budget

# After pulling updates and rebuilding
launchctl kickstart -k gui/$(id -u)/com.enough.budget

# Remove the daemon entirely
launchctl bootout gui/$(id -u)/com.enough.budget
rm ~/Library/LaunchAgents/com.enough.budget.plist
```

## Development

```bash
yarn typecheck     # TypeScript check across all packages
yarn lint:fix      # Lint + format with auto-fix
yarn test          # Unit tests (all packages via lage)
yarn start         # Vite dev server only (port 3001)
```

All yarn commands must run from the repository root.

## Tech Stack

| Layer     | Tech                              |
| --------- | --------------------------------- |
| UI        | React + TypeScript, Emotion CSS   |
| Build     | Vite, Yarn 4 workspaces, lage     |
| Storage   | SQLite via better-sqlite3         |
| Sync      | Custom CRDT sync server (Express) |
| Bank data | Plaid API                         |

## Notes

- Do not commit `.env`, `.chrome-actual-profile/`, or `packages/sync-server/user-files/` — all contain personal data or credentials.
- Use real Chrome (not an embedded browser) for local testing — the app requires `SharedArrayBuffer` headers that embedded browsers may not support.
- Each person running this needs their own Plaid app and `.env`. Do not share credentials or budget databases.

---

Upstream: [actualbudget/actual](https://github.com/actualbudget/actual) · License: MIT
