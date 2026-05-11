---
version: app-ui-v0
name: Enough
description: A calm personal-finance app UI system for dense, repeated money work. Enough uses Inter Variable only, restrained off-white surfaces, ink-first text, one approved blue action color, and a fixed category-color palette for scanability. The product direction is Copilot Money-inspired without copying proprietary assets, exact hues, copy, logos, or layout. This file replaces the retired ElevenLabs editorial marketing spec archived in DESIGN.legacy.md.

principles:
  - Build the app surface first, not a landing page.
  - Optimize for scanability, comparison, and repeated use.
  - Use color to encode category, status, and action; never as decoration.
  - Keep typography consistent across cards, tables, sidebars, modals, charts, and mobile shared components.
  - Use tabular figures for all financial values.
  - Prefer restrained density over oversized editorial display.

colors:
  ink: "#292524"
  ink-strong: "#0c0a09"
  body: "#4e4e4e"
  muted: "#777169"
  muted-soft: "#a8a29e"
  disabled: "#b8b3ad"

  canvas: "#f8f7f4"
  canvas-soft: "#fbfaf8"
  surface: "#ffffff"
  surface-raised: "#ffffff"
  surface-subtle: "#f3f2ef"
  surface-selected: "#eef4ff"
  surface-hover: "#f5f4f1"

  hairline: "#e7e5e4"
  hairline-soft: "#f0efed"
  hairline-strong: "#d6d3d1"

  accent-action: "#2563EB"
  accent-action-hover: "#1D4ED8"
  accent-action-pressed: "#1E40AF"
  accent-action-muted: "#DBEAFE"
  on-accent-action: "#ffffff"

  semantic-success: "#15803D"
  semantic-success-soft: "#DCFCE7"
  semantic-warning: "#B45309"
  semantic-warning-soft: "#FEF3C7"
  semantic-error: "#B91C1C"
  semantic-error-soft: "#FEE2E2"
  semantic-info: "#0369A1"
  semantic-info-soft: "#E0F2FE"

  category-housing: "#B45309"
  category-housing-tint: "#FEF3C7"
  category-food: "#15803D"
  category-food-tint: "#DCFCE7"
  category-transport: "#0E7490"
  category-transport-tint: "#CFFAFE"
  category-shopping: "#BE123C"
  category-shopping-tint: "#FFE4E6"
  category-bills: "#6D28D9"
  category-bills-tint: "#EDE9FE"
  category-health: "#047857"
  category-health-tint: "#D1FAE5"
  category-entertainment: "#C2410C"
  category-entertainment-tint: "#FFEDD5"
  category-travel: "#0369A1"
  category-travel-tint: "#E0F2FE"
  category-income: "#0F766E"
  category-income-tint: "#CCFBF1"
  category-debt: "#B91C1C"
  category-debt-tint: "#FEE2E2"
  category-savings: "#4D7C0F"
  category-savings-tint: "#ECFCCB"
  category-personal: "#7E22CE"
  category-personal-tint: "#F3E8FF"

dark-mode-reserved:
  status: reserved-for-later
  rule: Do not design full dark mode in v0. Reserve equivalent token names only when implementation needs a slot.

typography:
  family:
    app: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  display-2xl:
    fontFamily: "{typography.family.app}"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0
  display-xl:
    fontFamily: "{typography.family.app}"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  display-lg:
    fontFamily: "{typography.family.app}"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "{typography.family.app}"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0
  body-md:
    fontFamily: "{typography.family.app}"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  body-strong:
    fontFamily: "{typography.family.app}"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  body-sm:
    fontFamily: "{typography.family.app}"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption:
    fontFamily: "{typography.family.app}"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  button:
    fontFamily: "{typography.family.app}"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  tabular-figure:
    fontFamily: "{typography.family.app}"
    fontVariantNumeric: tabular-nums
    fontFeatureSettings: "'ss01', 'ss04', 'tnum'"

spacing:
  xxxs: 2px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  page: 32px

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

shadows:
  none: none
  card: "0 1px 2px rgba(12, 10, 9, 0.05), 0 10px 24px rgba(12, 10, 9, 0.04)"
  popover: "0 12px 40px rgba(12, 10, 9, 0.16)"

components:
  page-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: 24px 32px
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderRight: "1px solid {colors.hairline}"
    width: 280px
    typography: "{typography.body-strong}"
  sidebar-item:
    height: 40px
    rounded: "{rounded.md}"
    padding: 0 12px
    typography: "{typography.body-strong}"
    textColor: "{colors.muted}"
    activeBackgroundColor: "{colors.surface-selected}"
    activeTextColor: "{colors.accent-action}"
  toolbar:
    height: 56px
    backgroundColor: "{colors.surface}"
    borderBottom: "1px solid {colors.hairline}"
    padding: 0 24px
    typography: "{typography.body-strong}"
  button-primary:
    backgroundColor: "{colors.accent-action}"
    hoverBackgroundColor: "{colors.accent-action-hover}"
    pressedBackgroundColor: "{colors.accent-action-pressed}"
    textColor: "{colors.on-accent-action}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: 0 18px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline-strong}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: 0 18px
  button-ghost:
    backgroundColor: transparent
    hoverBackgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 12px
  icon-button:
    size: 36px
    rounded: "{rounded.md}"
    backgroundColor: transparent
    hoverBackgroundColor: "{colors.surface-hover}"
    iconColor: "{colors.muted}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    shadow: "{shadows.card}"
    padding: 24px
  metric-card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 24px
    titleTypography: "{typography.display-lg}"
    subtitleTypography: "{typography.body-sm}"
    valueTypography: "{typography.display-xl}"
    valueNumeric: "{typography.tabular-figure}"
  table-header:
    typography: "{typography.caption}"
    textColor: "{colors.muted}"
    height: 36px
    borderBottom: "1px solid {colors.hairline}"
  table-row:
    typography: "{typography.body-sm}"
    heightComfortable: 44px
    heightCompact: 36px
    hoverBackgroundColor: "{colors.surface-hover}"
    selectedBackgroundColor: "{colors.surface-selected}"
    borderBottom: "1px solid {colors.hairline-soft}"
  table-cell-label:
    typography: "{typography.body-sm}"
    textColor: "{colors.ink}"
  table-cell-amount:
    typography: "{typography.body-sm}"
    numeric: "{typography.tabular-figure}"
    textAlign: right
  category-pill:
    typography: "{typography.caption}"
    textColor: "{colors.ink}"
    backgroundColor: "{category.tint}"
    rounded: "{rounded.pill}"
    height: 24px
    padding: 0 9px
  category-dot:
    size: 7px
    rounded: "{rounded.pill}"
    backgroundColor: "{category.solid}"
  progress-bar:
    height: 6px
    trackColor: "{colors.surface-subtle}"
    fillColor: "{category.solid}"
    rounded: "{rounded.pill}"
  status-dot:
    size: 8px
    rounded: "{rounded.pill}"
    successColor: "{colors.semantic-success}"
    warningColor: "{colors.semantic-warning}"
    errorColor: "{colors.semantic-error}"
    infoColor: "{colors.semantic-info}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    placeholderColor: "{colors.muted}"
    border: "1px solid {colors.hairline-strong}"
    focusBorderColor: "{colors.accent-action}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 12px
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline-strong}"
    typography: "{typography.body-md}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: 0 14px
  filter-chip:
    backgroundColor: "{colors.surface-subtle}"
    activeBackgroundColor: "{colors.accent-action-muted}"
    textColor: "{colors.ink}"
    activeTextColor: "{colors.accent-action-pressed}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: 28px
    padding: 0 10px
  sheet:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.xl}"
    shadow: "{shadows.popover}"
    padding: 24px
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    shadow: "{shadows.popover}"
    padding: 24px
  chart-label:
    fontFamily: "{typography.family.app}"
    fontSize: 12px
    fontWeight: 500
    fill: "{colors.muted}"
    letterSpacing: 0
  chart-value:
    fontFamily: "{typography.family.app}"
    fontSize: 13px
    fontWeight: 500
    fill: "{colors.ink}"
    fontVariantNumeric: tabular-nums
  chart-axis:
    fontFamily: "{typography.family.app}"
    fontSize: 12px
    fontWeight: 500
    fill: "{colors.muted}"
    letterSpacing: 0
  density-comfortable:
    rowHeight: 44px
    pageGap: 24px
    cardPadding: 24px
  density-compact:
    rowHeight: 36px
    pageGap: 16px
    cardPadding: 18px
---

# Enough App UI Design System

This is the active design source of truth for Enough. It replaces the archived ElevenLabs-inspired marketing spec in `DESIGN.legacy.md`.

The old direction failed because it imported an editorial brand system into a dense finance application. Finance UI needs reliable scanning, stable amount alignment, category recognition, and low-friction repeated use. It does not need atmospheric gradients, oversized type, or decorative cards.

## Scope

This file governs:

- Typography tokens used by app surfaces, charts, cards, tables, sidebars, modals, and mobile shared components.
- Color tokens for text, surfaces, status, action, and categories.
- Component specs for the surfaces being rebuilt in Phases 1 through 4.
- Chart and SVG typography, which must be explicit because SVG text often does not inherit React/CSS text styles consistently.

This file does not govern:

- Marketing pages.
- Decorative illustrations.
- Legacy upstream documentation styling.
- Full dark mode. Dark-mode token slots are reserved, but the complete dark-mode visual pass is out of v0 scope.

## Typography Rule

Use Inter Variable everywhere in app UI. Do not use Waldenburg in product surfaces.

Financial values must use tabular figures. The app can keep the global `font-feature-settings: 'ss01', 'ss04', 'tnum'` fallback, but amount surfaces should still use `FinancialText` or a named amount/token style for semantic clarity.

Raw `fontSize`, `fontWeight`, and `letterSpacing` values are not allowed in new app UI work unless they are added to the temporary typography allowlist with a removal plan. Prefer named tokens.

## Category Color Rule

Use the B1 Fresh Finance Palette:

| Token | Solid | Tint | Use |
|---|---:|---:|---|
| `category-housing` | `#B45309` | `#FEF3C7` | Housing, rent, mortgage, home |
| `category-food` | `#15803D` | `#DCFCE7` | Groceries, restaurants |
| `category-transport` | `#0E7490` | `#CFFAFE` | Transit, gas, car |
| `category-shopping` | `#BE123C` | `#FFE4E6` | Retail and discretionary shopping |
| `category-bills` | `#6D28D9` | `#EDE9FE` | Utilities, subscriptions, recurring bills |
| `category-health` | `#047857` | `#D1FAE5` | Medical, pharmacy, fitness |
| `category-entertainment` | `#C2410C` | `#FFEDD5` | Media, events, hobbies |
| `category-travel` | `#0369A1` | `#E0F2FE` | Flights, hotels, trips |
| `category-income` | `#0F766E` | `#CCFBF1` | Income groups |
| `category-debt` | `#B91C1C` | `#FEE2E2` | Debt, loans, interest |
| `category-savings` | `#4D7C0F` | `#ECFCCB` | Savings, investments, goals |
| `category-personal` | `#7E22CE` | `#F3E8FF` | Personal care, fallback |

Group-level category color is the rule. Child categories inherit their group color unless a later explicit color-setting feature is built.

Unknown custom category groups map to this palette by stable hash of the group name. Color is never the only signal; pair it with a label, amount, icon, or row context.

## Action Color Rule

Use A1 Calm Blue `#2563EB` for primary actions, active controls, and selected navigation states. Use ink for text and neutral actions. Do not use category colors for generic CTAs.

## Layout Rule

The app uses full-width working surfaces with contained cards only where a card represents a discrete repeated or dashboard item. Do not put cards inside cards. Do not add decorative orbs, gradient blobs, marketing hero bands, or pricing-style panels.

Dashboard and table surfaces use 24-32px page padding, not 96px section padding.

## Component-Specific Notes

### Dashboard Cards

Dashboard cards should read like product analytics, not like editorial stat posters:

- Title: `display-lg`
- Subtitle/date range: `body-sm`
- Main value: `display-xl` + `tabular-figure`
- Delta: `body-strong` + semantic color
- Chart labels: `chart-label`
- Chart values: `chart-value`

### Budget Table

Budget rows must prioritize alignment and comparison:

- Group headers: `title-md`
- Category labels: `body-sm`
- Budgeted/spent/balance amounts: `table-cell-amount`
- Negative values: `semantic-error`
- Positive available values: `semantic-success`
- Overspent state must include color plus text or icon state.

### Transactions

Transaction lists should feel closer to an inbox than a spreadsheet:

- Payee: `body-strong`
- Notes/account metadata: `body-sm` or `caption`
- Amount: `table-cell-amount`
- Category: `category-pill`
- Review state: explicit status dot or checkbox, not color alone.

### Categories

Category pages should use category color intentionally:

- Category group dot: group `solid`
- Category pill background: group `tint`
- Progress fill: group `solid`
- Progress track: `surface-subtle`
- Amounts remain ink/semantic, not category-colored, unless the value is a chart mark.

### Bank Sync

Enough is Plaid-first for v0. Bank sync surfaces should not show GoCardless, SimpleFIN, or Pluggy as equivalent options. If legacy non-Plaid data exists, preserve data compatibility without advertising setup paths that are no longer supported in this product direction.

### Charts And SVG

Never rely on inherited text style for SVG `<text>`. Apply explicit `fontFamily`, `fontSize`, `fontWeight`, `fill`, and tabular numeric settings via chart tokens.

### Mobile Shared Components

Shared typography, color, pill, table, and button tokens apply to mobile too. Only mobile-specific layout patterns are deferred.

## Removed From The Legacy Spec

Do not reintroduce these tokens or components:

- Waldenburg display typography.
- `display-mega`, 48px marketing display, and 64px hero type.
- Atmospheric gradient colors: mint, peach, lavender, sky, rose.
- `hero-band`, `cta-band`, `gradient-orb-card`.
- Pricing, voice-row, voice-icon, audio-waveform, or marketing card patterns.
- 96px section padding.

## Review Checkpoint

The `/design-review` baseline could not be captured in this Codex session because that skill is not available here. Treat this as a follow-up gate:

1. Run `/design-review` in Claude Code against this rewritten `DESIGN.md`.
2. Record the baseline and critique before Phase 1 component token rollout is considered complete.
3. Do not use computed-style equivalence to the old UI as the acceptance target. The target is app-UI coherence against this file.
