# Enough Local Setup

This repo is a personal Enough app forked from Actual Budget with Plaid bank sync work. It is meant to run locally with a private `.env` file and local SQLite data. Do not commit or share secrets, Plaid access tokens, Chrome profile state, or user budget databases.

## Quick Start

From the repo root:

```bash
yarn personal:doctor
yarn personal:setup
yarn personal:build
yarn personal:start
```

`yarn personal:build` runs the full repo build. `yarn personal:start` starts:

- Backend sync server: `http://localhost:5006`
- Web app: `http://localhost:3001/login`

On macOS it also opens Chrome with a dedicated local profile at `.chrome-actual-profile/`.

If Enough asks for a server URL, use:

```text
http://localhost:5006
```

## Environment

Create a private `.env` in the repo root or in the parent `money-tracker/` workspace:

```bash
cp .env.example .env
```

Then fill in:

```text
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=production
```

Use each user's own Plaid credentials. Do not share your `.env`.

## Friend Setup

The safe sharing model is code-only:

1. Share the repo privately.
2. The other person clones it.
3. They create their own `.env` from `.env.example`.
4. They run `yarn personal:setup`.
5. They run `yarn personal:start`.
6. They connect their own banks through Plaid.

Do not share:

- `.env`
- `.chrome-actual-profile/`
- `packages/sync-server/server-files/`
- `packages/sync-server/user-files/`
- Any SQLite database containing budget or bank data

## Browser Notes

Use real Chrome, not an embedded AI-app browser, for Enough. The app requires `SharedArrayBuffer` and cross-origin isolation. Some embedded browser surfaces fail even when normal Chrome works.

If Chrome gets into a bad local state, clear only scoped site data:

- `localhost:3001`
- `localhost:5006`
- Plaid entries such as `plaid.com` or `cdn.plaid.com` if Plaid Link is stuck

Avoid deleting global browser data.

## Plaid Notes

Plaid production OAuth institutions such as Chase may show registration or review status in the Plaid dashboard. If Plaid says the app is still in review for an institution, wait for dashboard approval instead of changing code or clearing cache.
