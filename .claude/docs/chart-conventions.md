# Chart Conventions

## Stack (enforced)
- Recharts v3 (`recharts@^3.8.1`) — already installed in packages/desktop-client
- NO shadcn/ui, NO Tailwind, NO ResponsiveContainer
- Styling: Emotion CSS via `style={}` objects + `View`/`Text` from `@actual-app/components`

## Sizing — always use AutoSizer, never ResponsiveContainer

```tsx
import { AutoSizer } from 'react-virtualized-auto-sizer';

<AutoSizer renderProp={({ width, height }) =>
  width === 0 || height === 0 ? null : <AreaChart width={width} height={height} .../>
} />
```

Or use the `ChartContainer` utility (preferred — eliminates boilerplate):

```tsx
import { ChartContainer } from '#components/analytics/ChartContainer';

<ChartContainer minHeight={160}>
  {({ width, height }) => (
    <AreaChart width={width} height={height} .../>
  )}
</ChartContainer>
```

## Colors
- Line/area: `theme.semanticSuccess` (positive) or `theme.semanticError` (negative)
- Multi-series: `getColorScale('qualitative')[N]` from `#components/analytics/chart-theme`
  - Returns CSS custom property strings like `'var(--color-chartQual1)'` — do NOT use `theme.chartQualN` (that key does not exist)
- Fill tint: `theme.semanticSuccessSoft` / `theme.semanticErrorSoft`
- No hardcoded hex values in chart code

## Hover Scrubbing — hide tooltip DOM, drive state

```tsx
const [hovered, setHovered] = useState<Point | null>(null);

<Tooltip
  contentStyle={{ display: 'none' }}
  isAnimationActive={false}
  labelFormatter={(_label, items) => {
    const data = items[0]?.payload;
    if (data) setHovered(data);
    return '';
  }}
/>
```

Reset on `onMouseLeave` of outer container: `setHovered(null)` (or reset to last data point).

Render date + value in a `View`/`Text` block OUTSIDE the chart — this is the pattern used in `BalanceHistoryGraph.tsx`.

## Financial Formatting
- `const format = useFormat()` then `format(value, 'financial')`
- Pre-formatted strings on each data point (`networth`, `assets`, `debt`) — use them directly in tooltip display

## Animation

```tsx
import { useRechartsAnimation } from '#components/analytics/chart-theme';

const animProps = useRechartsAnimation();
// Spread onto <Area {...animProps} />
```

## Gradient Fills

```tsx
import { buildGradientId } from '#components/analytics/chart-theme';

// e.g. buildGradientId('netWorth', 'positive') → "netWorth-positive"
const gradId = buildGradientId('netWorth', 'positive');

// Inside the chart's <defs>:
<defs>
  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor={theme.semanticSuccess} stopOpacity={0.3} />
    <stop offset="95%" stopColor={theme.semanticSuccess} stopOpacity={0} />
  </linearGradient>
</defs>

// Reference in <Area>:
<Area fill={`url(#${gradId})`} stroke={theme.semanticSuccess} />
```

## Reference Implementation
`packages/desktop-client/src/components/accounts/BalanceHistoryGraph.tsx`

**Read this FIRST before writing any new chart code.** It is the only production Recharts component in the codebase and demonstrates:
- AutoSizer sizing pattern
- `contentStyle={{ display: 'none' }}` + `labelFormatter` → `setHoveredValue` hover scrubbing
- Rendering hovered data outside the chart in `View`/`Text`
- Recharts v3 prop shapes (do NOT guess from v2 memory)

## Net Worth Data Shape

Each point from `net-worth-spreadsheet.ts` has:
```ts
{
  x: string,      // formatted date label (e.g. "Jan '25")
  y: number,      // raw numeric net worth value
  date: string,   // long-form date for tooltip (e.g. "January 2025")
  networth: string, // pre-formatted currency string
  assets: string,   // pre-formatted currency string
  debt: string,     // pre-formatted currency string (already includes leading -)
  change: string,   // pre-formatted currency string
  // ...plus one key per account id with balance number
}
```

## Common Pitfalls
- Never use `ResponsiveContainer` — it causes infinite resize loops with the app's layout
- Never hardcode hex colors — always use `theme.*` tokens
- Never import from `recharts` v2 memory (no `<Area dot={false} />` style guessing) — check BalanceHistoryGraph.tsx for real v3 API
- `View` accepts `onMouseLeave` directly as a prop (it spreads `HTMLProps<HTMLDivElement>`)
- `AutoSizer` in this project uses `renderProp` (not `children`) — check the actual import
