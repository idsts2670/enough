# Phase 1 Design Review — Typography Foundation

Reviewer: Claude (design-review skill)
Date: 2026-05-11
Branch: `personal-main`
Target commit: `ad8f4a0` (Codex Phase 1: typography token foundation)
Surfaces audited: `/reports/{id}`, `/budget`
Method: live DOM inspection via preview MCP at 1440×900; source-grep for confirmation.

---

## Verdict

**Phase 1 is partially complete. One MEDIUM regression must be fixed before continuing.**

Codex landed the typography foundation correctly for **page-header, card titles, date ranges, and SVG chart labels**. The Waldenburg removal looks clean — Inter at weight 600 for display does not feel "too flat" in the page-header role. However, **the 4 summary metric values on the Reports dashboard (Total Income, Total Expenses, Avg Per Month, Avg Per Transaction) still render with the old display style** — `fontFamily: var(--font-display)` (now Inter via aliasing) but at **48px / weight 300 / auto green or red**. This is the legacy auto-scaling behavior in `SummaryNumber.tsx`, which Codex did not include in the Phase 1 touch list.

This isn't a wiring bug in `ReportCardMetric.tsx` — that file is correct and imports `metricValue` properly. It's a coverage gap: `SummaryNumber` bypasses `metricValue` with its own inline `fontFamily / fontSize / fontWeight / color` block.

**Recommendation:** patch `SummaryNumber.tsx` before continuing Phase 1 on `/budget`, `/accounts`, `/schedules`, `/bank-sync`. The fix is ~10 lines.

---

## What Phase 1 got right ✅

### Page header — `display-2xl` per DESIGN.md

Inspected element: `<div class="brand-display">Reports:</div>` on `/reports`

| Property     | Live value                                    | DESIGN.md `display-2xl` + `page-header` | Match |
| ------------ | --------------------------------------------- | --------------------------------------- | :---: |
| `fontFamily` | `"Inter Variable", -apple-system, ...`        | `Inter Variable`                        |  ✅   |
| `fontSize`   | `32px`                                        | `32px`                                  |  ✅   |
| `fontWeight` | `600`                                         | `600`                                   |  ✅   |
| `color`      | `rgb(12, 10, 9)` (= `#0c0a09` = `ink-strong`) | `ink-strong`                            |  ✅   |

Source: `DashboardHeader.tsx` imports `pageHeader` from `@actual-app/components/typography` and applies it correctly.

### Report card titles — `display-lg`

Inspected: 4 card titles ("Total Income (YTD)", "Total Expenses (YTD)", "Avg Per Month", "Avg Per Transaction")

| Property     | Live                      | DESIGN.md `display-lg` | Match |
| ------------ | ------------------------- | ---------------------- | :---: |
| `fontFamily` | Inter Variable            | Inter                  |  ✅   |
| `fontSize`   | `20px`                    | `20px`                 |  ✅   |
| `fontWeight` | `600`                     | `600`                  |  ✅   |
| `lineHeight` | `26px` (1.3 × 20)         | `1.3`                  |  ✅   |
| `color`      | `rgb(41, 37, 36)` (`ink`) | `ink`                  |  ✅   |

### Date ranges — `body-sm` muted

Inspected: "Jan 2026 - May 2026" subtitle on metric cards

| Property     | Live                 | DESIGN.md `body-sm` + `muted` | Match |
| ------------ | -------------------- | ----------------------------- | :---: |
| `fontSize`   | `13px`               | `13px`                        |  ✅   |
| `fontWeight` | `400`                | `400`                         |  ✅   |
| `lineHeight` | `18.2px` (1.4 × 13)  | `1.4`                         |  ✅   |
| `color`      | `rgb(119, 113, 105)` | `muted #777169`               |  ✅   |

### Cash Flow card title — `display-lg`

"Cash Flow" card title: Inter 20px / 600. ✅

### Cash Flow SVG `<text>` labels — `chart-label` + `chart-value`

4 SVG text elements total on `/reports`:

| Element          | Live                 | DESIGN.md `chart-label` (12/500/muted) or `chart-value` (13/500/ink) |     Match     |
| ---------------- | -------------------- | -------------------------------------------------------------------- | :-----------: |
| "Income" label   | `12px / 500 / Inter` | `chart-label` typography                                             | ✅ typography |
| "Expenses" label | `12px / 500 / Inter` | `chart-label` typography                                             | ✅ typography |
| "3,026.68" value | `13px / 500 / Inter` | `chart-value` typography                                             |      ✅       |
| "1,946.88" value | `13px / 500 / Inter` | `chart-value` typography                                             |      ✅       |

**Minor color drift:** all 4 SVG text elements render with `fill: var(--color-tableText)` = `rgb(12, 10, 9)` (= `ink-strong`). DESIGN.md says `chart-label` should be `muted` (#777169) and `chart-value` should be `ink` (#292524). Codex tied the fill to a theme variable instead of a token reference. **Severity: LOW.** Typography is correct; color is darker than spec (more legible, not less).

### Delta value — appropriate semantic-success use

Net Worth card delta "+388,352.66" renders at `24px / 600 / Inter / green #147D64`. The 24px / 600 matches `display-xl`. The green is `semantic-success` for a positive delta — this is the explicit DESIGN.md F4 carve-out: "Reserve semantic colors for status/diff cells where overspent or warning state is the explicit intent (... declining delta column)." Positive delta in green is the analogous carve-out. ✅

### Waldenburg removal — cleaner, not too flat

Codex's `theme.tsx` change aliased `--font-display: var(--font-family)` (= Inter) and updated `.brand-display` to `font-weight: 600 / letter-spacing: 0`. Inspecting the live page header (which carries `brand-display` class), it reads at 32px / 600 / ink-strong. The page header has appropriate hierarchical weight on the page — it doesn't disappear into the body. It's not "too flat."

Verdict on Waldenburg removal: **net-positive**. The previous Waldenburg light-300 page header was the "editorial signature" of the retired ElevenLabs direction. Inter at 600 reads as a confident product header, consistent with the rest of the app (which already uses Inter for body). Hierarchy survives because the page-header is 32px while card titles are 20px — that 1.6× ratio carries.

### Phase 1 typography for /budget — unchanged (as expected)

`/budget` is explicitly **out of Phase 1 first batch** (slated for "remaining visible surfaces" per Codex's plan). Inspection shows the sidebar (account name + amount: 14px / 400 / body color) and budget table (category + amount: 14px / 400 / ink) still using legacy `14px` body. DESIGN.md target is `13px` for dense table cells (`body-sm`). **No regression here — this is queued work, not broken work.**

---

## What's wrong ❌

### F-P1-1 — `SummaryNumber.tsx` not wired to new tokens (MEDIUM)

**Location:** `packages/desktop-client/src/components/reports/SummaryNumber.tsx` (lines 96–108)

**Symptom:** The 4 summary cards (Total Income, Total Expenses, Avg Per Month, Avg Per Transaction) render their main value at:

- `fontFamily: var(--font-display)` (now Inter via Codex's aliasing — OK)
- `fontSize: <dynamic, up to 48px>` — auto-scales to container width
- `fontWeight: 300` — hard-coded weight 300 (the legacy Waldenburg display weight, now applied to Inter)
- `color: theme.reportsNumberPositive | reportsNumberNegative | reportsNumberNeutral` — auto green/red/grey by sign+context

**Spec deviation:**

- DESIGN.md `metric-card.valueTypography` is `display-xl` = `24px / 600` (not dynamic, not 48px, not weight 300).
- DESIGN.md F4 rule: amount cells stay in ink color; reserve red for status/diff cells. The 4 summary cards apply red to **POSITIVE numbers** like "Avg Per Transaction 32.80" (it's red because it's _derived from expenses_, not because it's negative). That's exactly the auto-coloring DESIGN.md F4 was written to prevent.

**Why Codex missed it:** `ReportCardMetric.tsx` was on the touch list and is correct — it imports `metricValue` and spreads it. But `SummaryNumber.tsx` is a separate component used by Summary cards. It bypasses `metricValue` entirely by setting its own `fontFamily / fontSize / fontWeight / color` inline. PHASE-1-TOKEN-MAP.md listed `ReportCardMetric.tsx`, `ReportCardName.tsx`, `DashboardHeader.tsx`, `DateRange.tsx`, `CashFlowCard.tsx`, `renderCustomLabel.tsx`, `DonutGraph.tsx`, `AgeOfMoneyGraph.tsx` — `SummaryNumber.tsx` is missing.

**Fix (suggested):**

1. Remove the inline `fontFamily / fontWeight: 300` from the `<View style>` block — spread `metricValue` instead.
2. Drop the dynamic font-sizing logic (`useResizeObserver` + `setFontSize`). The token `display-xl = 24px` is fixed; cards should size their containers around the value, not the other way around. If responsive behavior is needed, use container queries or fixed responsive breakpoints, not measure-and-fit.
3. Remove the auto color block. Default to `colors.ink`. If a card explicitly wants delta semantics (Net Worth change, budget surplus/deficit), pass the color via the existing `color` prop on `ReportCardMetric` — already supported.

If dropping the 48px-fit-to-card behavior is undesirable in this pass (it changes visible behavior), an interim fix: replace `fontWeight: 300` with `600` and remove the auto-color (keep auto-sizing). Lands the brand voice fix without rearchitecting the resize observer.

---

## Minor (LOW)

### F-P1-2 — SVG `<text>` fill uses theme var, not token

All 4 chart `<text>` elements render with `fill="var(--color-tableText)"` (= `#0c0a09` = ink-strong). DESIGN.md says:

- `chart-label`: `fill: muted` (#777169)
- `chart-value`: `fill: ink` (#292524)

The current implementation is darker than spec, which means slightly higher contrast (no a11y problem) but visually heavier than intended. Fix: in `renderCustomLabel.tsx` and chart components, replace `fill="var(--color-tableText)"` with the actual token reference (or a CSS variable bound to `muted` / `ink` from the new tokens).

### F-P1-3 — `fontFamily` doubled in some computed styles

DOM inspection on date ranges and SVG `<text>` returned `fontFamily: "Inter Variable", ... sans-serif, "Inter Variable", Inter, -apple-system, ... sans-serif"` — Inter Variable appears twice. This is the `fontFamilyApp` token (which already contains a full fallback chain) being applied to an element that already inherits `--font-family`. Cosmetic only — the browser resolves to Inter either way. Worth simplifying in a cleanup pass.

### F-P1-4 — Two transient "Initializing…" lines on first load

On a fresh cold-start, the app briefly shows two identical "Initializing the connection to the local database..." lines stacked. Resolves to one within ~3s as the worker completes init. Pre-existed Phase 1 (likely a React rendering quirk in the loading state). Not a Phase 1 regression — flag for a separate pass.

---

## Code health (Codex's claims, verified)

- ✅ `PHASE-1-TOKEN-MAP.md` lands and reads well.
- ✅ `packages/component-library/src/typography.ts` exports the 21 named styles per the token-map plan.
- ✅ `theme.tsx` cleanly aliases `--font-display` to `--font-family` (Inter) and updates `.brand-display` / `.brand-title` to Inter / weight 600.
- ✅ `tools/typography-allowlist.json` is **deleted** (was 127 lines of legacy raw-value exceptions). Confirmed — the touched files don't need them anymore.
- ✅ Codex's lint/typecheck claims pass at the file level for touched files.

---

## Comparison to baseline

The earlier design-review session (before Phase 1) noted that the visible Reports cards _happened to already_ match DESIGN.legacy.md (Waldenburg display) — making the bulk of the typography work invisible in the React layer and concentrated in SVG / shared component-library files. Phase 1 confirms this read: the cards needed token translation, not visual overhaul. The user-visible change is small but the source-of-truth change is foundational.

The 4 SummaryNumber cards are the one place where the _visual_ changed (or rather, didn't change as much as it should have). The Net Worth `display-xl` card delta now correctly uses the new token, but the 4 Summary cards still feel Waldenburg-era because of the inline 48px / 300 styling.

---

## Recommendation summary

| Phase 1 target                                  | Status | Notes                                          |
| ----------------------------------------------- | :----: | ---------------------------------------------- |
| Token foundation (`typography.ts`, `theme.tsx`) |   ✅   | Lands cleanly                                  |
| Page header (`display-2xl` + `ink-strong`)      |   ✅   | `Reports:` reads at 32/600/ink-strong          |
| Card titles (`display-lg`)                      |   ✅   | All 4 inspected match                          |
| Date ranges (`body-sm` muted)                   |   ✅   | 13/400/muted                                   |
| Cash Flow card title                            |   ✅   | 20/600                                         |
| Cash Flow SVG `<text>` labels                   |   ⚠️   | Typography matches; color drifts to ink-strong |
| Cash Flow SVG `<text>` values                   |   ⚠️   | Same                                           |
| Summary card metric values                      |   ❌   | 48/300/auto-color — still legacy               |
| Waldenburg removal                              |   ✅   | Inter at 600 reads confident, not flat         |
| `/budget` typography                            |   ⏳   | Unchanged — queued for next Phase 1 batch      |

## Suggested next actions, in order

1. **Patch `SummaryNumber.tsx`** to drop `fontWeight: 300` and auto-coloring (F-P1-1). Decide separately whether to keep the dynamic font-sizing or replace with `display-xl`'s fixed `24px / 600`.
2. **Fix the SVG `<text>` fill drift** (F-P1-2) so charts use `muted` / `ink` per DESIGN.md.
3. **Add `SummaryNumber.tsx` to PHASE-1-TOKEN-MAP.md** under "files to update" so it's not missed in future passes.
4. **Then** continue Phase 1 on `/budget`, `/accounts`, `/schedules`, `/bank-sync` per the original plan.
5. Phase 2 demolition (Dashboard Tips, Transaction Calendar, non-Plaid providers) remains blocked on Phase 1 visible-surface completion per Codex's own sequencing — don't skip ahead.

---

## Files inspected / touched in this review

- Read: `PHASE-1-TOKEN-MAP.md`, `packages/component-library/src/typography.ts`, `packages/desktop-client/src/components/reports/ReportCardMetric.tsx`, `packages/desktop-client/src/components/reports/SummaryNumber.tsx`, `packages/desktop-client/src/style/theme.tsx`, `packages/desktop-client/src/components/reports/DashboardHeader.tsx`
- Grepped: callers of `ReportCardMetric`, `pageHeader` references
- DOM-inspected (live, 1440×900): page header, 4 card titles, 4 metric values, 3 date ranges, delta value, 4 SVG `<text>` elements (on `/reports`); sidebar account row, budget table category + amount, month header (on `/budget`)
- Screenshot: `/reports` at 1440×900 (downscaled; details extracted via DOM inspection instead)

No source files were modified during this review.
