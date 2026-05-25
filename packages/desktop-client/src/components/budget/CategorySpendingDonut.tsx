// @ts-strict-ignore
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { caption, chartValue } from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { useFormat } from '#hooks/useFormat';
import { useSheetValue } from '#hooks/useSheetValue';
import type { SheetFields } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { getCategoryColor } from './categoryColors';

type BudgetType = 'envelope' | 'tracking';
type EnvelopeBudgetField = SheetFields<'envelope-budget'>;
type TrackingBudgetField = SheetFields<'tracking-budget'>;

export type GroupForDonut = Pick<
  CategoryGroupEntity,
  'id' | 'name' | 'is_income'
>;

// ─── invisible collector ──────────────────────────────────────────────────────

/**
 * Renders nothing. Reads one group's spent amount from the spreadsheet and
 * reports it to the parent via a ref-stable callback so the donut data stays
 * up to date as the spreadsheet recalculates.
 */
function GroupSpentCollector({
  budgetType,
  group,
  onReport,
}: {
  budgetType: BudgetType;
  group: GroupForDonut;
  onReport: (groupId: string, spent: number) => void;
}) {
  const envelopeValue = useSheetValue<'envelope-budget', EnvelopeBudgetField>(
    envelopeBudget.groupSumAmount(group.id),
  );
  const trackingValue = useSheetValue<'tracking-budget', TrackingBudgetField>(
    trackingBudget.groupSumAmount(group.id),
  );
  const raw = budgetType === 'tracking' ? trackingValue : envelopeValue;
  const spent = Math.abs((raw as number) ?? 0);

  // Keep a ref to avoid stale-closure without adding onReport to effect deps
  // (onReport is stable via useCallback in parent, but using a ref is safer).
  const onReportRef = useRef(onReport);
  onReportRef.current = onReport;

  useEffect(() => {
    onReportRef.current(group.id, spent);
  }, [group.id, spent]);

  return null;
}

// ─── types ────────────────────────────────────────────────────────────────────

type DonutDataPoint = {
  id: string;
  name: string;
  spent: number;
  color: string;
};

type HoveredSegment = {
  name: string;
  spent: number;
  pct: number;
};

// Empty-state placeholder keeps the gray ring visible even with no data.
const EMPTY_PLACEHOLDER: DonutDataPoint[] = [
  { id: '_empty', name: '', spent: 1, color: theme.surfaceSubtle },
];

const DONUT_SIZE = 160;
const OUTER_RADIUS = 68;
const INNER_RADIUS = 50;

// ─── main component ───────────────────────────────────────────────────────────

/**
 * Donut chart showing spent amount by expense category group for the selected
 * month. Uses invisible GroupSpentCollector sub-components (one per group) to
 * read per-group spreadsheet values without violating the rules of hooks.
 *
 * - Income groups are always excluded.
 * - Groups in excludedGroupIds are excluded.
 * - Groups with $0 spent produce no segment.
 * - Segments are ordered by spent amount, largest first.
 * - Colors are sourced from getCategoryColor(), matching the table color dots.
 */
export function CategorySpendingDonut({
  budgetType,
  groups,
  excludedGroupIds,
}: {
  budgetType: BudgetType;
  groups: GroupForDonut[];
  excludedGroupIds: string[];
}) {
  const format = useFormat();
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState<HoveredSegment | null>(null);

  const onReport = useCallback((groupId: string, spent: number) => {
    setSpentMap(prev => {
      if (prev[groupId] === spent) return prev;
      return { ...prev, [groupId]: spent };
    });
  }, []);

  const donutData = useMemo((): DonutDataPoint[] => {
    return groups
      .filter(g => !g.is_income)
      .filter(g => !excludedGroupIds.includes(g.id))
      .map(g => ({
        id: g.id,
        name: g.name,
        spent: spentMap[g.id] ?? 0,
        color: getCategoryColor(g.name).color,
      }))
      .filter(d => d.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [groups, excludedGroupIds, spentMap]);

  const totalIncludedSpent = useMemo(
    () => donutData.reduce((sum, d) => sum + d.spent, 0),
    [donutData],
  );

  const hasData = donutData.length > 0;
  const displayData = hasData ? donutData : EMPTY_PLACEHOLDER;

  return (
    <View>
      {/* Invisible collectors — one per group */}
      {groups.map(g => (
        <GroupSpentCollector
          key={g.id}
          budgetType={budgetType}
          group={g}
          onReport={onReport}
        />
      ))}

      {/* Donut chart — fixed square so it renders as a circle */}
      <View
        style={{
          alignSelf: 'center',
          position: 'relative',
          width: DONUT_SIZE,
          height: DONUT_SIZE,
        }}
      >
        <PieChart width={DONUT_SIZE} height={DONUT_SIZE}>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={INNER_RADIUS}
            outerRadius={OUTER_RADIUS}
            dataKey="spent"
            isAnimationActive={false}
            stroke="none"
            onMouseEnter={(_data, index) => {
              if (!hasData) return;
              const d = donutData[index];
              if (!d) return;
              setHovered({
                name: d.name,
                spent: d.spent,
                pct:
                  totalIncludedSpent > 0
                    ? (d.spent / totalIncludedSpent) * 100
                    : 0,
              });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={entry.color}
                opacity={
                  hovered
                    ? donutData[index]?.name === hovered.name
                      ? 1
                      : 0.3
                    : 1
                }
              />
            ))}
          </Pie>
          {/* Hide the built-in tooltip DOM; we render our own label below */}
          <Tooltip
            contentStyle={{ display: 'none' }}
            isAnimationActive={false}
          />
        </PieChart>

        {/* Center overlay — total included spent or "No data" */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {hasData ? (
            <>
              <Text
                style={{
                  ...chartValue,
                  color: theme.pageText,
                  lineHeight: '1.2',
                }}
              >
                {format(totalIncludedSpent, 'financial')}
              </Text>
              <Text
                style={{
                  ...caption,
                  color: theme.pageTextSubdued,
                  marginTop: 2,
                  textAlign: 'center',
                }}
              >
                <Trans>included</Trans>
              </Text>
            </>
          ) : (
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>No data</Trans>
            </Text>
          )}
        </View>
      </View>

      {/* Hover label — category name + amount + % shown below the chart */}
      <View
        style={{
          minHeight: 36,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 6,
        }}
      >
        {hovered ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text
              style={{
                ...chartValue,
                color: theme.pageText,
              }}
            >
              {hovered.name}
            </Text>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              {format(hovered.spent, 'financial')}
              {' · '}
              {hovered.pct < 0.1 ? '<0.1' : hovered.pct.toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
