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

  chat-advisor-accent: "#0369A1"        # Local AI identity, header dot, assistant status.
  chat-advisor-accent-soft: "#E0F2FE"   # Assistant message tint, local model badge background.
  chat-advisor-accent-pale: "#F0F9FF"   # Suggestion chip hover, empty chat background.
  chat-advisor-accent-mid: "#0284C7"    # Active chip border, focused assistant affordance.
  chat-advisor-accent-deep: "#075985"   # Text on pale/soft AI backgrounds.
  chat-user-accent: "#2563EB"           # User action identity and Send button.
  chat-user-accent-soft: "#DBEAFE"      # User message bubble background.
  chat-neutral-surface: "#FFFFFF"       # Card/panel background.
  chat-neutral-subtle: "#F3F2EF"        # Neutral assistant bubble fallback, summary blocks.
  chat-neutral-pale: "#F8F7F4"          # Transcript background.
  chat-neutral-border: "#E7E5E4"        # Input border, subtle separators.
  chat-text-primary: "#0C0A09"          # Main chat text.
  chat-text-secondary: "#777169"        # Helper copy and secondary metadata.
  chat-success: "#15803D"               # Local model available indicator only.
  chat-success-soft: "#DCFCE7"          # Available badge background.
  chat-warning: "#B45309"               # Slow/retryable warning.
  chat-warning-soft: "#FEF3C7"          # Warning banner background.
  chat-error: "#B91C1C"                 # Ollama unavailable/error text.
  chat-error-soft: "#FEE2E2"            # Error banner background.

  transaction-category-fixed: "#003ECC"
  transaction-category-fixed-tint: "#E7EFFF"
  transaction-category-fixed-deep: "#002B8A"
  transaction-category-fixed-strong: "#0057D8"
  transaction-category-fixed-mid: "#2F6BDB"
  transaction-category-fixed-soft: "#5A86D6"
  transaction-category-fixed-cyan: "#0078A8"
  transaction-category-fixed-indigo: "#3949AB"
  transaction-category-fixed-slate: "#466A9F"

  transaction-category-fun: "#F4B000"
  transaction-category-fun-tint: "#FFF3C4"
  transaction-category-fun-deep: "#7C5A00"
  transaction-category-fun-strong: "#8C5F00"
  transaction-category-fun-amber: "#9A6400"
  transaction-category-fun-honey: "#A86B00"
  transaction-category-fun-orange: "#B45309"
  transaction-category-fun-burnt: "#92400E"

  transaction-category-trading-investment: "#CF202F"
  transaction-category-trading-investment-tint: "#FDE2E5"
  transaction-category-trading-investment-deep: "#7F1D2D"
  transaction-category-trading-investment-strong: "#8F1722"
  transaction-category-trading-investment-mid: "#A61B29"
  transaction-category-trading-investment-red: "#B91C1C"
  transaction-category-trading-investment-rose: "#BE3144"

  transaction-category-other: "#5B616E"
  transaction-category-other-tint: "#F1F3F6"
  transaction-category-other-deep: "#343A46"
  transaction-category-other-strong: "#4B5563"
  transaction-category-other-mid: "#6B7280"
  transaction-category-other-cool: "#717887"
  transaction-category-other-slate: "#525A66"

  transaction-category-income: "#A8B8CC"
  transaction-category-income-tint: "#EDF2F7"
  transaction-category-income-deep: "#45576E"
  transaction-category-income-strong: "#53677F"
  transaction-category-income-mid: "#627890"
  transaction-category-income-slate: "#7188A1"
  transaction-category-income-soft: "#8193AA"

  transaction-category-future-me: "#7C3AED"
  transaction-category-future-me-tint: "#F1EAFF"
  transaction-category-future-me-deep: "#4C1D95"
  transaction-category-future-me-strong: "#5B21B6"
  transaction-category-future-me-mid: "#6D28D9"
  transaction-category-future-me-soft: "#8B5CF6"
  transaction-category-future-me-muted: "#6E56A6"
  transaction-category-future-me-slate: "#65558F"

chat-panel:
  role: Local qwen3:4b Savings Advisor chat inside the Dashboard card.
  rule: Use chat tokens for AI and chat status semantics. Do not use transaction-category colors for chat; those are reserved for spending semantics.
  modelBadge:
    backgroundColor: "{colors.chat-success-soft}"
    textColor: "{colors.chat-success}"
    label: "qwen3:4b local"
  assistantBubble:
    firstBackgroundColor: "{colors.chat-advisor-accent-soft}"
    followupBackgroundColor: "{colors.chat-neutral-subtle}"
    textColor: "{colors.chat-text-primary}"
  userBubble:
    backgroundColor: "{colors.chat-user-accent-soft}"
    textColor: "{colors.chat-text-primary}"
    alignment: right
  suggestionChip:
    backgroundColor: "{colors.chat-neutral-surface}"
    border: "1px solid {colors.chat-neutral-border}"
    hoverBackgroundColor: "{colors.chat-advisor-accent-pale}"
    activeBorderColor: "{colors.chat-advisor-accent-mid}"
  unavailableState:
    backgroundColor: "{colors.chat-error-soft}"
    textColor: "{colors.chat-error}"
  visualRestrictions:
    - No gradients.
    - No purple AI glow.
    - No bot avatar or cartoon assistant treatment.
    - Use color to communicate local model identity, user action, and availability state only.

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
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 48px
  page: 32px       # semantic alias for xxl — default page padding
  section: 48px    # semantic alias for xxxl — between major bands

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
  focus-ring:
    boxShadow: "0 0 0 3px {colors.accent-action-muted}"
    outline: none
    transition: box-shadow 150ms ease-out
    rule: Applied on :focus-visible to every interactive component (buttons, icon-button, inputs, selects, filter-chips, sidebar-item, nav-item, table-row when selectable). Never replace with `outline: none` alone.
  page-header:
    typography: "{typography.display-2xl}"
    textColor: "{colors.ink-strong}"
    marginBottom: "{spacing.lg}"
    rule: Top-of-page hero/title for `/budget`, `/reports`, `/accounts`, `/schedules`, `/bank-sync`. The page-header is the only place display-2xl is used; other surfaces step down to display-xl or display-lg.
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
    focusVisible: "{component.focus-ring}"
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
    focusVisible: "{component.focus-ring}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline-strong}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: 0 18px
    focusVisible: "{component.focus-ring}"
  button-ghost:
    backgroundColor: transparent
    hoverBackgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 12px
    focusVisible: "{component.focus-ring}"
  icon-button:
    size: 36px
    rounded: "{rounded.md}"
    backgroundColor: transparent
    hoverBackgroundColor: "{colors.surface-hover}"
    iconColor: "{colors.muted}"
    focusVisible: "{component.focus-ring}"
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
    textColor: "{colors.ink}"
    negativeFormat: "-$X.XX"
    negativeColor: "{colors.ink}"
    rule: Negative amounts use a leading minus sign and stay in ink color. Do NOT auto-color negative amounts red. Reserve semantic-error for status/diff cells where overspent or warning state is the explicit intent (budget overspent, declining delta column, overdraft warning). Currency symbol is locale-aware; the format example shows USD.
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
    focusVisible: "{component.focus-ring}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 12px
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline-strong}"
    focusVisible: "{component.focus-ring}"
    typography: "{typography.body-md}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: 0 14px
  filter-chip:
    backgroundColor: "{colors.surface-subtle}"
    activeBackgroundColor: "{colors.accent-action-muted}"
    textColor: "{colors.ink}"
    activeTextColor: "{colors.accent-action-pressed}"
    focusVisible: "{component.focus-ring}"
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

Use the Transaction Category Semantic Palette. Category color is family-first:
each top-level group owns one primary hue, and child categories use related
tints, shades, or lower-saturation variants inside the same hue family. This
keeps the table scannable without turning every category into an unrelated
rainbow.

### Transaction Category Semantic Palette

| Token                                            |     Value | Usage role                                                 | Variant guidance                                                                |
| ------------------------------------------------ | --------: | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `transaction-category-fixed`                     | `#003ECC` | Fixed expenses parent group                                | Deep institutional blue for committed, recurring obligations.                   |
| `transaction-category-fixed-tint`                | `#E7EFFF` | Fixed soft fill/background                                 | Use only as a tint behind blue marks; never as text.                            |
| `transaction-category-fixed-deep`                | `#002B8A` | Rent, mortgage, housing-heavy fixed costs                  | Darkest blue shade; best for high-value fixed categories.                       |
| `transaction-category-fixed-strong`              | `#0057D8` | Insurance and important recurring fixed costs              | Strong blue variant with clear contrast on white/off-white.                     |
| `transaction-category-fixed-mid`                 | `#2F6BDB` | Phone, groceries, or generic fixed child fallback          | Mid-blue; use when a fixed child does not have a more specific mapping.         |
| `transaction-category-fixed-soft`                | `#5A86D6` | Utilities and lower-emphasis fixed costs                   | Softer blue; avoid using for tiny text.                                         |
| `transaction-category-fixed-cyan`                | `#0078A8` | Transportation, transit, car                               | Blue-cyan variant that stays inside the Fixed family.                           |
| `transaction-category-fixed-indigo`              | `#3949AB` | Subscriptions and recurring digital services               | Indigo-blue variant; distinct from transport while still Fixed-family.          |
| `transaction-category-fixed-slate`               | `#466A9F` | Internet, broadband, network services                      | Desaturated blue; useful for infrastructure-like categories.                    |
| `transaction-category-fun`                       | `#F4B000` | Fun parent group                                           | Bright yellow identity token; use with labels because it is not text-safe.      |
| `transaction-category-fun-tint`                  | `#FFF3C4` | Fun soft fill/background                                   | Light amber tint for chips or card backgrounds; never use as the only signal.   |
| `transaction-category-fun-deep`                  | `#7C5A00` | Hobbies and low-frequency discretionary spend              | Deep ochre; passes better contrast than the parent yellow.                      |
| `transaction-category-fun-strong`                | `#8C5F00` | Personal care                                              | Strong amber-brown, readable as yellow-family without screaming.                |
| `transaction-category-fun-amber`                 | `#9A6400` | Shopping and retail                                        | Amber shade for discretionary purchases.                                        |
| `transaction-category-fun-honey`                 | `#A86B00` | Food/groceries when categorized under Fun                  | Honey shade; use for everyday discretionary food categories.                    |
| `transaction-category-fun-orange`                | `#B45309` | Entertainment, media, events                               | Orange-amber shade; still belongs to Fun, not warning state.                    |
| `transaction-category-fun-burnt`                 | `#92400E` | Restaurants, dining, bars, coffee                          | Burnt amber for dining; high enough contrast for small bars.                    |
| `transaction-category-trading-investment`        | `#CF202F` | Trading and investment parent group                        | Red identity only; never use this token for loss/error meaning.                 |
| `transaction-category-trading-investment-tint`   | `#FDE2E5` | Trading and investment soft fill/background                | Soft red tint for category context, not for account performance.                |
| `transaction-category-trading-investment-deep`   | `#7F1D2D` | Brokerage fees                                             | Deep crimson; separates fees from account-value status.                         |
| `transaction-category-trading-investment-strong` | `#8F1722` | Investment/portfolio child fallback                        | Strong crimson child variant.                                                   |
| `transaction-category-trading-investment-mid`    | `#A61B29` | Stocks and ETFs                                            | Mid crimson; use for equities-related categories.                               |
| `transaction-category-trading-investment-red`    | `#B91C1C` | Losses or interest-like trading categories                 | Closest to error red; pair with label so it is not mistaken for status.         |
| `transaction-category-trading-investment-rose`   | `#BE3144` | Crypto and volatile investment categories                  | Rose-red variant, distinct from the parent red.                                 |
| `transaction-category-other`                     | `#5B616E` | Other parent group, miscellaneous, uncategorized, fallback | Neutral gray identity token. Do not reuse for disabled text or inactive states. |
| `transaction-category-other-tint`                | `#F1F3F6` | Other soft fill/background                                 | Secondary neutral fill; keep distinct from disabled surfaces.                   |
| `transaction-category-other-deep`                | `#343A46` | Work expenses or heavy miscellaneous categories            | Dark neutral; clearly visible, not disabled.                                    |
| `transaction-category-other-strong`              | `#4B5563` | Miscellaneous and uncategorized children                   | Default child color inside Other.                                               |
| `transaction-category-other-mid`                 | `#6B7280` | Low-frequency custom Other children                        | Mid neutral; still a real category mark.                                        |
| `transaction-category-other-cool`                | `#717887` | Plaid/fallback imported category groups                    | Cool neutral variant for imported or system-like groupings.                     |
| `transaction-category-other-slate`               | `#525A66` | Custom Other fallback                                      | Slate neutral; use when stable hash needs another Other-family choice.          |
| `transaction-category-income`                    | `#A8B8CC` | Income parent group                                        | Blue gray identity token; intentionally calm, not profit green.                 |
| `transaction-category-income-tint`               | `#EDF2F7` | Income soft fill/background                                | Soft blue-gray tint for income grouping context.                                |
| `transaction-category-income-deep`               | `#45576E` | Salary, payroll, wages                                     | Dark blue gray; use for actual income row marks so contrast is adequate.        |
| `transaction-category-income-strong`             | `#53677F` | Bonus, commission                                          | Strong blue gray; separates income source type without using success green.     |
| `transaction-category-income-mid`                | `#627890` | Transfers and deposits                                     | Mid blue gray for neutral income movement.                                      |
| `transaction-category-income-slate`              | `#7188A1` | Interest and dividends                                     | Slate blue gray; avoid confusing with account status.                           |
| `transaction-category-income-soft`               | `#8193AA` | Other income fallback                                      | Softest usable income child mark; do not use as body text.                      |
| `transaction-category-future-me`                 | `#7C3AED` | Future Me parent group                                     | Purple identity token for education, growth, career, and self-investment.       |
| `transaction-category-future-me-tint`            | `#F1EAFF` | Future Me soft fill/background                             | Light purple tint for chips or contextual fills; never use as text.             |
| `transaction-category-future-me-deep`            | `#4C1D95` | Career, certification, conferences, retirement             | Deep purple; strongest variant for high-importance future-building categories.  |
| `transaction-category-future-me-strong`          | `#5B21B6` | Education, school, tuition, courses                        | Strong purple child token with high contrast on white/off-white surfaces.       |
| `transaction-category-future-me-mid`             | `#6D28D9` | Learning, books, training, savings transfers               | Mid purple; use for ongoing learning or future-funding categories.              |
| `transaction-category-future-me-soft`            | `#8B5CF6` | Future Me fallback child                                   | Brighter purple variant; use for larger marks, not small body text.             |
| `transaction-category-future-me-muted`           | `#6E56A6` | Wellness, therapy, fitness under Future Me                 | Lower-saturation purple for personal-development health categories.             |
| `transaction-category-future-me-slate`           | `#65558F` | Growth, self-improvement, emergency fund                   | Desaturated purple; useful when the row should feel calm but still active.      |

### Palette Meaning And Contrast

The palette is intentionally semantic, not decorative. Fixed is blue because
fixed obligations should feel stable and institutional. Fun is yellow because
discretionary spend should feel distinct from obligation and status colors.
Trading and investment uses red only as a category-family identity; it must not
be reused for loss, error, negative return, debt, or warning states. Other uses
`#5B616E` as a real neutral category, not as disabled/inactive UI. Income uses
blue gray so income is calm and legible without competing with green success.
Future Me uses purple because it reads as aspirational and self-investment
without colliding with fixed obligations, discretionary spend, income, or
trading categories.

Contrast audit: `#003ECC`, `#CF202F`, and `#5B616E` are strong enough for small
marks on white/off-white surfaces. `#7C3AED` also has enough contrast for small
category marks. `#F4B000` and `#A8B8CC` are lower-contrast identity colors, so
they should not be used as text. Use the darker Fun and Income child variants
for thin bars, dots, and dense table marks when the parent token would be too
subtle. Color is never the only signal; pair it with a label, amount, icon, or
row context.

Unknown custom category groups map to the Other family by default. This is
deliberate: miscellaneous or uncategorized transactions should feel neutral and
secondary, while still reading as a real category.

## Action Color Rule

Use A1 Calm Blue `#2563EB` for primary actions, active controls, and selected navigation states. Use ink for text and neutral actions. Do not use category colors for generic CTAs.

## Token Resolution

Some component specs reference `{category.solid}` or `{category.tint}` as placeholder bindings to a specific category's color. These are resolved at runtime in component code, not in the design tokens themselves.

The implementer provides a typed helper:

```ts
type CategoryGroup =
  | 'fixed'
  | 'fun'
  | 'trading-investment'
  | 'other'
  | 'income'
  | 'future-me'
  | string; // custom groups

function getCategoryColor(
  group: CategoryGroup,
  category?: string | null,
): { color: string; tint: string };
```

Resolution rules, in order:

1. **Stored override (Phase 3+).** If the category record has an explicit stored color, return it after format normalization.
2. **Named semantic family.** If `group` resolves to Fixed, Fun, Trading and Investment, Other, Income, or Future Me, return that family parent color for the group row.
3. **Named child variant.** If a category name is provided, match the category inside the resolved family and return a related tint, shade, or lower-saturation variant from that same family.
4. **Family fallback.** If the group is unknown, resolve it to the Other family. If the category is unknown inside a known family, compute `stableHash(category) mod family.children.length` and return a stable child variant from that family.

Bind at the usage site, not in the design tokens. Example: `<CategoryPill group={transaction.categoryGroup} category={transaction.category} />` resolves both the group family and child variant by calling `getCategoryColor(group, category)`.

The placeholder `{category.X}` in this file means "fill via `getCategoryColor` at usage site." Do not treat `{category.tint}` or `{category.solid}` as standalone tokens.

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
