# Phase 0 Design Decisions

Companion to `PLAN.md` section 13. This file proposes the two Phase 0 visual decisions that require user signoff before rewriting `DESIGN.md`.

Status: approved and transcribed into `DESIGN.md`. F1–F4 patch applied 2026-05-10 per `design-review/phase-1-baseline/DESIGN-MD-SPEC-REVIEW.md`.

## Changelog vs PLAN.md spec (recorded after design-review)

- **Canvas color.** PLAN.md spec said keep legacy `#f5f5f5`. New `DESIGN.md` uses `#f8f7f4` (slightly warmer). All contrast tables in this file were computed against the legacy `#f5f5f5`; the new canvas yields equal or higher contrast (improves accessibility, no regression).
- **Spacing scale.** Added `xxxl: 48px` (PLAN.md spec required it; was missing in first draft). Removed `xxxs: 2px` (unused). Added semantic aliases `page: 32px` (= xxl) and `section: 48px` (= xxxl).
- **Dead tokens removed.** `surface-raised` (duplicate of `surface`).
- **Dead tokens activated.** `display-2xl` is now used by the new `page-header` component. `ink-strong` is now referenced from `page-header`.
- **New components.** `focus-ring` (a11y), `page-header` (top-of-page hero/title).
- **Updated components.** `button-primary`, `button-secondary`, `button-ghost`, `icon-button`, `input`, `select`, `filter-chip`, `sidebar-item` now reference `focus-ring` via `focusVisible`. `table-cell-amount` documents negative-value rendering (`-$X.XX`, ink color — never auto-red).
- **New prose section.** "Token Resolution" documents how `{category.solid}` / `{category.tint}` placeholders are bound at the call site via a `getCategoryColor` helper, including stable-hash fallback for custom groups.

## Baseline Checks

- Current direction: Copilot Money-inspired app UI, not the previous ElevenLabs editorial/marketing system.
- Current `DESIGN.md`: still the retired ElevenLabs-style spec and must not be consumed as the new token source.
- Inter Variable validation: confirmed in `node_modules/@fontsource-variable/inter/wght.css` and `wght-italic.css`; both expose `font-weight: 100 900`, so proposed `400`, `500`, and `600` weights are supported.
- Design score baseline: not captured in this Codex session because the `/design-review` skill is not available here. This remains a required manual/Claude-side checkpoint before Phase 0 is marked complete.

## Decision A: Primary Action Blue

Primary actions should use blue per `PLAN.md` OD1. Ink remains for text, secondary actions, and neutral affordances.

Recommended option: **A1 - Calm Blue (`#2563EB`)**.

| Option | Hex | White text contrast | Canvas contrast | Rationale |
|---|---:|---:|---:|---|
| A1 - Calm Blue | `#2563EB` | 5.17:1 | 4.74:1 | Best balance of accessible contrast, modern app feel, and restraint. Distinct from status green/red and category palette. |
| A2 - Deep Blue | `#1D4ED8` | 6.70:1 | 6.15:1 | Strongest accessibility. More assertive and heavier; useful if the UI still feels too soft after Phase 1. |
| A3 - Product Blue | `#0066CC` | 5.57:1 | 5.11:1 | Familiar SaaS/action blue. Slightly more conventional; less distinctive than A1. |

Approved: A1.

## Decision B: Category Palette

Category colors attach to category groups per `PLAN.md` OD2. Child categories inherit the group hue. Each hue includes:

- `solid`: used for progress fills, dots, and compact chart marks.
- `tint`: used for category pill backgrounds.
- `text`: default pill text remains ink (`#292524`) for accessibility and visual consistency.

Recommended palette: **B1 - Fresh Finance Palette**.

| Token | Group intent | Solid | Tint | Solid vs canvas | Ink vs tint |
|---|---|---:|---:|---:|---:|
| `category-housing` | Rent, mortgage, home | `#B45309` | `#FEF3C7` | 4.61:1 | 13.62:1 |
| `category-food` | Groceries, restaurants | `#15803D` | `#DCFCE7` | 4.60:1 | 13.81:1 |
| `category-transport` | Transit, gas, car | `#0E7490` | `#CFFAFE` | 4.91:1 | 13.55:1 |
| `category-shopping` | Retail, discretionary shopping | `#BE123C` | `#FFE4E6` | 5.76:1 | 12.64:1 |
| `category-bills` | Utilities, subscriptions, recurring bills | `#6D28D9` | `#EDE9FE` | 6.52:1 | 12.78:1 |
| `category-health` | Medical, pharmacy, fitness | `#047857` | `#D1FAE5` | 5.03:1 | 13.38:1 |
| `category-entertainment` | Media, events, hobbies | `#C2410C` | `#FFEDD5` | 4.75:1 | 13.24:1 |
| `category-travel` | Flights, hotels, trips | `#0369A1` | `#E0F2FE` | 5.44:1 | 13.22:1 |
| `category-income` | Income groups | `#0F766E` | `#CCFBF1` | 5.02:1 | 13.46:1 |
| `category-debt` | Debt, loans, interest | `#B91C1C` | `#FEE2E2` | 5.93:1 | 12.42:1 |
| `category-savings` | Savings, investments, goals if later added | `#4D7C0F` | `#ECFCCB` | 4.58:1 | 13.98:1 |
| `category-personal` | Personal care, misc, fallback | `#7E22CE` | `#F3E8FF` | 6.41:1 | 12.86:1 |

Contrast target:

- Solid colors clear the off-white canvas strongly enough for dots/progress fills.
- Ink text on each tint far exceeds WCAG AA for normal text.
- Color is never the only signal; each dot/pill/progress bar must be paired with a label or amount.

Deterministic fallback rule:

- Unknown custom category groups should map to one of these 12 hues by stable hash of the group name.
- If category group color persistence lands later, explicit stored color wins over hash fallback.

Approved: B1 as-is.

## Decision C: Phase 0 Token Defaults

These are not blocked by color choice but should be reviewed with the color decisions.

Recommended typography defaults for new `DESIGN.md`:

| Token | Font | Size | Weight | Line height | Usage |
|---|---|---:|---:|---:|---|
| `display-2xl` | Inter Variable | 32px | 600 | 1.15 | Page hero/title on dashboard-like surfaces |
| `display-xl` | Inter Variable | 24px | 600 | 1.2 | Section page titles |
| `display-lg` | Inter Variable | 20px | 600 | 1.3 | Card titles |
| `title-md` | Inter Variable | 16px | 600 | 1.35 | Group headers, row leaders |
| `body-md` | Inter Variable | 15px | 400 | 1.45 | Default app text |
| `body-strong` | Inter Variable | 15px | 500 | 1.45 | Emphasized app text |
| `body-sm` | Inter Variable | 13px | 400 | 1.4 | Dense table cells and secondary text |
| `caption` | Inter Variable | 12px | 500 | 1.35 | Labels, badges, metadata |
| `button` | Inter Variable | 15px | 600 | 1 | Primary and secondary buttons |
| `tabular-figure` | modifier | inherit | inherit | inherit | Amounts, balances, deltas, table numbers |

Tabular figure rule:

- Keep the existing broad coverage mechanism: global `font-feature-settings: "ss01", "ss04", "tnum"`.
- Keep `FinancialText` as the explicit semantic wrapper for amount surfaces.
- Route isolated `fontVariantNumeric: "tabular-nums"` inline usages through the shared amount style during Phase 1.

## Decision D: Phase 0 Output Shape

After decisions A and B are approved:

1. Rename current `DESIGN.md` to `DESIGN.legacy.md`.
2. Write a new `DESIGN.md` in the same markdown + YAML-frontmatter shape.
3. Include only app-UI tokens and component specs. Do not keep hero/marketing/orb/pricing/voice components.
4. Reserve dark-mode token slots but do not complete full dark-mode design in v0.
5. Keep the file concise enough for future agents to use without reinterpreting the product direction.
