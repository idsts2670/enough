# Enough UI Modernization Plan (v2)

Supersedes the original PLAN.md (archived as `PLAN.md.bak`).
Revised after design review challenge + Codex pushback validation.

**Direction:** Copilot Money-inspired app UI. This supersedes a prior ElevenLabs editorial direction — do not revert. Categories use a 10–12 designed-fresh color palette (not lifted from Copilot). "Copilot-style" means interaction principles only, not exact layout, copy, icons, fonts, color hexes, or proprietary assets.

---

## 0 — Source-of-truth hierarchy

When sources conflict, resolve in this order:

1. **This file (`PLAN.md`)** — governs execution order, phase scope, decisions.
2. **Rewritten `DESIGN.md`** (Phase 0 deliverable) — governs visual tokens and component specs.
3. **Codebase reality** — overrides both 1 and 2 when a documented decision is incompatible with shipped code. When this happens, escalate before changing either code or docs.

Old marketing-direction DESIGN.md will be archived at `DESIGN.legacy.md`. Do not consume it as a token source after Phase 0 lands.

---

## 1 — v0 milestone (the only thing that lands first)

v0 ships as a single coherent unit before any other phase begins. Nothing in Phases 2–4 starts until v0 lands.

**v0 deliverables:**

1. **Rewritten `DESIGN.md`** as app-UI tokens + component specs (Phase 0 — section 3 below).
2. **Visible typography fixed** against the new tokens, on the surfaces in section 4.
3. **Audit script** in CI with a baseline allowlist of current raw-value violations, failing only on **new** violations.
4. **Brand-string audit pass** — replace "Actual" with "Enough" in user-visible copy, i18n-aware (see section 10).

**v0 acceptance:**

- Old `DESIGN.md` content moved to `DESIGN.legacy.md`; new `DESIGN.md` reviewed before any code consumes it (see section 11 — rollback).
- Before/after screenshot pairs captured on: `/budget`, `/reports` (current widget grid), `/accounts` (per account), `/schedules`, `/bank-sync`.
- Audit script reports baseline count on current commit and rejects new violations in PRs.
- No "Actual" string visible to end users in the welcome flow, settings, errors, or page titles (translation keys updated, not just English).
- `actual/typography` ESLint rule renamed to `prefer-straight-quotes` (it doesn't lint typography; current name causes false confidence).

v0 buys the foundation. Phases 2–4 then become token-application work, not invention.

---

## 2 — Decisions (resolved 2026-05-10)

All five Phase 0 blockers are resolved. Phase 0 implementation is unblocked. The OD numbering is preserved because the rest of the plan references it.

**OD1 — Primary action accent color: BLUE ACCENT.**
Primary CTAs use blue. Ink (`#292524`) reserved for secondary actions and text. New DESIGN.md must define `accent-action` blue with light/dark variants and WCAG-passing contrast. Specific hex TBD by Phase 0 (designed fresh, not a Copilot hex).

**OD2 — Category color model: GROUP-LEVEL, STORED ON RECORD, DETERMINISTIC FALLBACK.**

- Color attaches to category **group**. All children inherit (Food & Drink → Restaurants, Groceries share the group hue at distinct saturations or share the same chip color).
- Persistence: stored on the category record (user-overridable).
- Default for custom categories without an explicit color: deterministic generation from a stable hash of the category name (so the same custom category gets the same color across reloads).
- WCAG contrast: every category color hits 4.5:1 against ink text on its background variant.
- Color is never the only signal — every category color is paired with its label.

**OD3 — Returning-user non-Plaid behavior: PRESERVE READ-ONLY, HIDE SETUP, DEPRECATION BANNER ON ACCESS.**

- Legacy GoCardless / SimpleFIN / Pluggy linked accounts: preserved, read-only (no new sync attempts).
- Setup UI for those providers: hidden from `/bank-sync` entirely.
- Deprecation banner: shown only when a user opens a specific legacy-linked account (not on the bank-sync index page).
- Do not use the word "migration" in any user-facing copy — there is no automated migration path.

**OD4 — Data selector inventory: DELIVERED.**
See [PHASE-3-DATA-INVENTORY.md](PHASE-3-DATA-INVENTORY.md). Summary: 4 of 6 Phase 3 dashboard cards have existing selectors; 1 needs a thin derived wrapper; 1 (Transactions to Review) needs a new query plus clarification on whether Plaid suggested categories are persisted. **Net: Phase 3 is not blocked on backend work.** One open risk to resolve before Phase 3 starts — see inventory doc, risk #1.

**OD5 — Investments scope: OUT OF SCOPE.**
Plaid Investments product not confirmed. Vanguard 401k / Roth IRA accounts visible in the demo budget are manual-entry — treat as ordinary off-budget accounts, no portfolio surface in Phases 0–3.

---

## 3 — Phase 0: Rewrite DESIGN.md as app-UI tokens

**Goal:** produce a DESIGN.md that's an app-UI design system, not a marketing brand spec.

**Keep from current DESIGN.md (translate):**

- Ink color `#292524`
- Off-white canvas `#f5f5f5`
- Body color `#4e4e4e`, muted `#777169`
- Hairline borders (`#e7e5e4`)
- Pill button geometry (`border-radius: 9999px`)
- 8px-base spacing scale (4 / 8 / 12 / 16 / 20 / 24 / 32 / 48)

**Remove from current DESIGN.md (do not preserve):**

- Waldenburg display tokens (`display-mega 64`, `display-xl 48`, `display-lg 36`, `display-md 32`, `display-sm 24`)
- The `300` weight as display signature
- Gradient orb tokens (`gradient-mint / peach / lavender / sky / rose`)
- Atmospheric components: `hero-band`, `cta-band`, `gradient-orb-card`, `pricing-tier-card`, `pricing-tier-featured`, `audio-waveform-card`, `voice-row`, `voice-icon-circular`
- 96px section padding
- The editorial copy in the Overview section

**Add to new DESIGN.md (app-UI tokens):**

Typography scale (recommendation, pending validation against actual screen densities — verify weights aren't too heavy):

- `display-2xl` Inter 28–32 / 600 (page heroes — Dashboard greeting)
- `display-xl` Inter 24 / 600 (section heads)
- `display-lg` Inter 20 / 600 (card titles)
- `title-md` Inter 16 / 600 (group/row leaders)
- `body-md` Inter 15 / 400 (default body)
- `body-strong` Inter 15 / 500 (emphasized body)
- `body-sm` Inter 13 / 400 (dense table cells, captions)
- `caption` Inter 12 / 500 (labels, badges)
- `tabular-figure` modifier (`font-variant-numeric: tabular-nums` — see section 8 on standardizing the two existing mechanisms)

Color tokens:

- `category-*` × 10–12 hues (designed fresh; see OD2 for model)
- `accent-action` (TBD per OD1; if blue, define light/dark/contrast variants)
- `status-success / warning / error` — explicitly separate namespace from category colors
- `surface-canvas / card / hover / selected` for row interactions
- Reserve token slots for dark-mode variants (defer full dark-mode design to a later phase)

App-UI components (specs, with default + state coverage):

- `table-row` (height 36–40px comfortable, 28–32px dense — single density default in v0; toggle deferred)
- `table-cell-label` / `table-cell-amount` (right-aligned amounts, tabular figures)
- `category-pill` (small chip with background tint at low saturation, label in ink)
- `progress-bar` (background hairline, fill in category color, overflow state in `status-warning`)
- `status-dot` (4–6px circle; always paired with label — accessibility)
- `sheet / drawer` (right-side detail panel pattern)
- `toolbar` (above tables: filter chips, search, bulk actions)
- `row-hover` / `row-selected` states
- `filter-chip` / `badge-numeric` / `nav-row`

**Validation criteria for the rewritten DESIGN.md:**

- For each Phase 1 visible surface (section 4), produce a screenshot mockup or annotated wireframe showing where each new token is used.
- Run `/design-review` skill against the rewrite to capture a baseline design score before Phase 1 implementation begins.
- No token defined in new DESIGN.md is decorative — every token must have at least one named usage in an existing or planned component spec.

---

## 4 — Phase 1: Visible typography foundation

**Goal:** fix the typography on the visible surfaces against the new DESIGN.md tokens, with a CI guardrail.

**Visible surfaces in v0/Phase 1 scope** (the only places "0 unapproved raw values" must be true; everything else stays on the audit-script allowlist):

- `/budget` — month header, budget table (headers, group rows, category rows, amount cells), sidebar (account list, balances)
- `/reports/*` — current widget grid (10 cards: Total Income, Total Expenses, Avg Per Month, Avg Per Transaction, Net Worth, Cash Flow, This Month, Budget Overview, 3-Month Average, Recent Net Worth Change)
- `/accounts/*` — account list, transaction list
- `/schedules` — schedule list
- `/bank-sync` — provider UI (Plaid-only after Phase 2)

Out-of-scope for Phase 1 (covered by allowlist; cleaned in Phase 1.5): mobile screens, modals (BudgetAutomationsModal, ImportTransactionsModal, etc.), settings, payees, rules, tags, command bar.

**Execution steps:**

1. **Canonical token map** in `packages/component-library/src/typography.ts` (new file). Single source. Export named variants matching new DESIGN.md tokens.
2. **SVG-safe typography styles** — `chartLabel`, `chartValue`, `chartCaption` with explicit `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing` props (SVG `<text>` doesn't inherit CSS the way HTML does — confirmed at `CashFlowCard.tsx:74` and `renderCustomLabel.tsx:21`).
3. **Apply to chart components first** (highest visible defect — Cash Flow chart labels render with no font props): `CashFlowCard.tsx`, `renderCustomLabel.tsx`, `DonutGraph`, `AgeOfMoneyGraph`, report tick labels.
4. **Replace dashboard metric styling** in the 10 Reports cards. The current React-layer text already uses tokens aligned with the old DESIGN.md — translate to new token names rather than rewriting from scratch.
5. **Standardize tabular figures.** The app already uses two mechanisms — global `font-feature-settings: 'tnum'` via `theme.tsx:202` AND `styles.tnum` + `FinancialText` + inline `fontVariantNumeric`. Pick one. Recommend keeping global `font-feature-settings` (broad coverage) AND keeping `FinancialText` as the explicit wrapper for amounts (clarity at call site). Remove the few `fontVariantNumeric: 'tabular-nums'` inline strings (`AutomationListRow.tsx:149/169`) and route them through `FinancialText` or `styles.tnum`.
6. **Consolidate letter-spacing.** 35 explicit `letterSpacing:` values in source today, mix of `em` and raw-number units. Audit, replace with token-tied values where the token applies, delete where the token says `normal`.
7. **Audit script in CI** lands alongside step 1. Two modes: (a) report mode — outputs current baseline count of raw values by file; (b) gate mode — rejects any PR that introduces a new raw `fontSize:` / `fontWeight:` / `letterSpacing:` not in the allowlist. Initial allowlist = all current violations. Each subsequent phase tightens the allowlist.

**Phase 1 acceptance:**

- Zero unapproved raw typography values in the files touched in steps 3–5. Other files stay on allowlist.
- Before/after screenshot pairs at 1440×900 of each visible surface, captured via `/design-review`.
- Audit script reports the same or lower violation count on the touched files.
- All financial-figure surfaces (amount cells, balances, deltas) confirmed tabular via DOM inspection (not just source grep).
- No regression on existing `loot-core` tests or `desktop-client` unit tests.

---

## 4.5 — Phase 1.5: Component-library + mobile/modal sweep

After v0/Phase 1 ships and is stable. Apply tokens to: `Menu`, `FormError`, `Select`, `styles.ts` (kill `tinyText: 10` and `mobileMenuItem: 17` exports). Modal bulk: `BudgetAutomationsModal`, `ImportTransactionsModal`, etc. Mobile screens.

Tighten audit-script allowlist after each batch.

---

## 5 — Phase 2: Demolition (hide before delete)

**Goal:** remove inherited Actual clutter from visible UI without touching server/data code prematurely.

**Hide rule:** for inherited features, hide visible UI first; defer data/server deletion to a later cleanup phase. This protects against tests, migrations, and backwards compatibility paths.

**Reports widget grid — hide these from default Reports dashboard:**

- Dashboard Tips
- Transaction Calendar (if present)
- Sankey (low-signal for personal finance command center)
- Crossover (advanced)
- Formula (advanced — keep as user-creatable widget, not default)
- Markdown (advanced — keep as user-creatable widget, not default)

**Keep as default:** Cash Flow, Net Worth, Spending, Summary, BudgetAnalysis, AgeOfMoney. Six core widgets. User can still add demoted ones manually if they exist in the codebase — the change is to the default dashboard template, not the widget catalog.

**Bank Sync — visible UI is Plaid-only:**

- Hide setup flows for GoCardless, SimpleFIN, Pluggy.
- Returning-user behavior per OD3: legacy accounts stay read-only with deprecation banner on access.

**Navigation — clarify whether "Dashboard" is `/budget` or a new route:**

The current app has no `/dashboard` route. `/budget` is the home. Two paths:

- (a) Keep `/budget` as home, rename it "Dashboard" in nav. Lowest-risk.
- (b) Build a new `/dashboard` route distinct from `/budget`, with budget remaining as the envelope-budgeting view.

Recommend (a) for v0; revisit (b) after Phase 3 redesigns Dashboard content. Flag this as an open product decision in the plan but not blocking Phase 2.

**Reports as primary nav:** Move "Reports" under a secondary section ("More" or "Advanced"). Don't delete the route — just demote in primary nav.

**Phase 2 acceptance:**

- Six default Reports widgets visible in a new demo budget.
- Non-Plaid setup hidden in `/bank-sync` (Plaid only in primary CTA, providers behind "advanced" disclosure or hidden entirely).
- Legacy non-Plaid accounts still functional read-only.
- Reports demoted in primary navigation.

---

## 6 — Phase 3: Copilot-inspired redesign

**Goal:** rebuild the core surfaces around Copilot's interaction principles, not its visual identity.

**Concrete principles for "Copilot-inspired":**

- Light canvas with subtle hairlines (already there)
- Single ink/accent action color (per OD1)
- 16px rounded cards
- Dense tables (32–40px row height)
- Category pills as the dominant chromatic element
- Tabular figures on every amount (Phase 1)
- Right-side detail sheet pattern for editing
- Muted nav, strong content
- No atmospheric decoration (no orbs, no gradients-as-background, no decorative blobs)

**Information hierarchy for redesigned Dashboard:**

Default card order on `/budget` (treat as "Dashboard" per Phase 2 decision):

1. **Monthly Spending** — large card. Current month spend vs prior month / vs budget.
2. **Net Worth** — line chart, last 6 months.
3. **Transactions to Review** — uncategorized + low-confidence Plaid suggestions. Quick category-assign workflow inline.
4. **Top Categories (this month)** — category pills with progress bars.
5. **Recurrings — Next 14 Days** — list of expected charges. Gated on OD4 selector availability.
6. **Accounts summary** — grouped by type (Checking / Savings / Credit / Investment).

Defer Goals (not in current product, not user-requested) until separately decided.

**Categories redesign — acknowledge the data-model mismatch:**

Actual's categories are **envelope-budget categories** with monthly budget allocations. Copilot's categories are **spend-tracking labels** with no envelope. These are different mental models. Phase 3 must decide:

- (a) Keep envelope budgeting visible (preserve Actual's strength): categories show budget allocation + spend + balance, with progress bars showing fill against allocation.
- (b) Hide envelope mechanics, show Copilot-style spend analysis only.
- (c) Layer Copilot-style spend view on top of envelope data (two views of same data).

Recommend (a) for v0 of Phase 3 — preserves the budgeting product instinct. Decision should be made before Phase 3 implementation begins.

**Category color attachment:** Per OD2 — confirm group vs leaf, persistence, fallback for custom categories.

**Transactions:**

- Review-first workflow: unreviewed indicator, category quick-edit inline, bulk category change.
- Plaid suggested category as the default for new transactions; user confirms or changes.
- Right-side detail sheet on transaction click (not modal).

**Accounts:**

- Grouped by account type (Checking / Savings / Credit Card / Investment / Loan).
- Each row shows balance, sync status, last-synced timestamp.
- Click → account detail with transaction list.

**Bank Sync (post-Phase 2):**

- "Connect institution" primary CTA (Plaid)
- Linked institutions list
- Sync status + last-sync time
- Reconnect / disconnect actions
- No multi-provider marketplace UI.

**Phase 3 acceptance:**

- All Phase 3 surfaces use only new DESIGN.md tokens (no raw values introduced).
- Before/after screenshots captured per surface; design score improvement documented via `/design-review`.
- Information hierarchy decisions logged for each surface (which cards / fields are primary, secondary, tertiary).
- Existing Plaid integration unchanged in production behavior.
- No regression on `loot-core` queries or budget calculations.

---

## 7 — Phase 4: Visual polish + screenshot acceptance

Apply only after Phase 3 structure is right. Sweat the details:

- Card padding, radius, shadow tiers
- Category pill styling per OD2 outcome
- Progress bar fill animation (none, ease-out, or `prefers-reduced-motion`-aware)
- Sidebar selected-row treatment
- Empty states (warmth + action + visual per accessibility / WCAG)
- Loading skeletons matching real content layout
- Error states (specific + next-step text)
- Focus rings (never `outline: none` without replacement)

**Phase 4 acceptance:** `/design-review` design score target — to be set as part of v0 acceptance baseline, then improvement target locked at Phase 4 start.

---

## 8 — Tabular figures: standardize, don't duplicate

The app has two competing mechanisms today:

| Mechanism                                              | Where                                                           | Coverage                 |
| ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------ |
| Global `font-feature-settings: "ss01", "ss04", "tnum"` | `packages/desktop-client/src/style/theme.tsx:202`               | Body-wide                |
| `styles.tnum` + `FinancialText` wrapper                | `packages/component-library/src/styles.ts`, `FinancialText.tsx` | Specific amount surfaces |
| Inline `fontVariantNumeric: 'tabular-nums'`            | `AutomationListRow.tsx:149/169`                                 | Two spots                |

Phase 1 step 5 decision: **keep both global + `FinancialText`** (broad fallback + explicit call-site clarity), remove inline `fontVariantNumeric`. Document the rule in new DESIGN.md: _amounts must be wrapped in `FinancialText` for semantic clarity, even though the global rule would catch them anyway._

---

## 9 — Audit script behaviour

Lives in: `bin/lint-typography.ts` (new — language-of-choice: TypeScript since the repo is already TypeScript).

**Two modes:**

- `--report` — outputs raw-value violation count per file, grouped by category (size / weight / letter-spacing). For dashboards and PR descriptions.
- `--gate` (CI default) — fails when a PR introduces a violation not in the current allowlist. Allowlist lives at `tools/typography-allowlist.json`, generated initially by `--report` baseline.

**Patterns flagged:**

- `fontSize:` with raw numbers
- `fontWeight: 'bold'` or numeric weight outside `[400, 500, 600]`
- `letterSpacing:` with `em` / raw-number values not from token
- Raw `<text>` elements without `fontFamily` / `fontSize` props (SVG-specific)

**Allowlist tightening cadence:**

- After Phase 1 step 4: remove report-card files from allowlist
- After Phase 1.5: remove component-library files
- After Phase 3: remove Phase 3 surfaces
- After Phase 4: aim for empty allowlist

---

## 10 — Brand-string pass ("Actual" → "Enough")

Scope:

- Welcome / onboarding copy (multiple files, not just `WelcomeScreen`)
- Page titles (`<title>` tags)
- Server config copy ("Configure your server")
- Error messages mentioning "Actual"
- Update notice copy
- In-app docs links and external doc URLs (verify whether `actualbudget.org/docs` is still authoritative or fork-specific docs exist)

i18n-aware approach:

- All replacements go through translation keys (`t('appName')`) — not literal string swaps.
- For Phase 1, accept English-only ("Enough") and mark the translation key as needing fan-out per locale. Don't block on translations for non-en locales.
- Audit deliverable: list of every translation key referencing "Actual" + per-locale fallback strategy.

Out of scope: codebase identifier renames (e.g., `@actual-app/web` workspace name). These are internal-only and don't need a brand pass.

---

## 11 — Guardrails (must hold across all phases)

**Code change guardrails:**

- No code changes until the revised PLAN.md is approved by the user.
- No reverts of unrelated work in dirty worktrees. Always `git status` first; preserve untracked files (`?? .claude/`, etc.) unless explicitly told to discard.
- No new raw typography values in any new code (audit script enforces).

**Design guardrails:**

- Copilot Money screenshots are visual reference only. No logos, icons, fonts, hexes, copy strings, or proprietary assets enter the codebase.
- Category palette is designed fresh.
- Accessibility: no color-only signals (every color carries a label). WCAG AA contrast minimum on text against backgrounds.

**Process guardrails:**

- DESIGN.md rewrite (Phase 0) requires user review before code begins consuming it. Keep `DESIGN.legacy.md` available for reference during the transition.
- Every phase requires before/after screenshots on the affected visible surfaces.
- Design score (via gstack `/design-review`) is the visual acceptance gate, not computed-style equivalence.

---

## 12 — Out of scope (explicitly)

These are deferred or removed from scope to keep the plan executable:

- **Goals.** Copilot has them; current app doesn't. Defer until separately requested.
- **Investments as a dedicated surface.** Out of v0–Phase 3. Vanguard 401k / Roth IRA stay as ordinary off-budget accounts.
- **Full dark-mode visual design.** Phase 0 reserves token slots; full dark-mode pass is a later phase.
- **Density toggle.** Single density default in v0. Comfortable/compact toggle deferred.
- **Mobile redesign.** Phase 1.5 covers shared component typography. Mobile-specific layout patterns (bottom tab bar, sheet patterns, touch targets) are a separate phase.
- **Recurrings auto-detection** (the algorithm). UI for displaying recurrings can land if a selector exists (OD4). Detection logic itself is out of scope until validated as feasible.
- **Pixel-clone of Copilot.** Inspiration only.

---

## 13 — Implementer protocol (for the AI agent picking this up cold)

Resolves operational/HOW ambiguities so an implementing agent doesn't need to ask or guess. Apply to every phase.

**Read these first, in this order:** `AGENTS.md` (commit rules, lint, PR conventions, yarn workflow) → `PLAN.md` (this file) → `PHASE-3-DATA-INVENTORY.md` → current `DESIGN.md` (the spec being retired).

**File handling:**

- `PLAN.md.bak` is the v1 PLAN.md backup. Do not modify or delete.
- For Phase 0: **rename current `DESIGN.md` → `DESIGN.legacy.md`** (preserves git history via rename), then write new `DESIGN.md` in the **same markdown + YAML-frontmatter format** as the current file.
- New `DESIGN.md` is the only source of truth for tokens after Phase 0 lands. Do not import from `DESIGN.legacy.md`.

**Decisions that require user signoff before finalizing (do not pick alone):**

- **OD1 accent blue hex.** Propose 2–3 options with rationale (e.g., contrast against canvas, distinctness from semantic colors, alignment with brand restraint). Wait for user pick before writing into `DESIGN.md`.
- **OD2 category palette (10–12 hues).** Propose the full palette in one batch — name + hex + WCAG contrast against ink text + against canvas background. Wait for user pick.
- Both proposals go in a sub-doc (`PHASE-0-DESIGN-DECISIONS.md`) — not directly into `DESIGN.md`. After approval, transcribe into `DESIGN.md`.

**Font validation:** Before specifying Inter weights, confirm `Inter Variable` font-face range covers `400–600` (current loaded face is `100 900`, so safe — but verify).

**Phase 1 first deliverable: token translation table.** Before editing any component, produce `PHASE-1-TOKEN-MAP.md`: a table mapping every old DESIGN.md token name to its new DESIGN.md equivalent. Review with user. Then edit components per the map. This prevents per-file improvisation.

**Audit script + allowlist format:**

- `bin/lint-typography.ts` — TypeScript, runnable via `yarn workspace @actual-app/web exec tsx bin/lint-typography.ts --report` (or similar — match repo conventions).
- `tools/typography-allowlist.json` schema: `{ "files": [ { "path": "...", "patterns": [ "fontSize: 13", "fontWeight: 'bold'", ... ] } ] }`. Per-file pattern list (not line numbers — line numbers churn).

**Phase 2 hide pattern:** for default-dashboard widget changes, modify the default template constant (not feature flag, not user-setting). For non-Plaid bank-sync UI, conditional render gated on `provider === 'plaid'` — no feature flag.

**Operational guardrails (from AGENTS.md — re-stated here):**

- `yarn typecheck` and `yarn lint:fix` must pass before any commit.
- Commit messages prefixed `[AI]`. PR titles prefixed `[AI]`. Add "AI generated" label to PRs.
- Never `--no-verify`, never amend (always new commit on hook failure).
- Do not fill the PR template unless explicitly asked (per `.github/agents/pr-and-commit-rules.md`).

**Branch strategy:** one branch per phase, named `phase-{N}-{slug}` (e.g., `phase-0-design-rewrite`, `phase-1-typography`). Phase 0 starts from `master` (or current HEAD if branching from this worktree). Each phase merges before the next begins.

**Screenshots:**

- Stored in `design-review/{phase}/{surface}-{state}.png` (e.g., `design-review/phase-1/budget-before.png`, `.../budget-after.png`).
- Captured at 1440×900 via `/design-review` skill (or `mcp__Claude_Preview__preview_screenshot` if running headless).
- Linked in the PR description for that phase.

**Design score baseline:** capture **now**, before Phase 0 starts, by running `/design-review` against the unchanged app. Record into `PHASE-0-DESIGN-DECISIONS.md`. Phase 4 acceptance target = baseline + at least one letter-grade improvement on the dashboard surface.

**PHASE-3-DATA-INVENTORY.md risk #1 ownership:** assigned to the **Phase 0 agent** as a 30-minute side investigation (the agent has the codebase loaded; cheaper than spinning up a new context later). Write findings into `PHASE-3-DATA-INVENTORY.md` as an appendix.

**When in doubt:** stop and ask via `AskUserQuestion` rather than guessing. The plan favors decision-completeness over speed.

---

## 14 — Risks

- DESIGN.md rewrite changing direction mid-flight — mitigated by Phase 0 acceptance gate (section 3).
- Audit script too aggressive — mitigated by allowlist-first, gate-on-new pattern (section 9).
- "Copilot-style" interpreted as pixel-clone — mitigated by guardrail (section 11).
- Envelope-budget data model mismatch with Copilot's spend-tracking categories (section 6) — mitigated by Phase 3 explicit decision before implementation.
- New code introduces new raw values during the cleanup — mitigated by audit script gate from day 1.
- Brand pass breaks translations — mitigated by translation-key approach (section 10).
- Test/data compatibility with non-Plaid providers — mitigated by hide-before-delete rule (section 5).
- Agent picks blue hex or category palette without signoff — mitigated by section 13 protocol (proposals to user-review doc, not directly to DESIGN.md).

---

## 15 — Status

- **Plan revised:** ✅
- **OD1–OD5 resolved:** ✅ (section 2; 2026-05-10)
- **Implementer protocol defined:** ✅ (section 13)
- **Phase 0 implementation ready:** ✅ — no remaining blockers
- **Phase 1 ready:** ❌ — blocked on Phase 0 deliverable (rewritten DESIGN.md + user-approved blue hex + category palette)
- **No code changes have been made yet.** Only PLAN.md + PHASE-3-DATA-INVENTORY.md + PLAN.md.bak exist.

Next action: Codex (or another agent) begins Phase 0 — rewrite DESIGN.md as the app-UI token + component system per section 3, using OD1 (blue accent) and OD2 (group-level category color) decisions. The agent must follow section 13's implementer protocol: read AGENTS.md first, capture the design-score baseline, propose blue hex + category palette in `PHASE-0-DESIGN-DECISIONS.md` for user signoff, and only then transcribe approved values into the new DESIGN.md. After Phase 0 lands and is user-reviewed, Phase 1 begins.
