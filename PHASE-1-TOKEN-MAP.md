# Phase 1 Token Map

Status: active implementation map for `PLAN.md` section 4.

Source of truth:

- Old source: `DESIGN.legacy.md`
- New source: `DESIGN.md`
- Scope: visible typography foundation for `/budget`, `/reports/*`, `/accounts/*`, `/schedules`, and `/bank-sync`

## Typography Translation

| Legacy token or usage                   | New token                      | Implementation rule                                                                             |
| --------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `display-mega` `64px / 300 / -1.92`     | none                           | Remove from app UI. Do not recreate this scale.                                                 |
| `display-xl` `48px / 300 / -0.96`       | none                           | Remove from app UI. Large marketing display does not belong in product surfaces.                |
| `display-lg` `36px / 300 / -0.36`       | `page-header` or `display-2xl` | Use only for top-level page titles through `typography.pageHeader`.                             |
| `display-md` `32px / 300 / -0.32`       | `display-2xl`                  | Only via `page-header`; never use Waldenburg or weight 300.                                     |
| `display-sm` `24px / 300`               | `display-xl`                   | Report metric values and prominent financial totals. Add `tabularFigure`.                       |
| `title-md` `20px / 500`                 | `display-lg`                   | Card titles and dashboard section titles. Weight becomes 600.                                   |
| `title-sm` `18px / 500 / 0.18`          | `title-md`                     | Group headers and row leaders. Remove letter spacing.                                           |
| `body-md` `16px / 400 / 0.16`           | `body-md`                      | Default app copy becomes 15px and removes letter spacing.                                       |
| `body-strong` `16px / 500 / 0.16`       | `body-strong`                  | Emphasized app copy becomes 15px and removes letter spacing.                                    |
| `body-sm` `15px / 400 / 0.15`           | `body-sm`                      | Dense table cells and secondary metadata become 13px.                                           |
| `caption` `14px / 400`                  | `caption` or `body-sm`         | Labels and metadata use `caption`; readable secondary prose uses `body-sm`.                     |
| `caption-uppercase` `12px / 600 / 0.96` | `caption`                      | Use uppercase only where the component already needs an uppercase label. No raw letter spacing. |
| `button` `15px / 500`                   | `button`                       | Button text becomes 15px / 600.                                                                 |
| `nav-link` `15px / 500`                 | `body-strong`                  | Sidebar and nav rows use `body-strong`; active color comes from `accent-action`.                |

## Shared Style Names

The implementation should export these named style objects from `packages/component-library/src/typography.ts`.

| Export            | DESIGN.md source                                         | Intended use                                      |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `fontFamilyApp`   | `typography.family.app`                                  | Shared family string for CSS and SVG text.        |
| `display2xl`      | `typography.display-2xl`                                 | Raw display token; use sparingly.                 |
| `displayXl`       | `typography.display-xl`                                  | Metric values and major totals.                   |
| `displayLg`       | `typography.display-lg`                                  | Card titles.                                      |
| `titleMd`         | `typography.title-md`                                    | Group headers and row leaders.                    |
| `bodyMd`          | `typography.body-md`                                     | Default app body text.                            |
| `bodyStrong`      | `typography.body-strong`                                 | Emphasized body text.                             |
| `bodySm`          | `typography.body-sm`                                     | Dense table cells and secondary metadata.         |
| `caption`         | `typography.caption`                                     | Labels, badges, chart labels.                     |
| `buttonText`      | `typography.button`                                      | Button text.                                      |
| `tabularFigure`   | `typography.tabular-figure`                              | Every financial value and aligned numeric column. |
| `pageHeader`      | `components.page-header`                                 | Top-level page title typography.                  |
| `metricValue`     | `components.metric-card.valueTypography + tabularFigure` | Report card metric values.                        |
| `metricTitle`     | `components.metric-card.titleTypography`                 | Report card titles.                               |
| `metricSubtitle`  | `components.metric-card.subtitleTypography`              | Report card date ranges and subtitles.            |
| `tableCellLabel`  | `components.table-cell-label`                            | Budget/category/transaction labels.               |
| `tableCellAmount` | `components.table-cell-amount + tabularFigure`           | Amount columns; right aligned.                    |
| `chartLabel`      | `components.chart-label`                                 | SVG and Recharts labels.                          |
| `chartValue`      | `components.chart-value`                                 | SVG and Recharts amount labels.                   |
| `chartAxis`       | `components.chart-axis`                                  | Recharts axis ticks.                              |

## Financial Figure Rule

Keep both mechanisms:

- Global `font-feature-settings: "ss01", "ss04", "tnum"` stays as broad fallback.
- `FinancialText` stays as the explicit call-site wrapper for amounts.

New or touched amount surfaces must use `FinancialText` or a named style that includes `tabularFigure`. Remove inline `fontVariantNumeric: 'tabular-nums'` where Phase 1 touches it.

Negative amount formatting for normal amount cells stays ink-colored `-$X.XX`. Reserve red (`semantic-error`) for status and diff semantics such as overspent, overdraft, and declining deltas.

## Phase 1 File Priority

1. Create `packages/component-library/src/typography.ts`.
2. Re-export typography from `packages/component-library/src/index.ts` if the package has a barrel export.
3. Update report cards and chart labels first:
   - `packages/desktop-client/src/components/reports/ReportCardMetric.tsx`
   - `packages/desktop-client/src/components/reports/ReportCardName.tsx`
   - `packages/desktop-client/src/components/reports/DashboardHeader.tsx`
   - `packages/desktop-client/src/components/reports/DateRange.tsx`
   - `packages/desktop-client/src/components/reports/graphs/CashFlowCard.tsx`
   - `packages/desktop-client/src/components/reports/graphs/renderCustomLabel.tsx`
   - `packages/desktop-client/src/components/reports/graphs/DonutGraph.tsx`
   - `packages/desktop-client/src/components/reports/graphs/AgeOfMoneyGraph.tsx`
4. Update visible amount/table surfaces in `/budget`, `/accounts`, `/schedules`, and `/bank-sync` only where the file is already in Phase 1 scope.
5. Tighten `tools/typography-allowlist.json` for touched files only.

## Non-Goals

- Do not sweep stories, tests, settings, command bar, mobile-only screens, or modals in Phase 1 unless a touched visible component forces it.
- Do not recreate Waldenburg through another serif fallback.
- Do not use category colors for generic CTAs.
- Do not treat computed equivalence to the old UI as success. The target is this token map plus `DESIGN.md`.
