<p align="center">
  <img src="/demo.png" alt="Enough — personal finance dashboard" />
</p>

# Enough

A calm personal-finance app for dense, repeated money work. Forked from [Actual Budget](https://github.com/actualbudget/actual) and extended with Plaid bank sync and a redesigned UI.

- **Local-first** — all data lives in SQLite on your machine, no cloud required
- **Plaid sync** — pull live transactions from your bank accounts automatically
- **Envelope budgeting** — allocate income to categories before you spend it
- **Dashboard** — net worth, spending, categories, and recurring bills at a glance

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
