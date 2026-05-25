# Codex Handoff — Enough Budget App (personal-main branch)

**Date**: 2026-05-25  
**Branch**: `personal-main`  
**Repo**: `/Users/satoshiido/Documents/knowledge/money-tracker/enough`  
**App URL**: `http://localhost:5006` (served by launchd daemon, always-on)

---

## Project Background

This is a personal fork of [Actual Budget](https://github.com/actualbudget/actual) with Plaid bank sync. The owner wanted:

1. Copilot.Money-style category groups instead of the default Plaid auto-imported flat list
2. Auto-categorization rules so future bank imports don't need manual work
3. A custom `/categories` page with a spending donut chart

---

## What Has Been Completed

### ✅ Gap 1 — Category restructuring (commit `9d4339a`)

Run via `scripts/personal/migrate-categories.ts`. Migrated the budget from:

- Old groups: `Usual Expenses` (Food, Bills, Bills (Flexible), General, Savings) + `Plaid Categories` (Food & Drink, Shopping, Entertainment, Transportation, Personal Care, Loan Payments, Transfers, Services, Government & Charity, Travel, Home Improvement) + `Investments and Savings`
- New groups: **Fixed** (Rent/Mortgage, Utilities, Internet, Phone, Insurance, Subscriptions), **Fun** (Groceries, Restaurants & Dining, Entertainment, Shopping, Personal Care, Hobbies), **Trading & Investment** (Stocks & ETFs, Crypto, Brokerage Fees), **Future Me** (Emergency Fund, Savings Transfer, Retirement), **Other** (ATM / Cash, Fees & Charges, Miscellaneous)

Implementation notes:
- Migration uses `api.deleteCategory(oldId, transferCategoryId)` which moves transactions via CRDT `category_mapping` entries (NOT direct SQL writes). Actual Budget resolves categories through `v_transactions_internal` view using `LEFT JOIN category_mapping`.
- Script imports from `packages/api/dist/index.js` (the 4MB Vite-built CJS bundle) because `tsx` cannot compile `.pegjs` grammar files that are imported transitively through `loot-core` source.
- Script is fully idempotent — safe to re-run.

### ✅ Gap 2 — Auto-categorization rules (commit `9d4339a`, Part B)

19 pre-stage rules seeded via `api.createRule()` covering: South Loop Market, Whole Foods, Trader Joe's, Mariano, Jewel, Amazon, Netflix, Spotify, Hulu, Apple.com/Bill, Apple Services, Google One, Google Play, Lyft, Uber, ATM Withdrawal, Cash Withdrawal, Venmo. All visible in Settings → Rules.

### ✅ Category spending donut chart (commit `b983e64`)

New files:
- `packages/desktop-client/src/components/budget/CategorySpendingDonut.tsx` — Recharts PieChart donut, one segment per expense group ordered by spend, colored via `getCategoryColor()`, hover tooltip, "No data" placeholder ring
- Modified `CategoriesPage.tsx` — added pie-chart include/exclude toggle button on each group row; excluded groups are visually muted; exclusion state persists in `useLocalPref('budget.excludedFromChart')`

### ✅ Daemon production fix

The launchd daemon (`~/Library/LaunchAgents/com.enough.budget.plist`) was running with `NODE_ENV=development`, causing `http-proxy-middleware` to proxy all requests to `localhost:3001` (Vite dev server, not running), which returned 504 for every page load. Fixed by setting `NODE_ENV=production` in the plist via `PlistBuddy`. Also killed a stale nodemon dev-server process (PID 37536) that had been running since Friday and was competing for port 5006.

---

## Remaining Work

### 🔴 P1 — "Category plan" donut shows "No data"

**Screenshot evidence**: The Category plan card on `/categories` shows a gray empty ring with "No data" even though the Fun group has 732.82 spent (visible in the table below).

**Root cause hypothesis**: The `CategorySpendingDonut` component uses `useSheetValue(envelopeBudget.groupSumAmount(group.id))` inside `GroupSpentCollector` sub-components. The new category groups were created via the migration script (external API calls, not through the UI), so their IDs may not yet have entries in the spreadsheet engine's cache. The spreadsheet may need a recalculation trigger, or the new group IDs may not match what `groupSumAmount` binding expects.

**Where to look**:
- `CategorySpendingDonut.tsx` lines 48–54: `GroupSpentCollector` reads `envelopeBudget.groupSumAmount(group.id)` and `trackingBudget.groupSumAmount(group.id)`. Add a `console.log` of `raw` to see if values come back as `null`/`undefined` or `0`.
- `packages/loot-core/src/client/spreadsheet/` or `packages/loot-core/src/server/budget/` — find where `groupSumAmount` is computed. The group IDs used as sheet keys must match the `categoryGroups` IDs from the database.
- Check if the budget type is `envelope` or `tracking` — the app started in `tracking` mode for the imported bank data; if the selected budget type is `envelope` but all transactions are under `tracking`, the envelope sheet won't have values.
- Quick debug: open DevTools console on `/categories`, search for `groupSumAmount` logs or add a temporary `console.log` in `GroupSpentCollector`.

**Expected fix**: Either force a spreadsheet recalculation after the page loads, or verify that the budget type selector (envelope vs. tracking) matches the actual transaction budget type. The category table correctly shows 732.82 for Fun — so the data exists; it's the sheet binding that's not returning it to the donut.

### 🟡 P2 — "Category plan" card design not matching initial request

The user noted that the Category plan card hasn't been updated to what they originally requested. The current card shows:
- A donut (currently broken — "No data")
- Three metric cards: Spent / Budgeted / Over (or Left)
- "All categories" panel with group/category count

**What was originally requested**: The user's original vision was a Copilot.Money-style budget view. The exact UI spec for the Category plan card was not fully captured in the plan file. This needs clarification from the user before implementing changes. Ask: "What specific changes do you want in the Category plan card? (e.g., different metrics, different layout, remove the donut, show budget progress bars per group, etc.)"

### 🟡 P3 — Budget amounts not set (Budgeted: 0.00)

The Category plan shows Budgeted: 0.00 and Over: 3,036.32 because no budget targets have been entered for any category. This is normal for a first setup — the user needs to manually enter budget amounts for each category, or a feature could be added to auto-suggest amounts based on historical spending. This is not a bug, but the user may want guidance on setting budgets.

---

## Key Files

| File | Purpose |
|---|---|
| `scripts/personal/migrate-categories.ts` | Migration script (run with `npx tsx`) |
| `packages/desktop-client/src/components/budget/CategoriesPage.tsx` | Main categories page, includes donut + table |
| `packages/desktop-client/src/components/budget/CategorySpendingDonut.tsx` | Donut chart component |
| `packages/desktop-client/src/components/budget/categoryColors.ts` | Color mapping for category groups |
| `packages/api/dist/index.js` | Pre-built API bundle (4MB CJS); must be rebuilt with `yarn workspace @actual-app/api build` after loot-core changes |
| `~/Library/LaunchAgents/com.enough.budget.plist` | launchd daemon config — **contains real Plaid credentials, never print/log/commit** |

---

## Environment & Running the App

```bash
# Health check
curl http://localhost:5006/health   # → {"status":"UP"}

# Server logs
tail -f /tmp/enough-server.log
tail -f /tmp/enough-server.err

# Force-restart daemon after rebuild
launchctl kickstart -k gui/$(id -u)/com.enough.budget

# Rebuild after code changes
yarn workspace @actual-app/sync-server build   # sync server
yarn build:browser                             # frontend (React app)

# Run migration script (already completed, but idempotent if re-run)
ACTUAL_SERVER_PASSWORD='<password>' npx tsx scripts/personal/migrate-categories.ts --dry-run
ACTUAL_SERVER_PASSWORD='<password>' npx tsx scripts/personal/migrate-categories.ts --part=all
```

Password for `ACTUAL_SERVER_PASSWORD` is in `/Users/satoshiido/Documents/knowledge/money-tracker/.env` under `Password=`.

---

## Architecture Notes

- **No direct SQL writes** — all mutations go through CRDT messages. Use `api.*` methods, not raw SQLite.
- **Budget SQLite**: `/tmp/actual-migration/My-Finances-*/db.sqlite` is the cached local copy used by the migration script. The canonical data is on the sync server at `packages/sync-server/user-files/`.
- **`category_mapping` table**: when a category is deleted with a transfer target, Actual creates a `category_mapping` row (old_id → new_id). The `v_transactions_internal` view resolves category via this mapping. Tombstoned categories appear as NULL in `v_transactions` if the mapping is missing.
- **Budget type**: This budget uses the **tracking** budget type (not envelope). The `trackingBudget.groupSumAmount(group.id)` binding should be used. The `envelopeBudget.*` bindings return 0 for tracking budgets.
- **Recharts v3**: The project pins `recharts@^3.8.1`. Props differ from v2. Reference implementation: `packages/desktop-client/src/components/accounts/BalanceHistoryGraph.tsx`.
- **No ResponsiveContainer** — use `AutoSizer` from `react-virtualized-auto-sizer` (uses `renderProp`, not `children`), or the `ChartContainer` utility at `#components/analytics/ChartContainer`.

---

## Security Rules (must be preserved)

- Never print real `.env` values, Plaid access tokens, or personal financial SQLite rows
- Do not commit `.env`, `.chrome-actual-profile/`, `packages/sync-server/server-files/`, or `packages/sync-server/user-files/`
- The plist at `~/Library/LaunchAgents/com.enough.budget.plist` contains real Plaid credentials — never print, log, or commit its contents
- All commit messages and PR titles **must** be prefixed with `[AI]`
