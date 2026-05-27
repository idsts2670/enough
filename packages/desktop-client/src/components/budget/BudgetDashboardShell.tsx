import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowButtonRight1 } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import {
  bodySm,
  bodyStrong,
  caption,
  display2xl,
  metricSubtitle,
  metricTitle,
  metricValue,
  tableCellAmount,
  tabularFigure,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import { tsToRelativeTime } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { Locale } from 'date-fns';
import {
  Area,
  ComposedChart,
  Line,
  Tooltip as RechartsTooltip,
  YAxis,
} from 'recharts';
import type { DotItemDotProps } from 'recharts';

import {
  buildGradientId,
  useRechartsAnimation,
} from '#components/analytics/chart-theme';
import { ChartContainer } from '#components/analytics/ChartContainer';
import { createSpreadsheet as netWorthSpreadsheet } from '#components/analytics/net-worth-spreadsheet';
import { useAccounts } from '#hooks/useAccounts';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFailedAccounts } from '#hooks/useFailedAccounts';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { usePayees } from '#hooks/usePayees';
import { useSchedules } from '#hooks/useSchedules';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSpreadsheetReport } from '#hooks/useSpreadsheetReport';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { uncategorizedTransactions } from '#queries';
import { aqlQuery } from '#queries/aqlQuery';
import { useSelector } from '#redux';
import {
  accountBalance,
  envelopeBudget,
  trackingBudget,
} from '#spreadsheet/bindings';

import { getCategoryColor } from './categoryColors';

type BudgetDashboardShellProps = {
  budgetType: string;
  categoryGroups: CategoryGroupEntity[];
  onOpenBudgetEditor: () => void;
  startMonth: string;
};

type TopCategoryRow = {
  category: string | null;
  categoryName: string | null;
  categoryGroupName: string | null;
  categoryHidden: boolean | null;
  categoryGroupHidden: boolean | null;
  categoryIncome: boolean | null;
  accountOffBudget: boolean | null;
  amount: number | null;
};

type TopCategory = {
  id: string;
  name: string;
  amount: number;
  color: string;
  tint: string;
};

type ReviewTransactionRow = {
  id: string;
  date: string;
  amount: number;
  accountId: string | null;
  importedPayee: string | null;
  payeeName: string | null;
  accountName: string | null;
};

type NetWorthGraphPoint = {
  x: string;
  y: number;
  date?: string;
  networth?: string;
  assets?: string;
  debt?: string;
  change?: string;
};

type AccountGroupKey =
  | 'checking'
  | 'savings'
  | 'credit'
  | 'investment'
  | 'loan'
  | 'other';

type AccountGroup = {
  key: AccountGroupKey;
  title: string;
  color: string;
  tint: string;
  accounts: AccountEntity[];
};

type IncomeAllocationBucket = {
  groupId: string;
  percent: number;
};

type IncomeAllocationPrefs = {
  monthlyIncome: number;
  buckets: IncomeAllocationBucket[];
};

const incomeAllocationPrefKey = 'dashboard.incomeAllocation';

function matchesAny(text: string, words: string[]) {
  return words.some(word => text.includes(word));
}

function getAccountGroupKey(account: AccountEntity): AccountGroupKey {
  const text = [
    account.name,
    account.official_name,
    account.bankName,
    account.bank,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    matchesAny(text, [
      'credit',
      'card',
      'visa',
      'mastercard',
      'amex',
      'american express',
      'savor',
      'quicksilver',
      'venture',
      'freedom',
      'discover',
    ])
  ) {
    return 'credit';
  }

  if (
    matchesAny(text, [
      'saving',
      'money market',
      'cash reserve',
      'high yield',
      'hysa',
    ])
  ) {
    return 'savings';
  }

  if (
    matchesAny(text, [
      'investment',
      'brokerage',
      'ira',
      '401',
      'roth',
      'vanguard',
      'fidelity',
      'robinhood',
      'coinbase',
    ])
  ) {
    return 'investment';
  }

  if (matchesAny(text, ['loan', 'mortgage', 'student debt'])) {
    return 'loan';
  }

  if (matchesAny(text, ['checking', 'debit', 'cash'])) {
    return 'checking';
  }

  return account.offbudget ? 'other' : 'checking';
}

function getAccountGroupMeta(key: AccountGroupKey, t: (key: string) => string) {
  switch (key) {
    case 'checking':
      return {
        title: t('Checking'),
        color: theme.categoryIncome,
        tint: theme.categoryIncomeTint,
      };
    case 'savings':
      return {
        title: t('Savings'),
        color: theme.categorySavings,
        tint: theme.categorySavingsTint,
      };
    case 'credit':
      return {
        title: t('Credit cards'),
        color: theme.categoryDebt,
        tint: theme.categoryDebtTint,
      };
    case 'investment':
      return {
        title: t('Investments'),
        color: theme.categoryBills,
        tint: theme.categoryBillsTint,
      };
    case 'loan':
      return {
        title: t('Loans'),
        color: theme.categoryHousing,
        tint: theme.categoryHousingTint,
      };
    default:
      return {
        title: t('Other accounts'),
        color: theme.categoryPersonal,
        tint: theme.categoryPersonalTint,
      };
  }
}

function groupAccounts(
  accounts: AccountEntity[],
  t: (key: string) => string,
): AccountGroup[] {
  const groups = new Map<AccountGroupKey, AccountEntity[]>();
  const activeAccounts = accounts
    .filter(account => !account.closed)
    .sort((left, right) => left.sort_order - right.sort_order);

  for (const account of activeAccounts) {
    const key = getAccountGroupKey(account);
    groups.set(key, [...(groups.get(key) ?? []), account]);
  }

  const order: AccountGroupKey[] = [
    'checking',
    'savings',
    'credit',
    'investment',
    'loan',
    'other',
  ];

  return order.flatMap(key => {
    const groupedAccounts = groups.get(key);
    if (!groupedAccounts?.length) {
      return [];
    }

    const meta = getAccountGroupMeta(key, t);
    return [
      {
        key,
        ...meta,
        accounts: groupedAccounts,
      },
    ];
  });
}

function getExpenseCategoryGroups(categoryGroups: CategoryGroupEntity[]) {
  return categoryGroups.filter(
    group => !group.is_income && !group.hidden && !group.tombstone,
  );
}

function normalizeAllocationGroupName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findAllocationGroup(
  categoryGroups: CategoryGroupEntity[],
  candidates: string[],
) {
  const normalizedCandidates = candidates.map(normalizeAllocationGroupName);

  return getExpenseCategoryGroups(categoryGroups).find(group =>
    normalizedCandidates.includes(normalizeAllocationGroupName(group.name)),
  );
}

function createDefaultIncomeAllocation(
  categoryGroups: CategoryGroupEntity[],
): IncomeAllocationPrefs {
  return {
    monthlyIncome: 0,
    buckets: [
      {
        groupId: findAllocationGroup(categoryGroups, ['Fixed'])?.id,
        percent: 30,
      },
      {
        groupId: findAllocationGroup(categoryGroups, ['Fun'])?.id,
        percent: 30,
      },
      {
        groupId: findAllocationGroup(categoryGroups, ['Future Me', 'Future'])
          ?.id,
        percent: 40,
      },
    ].flatMap(bucket =>
      bucket.groupId
        ? [{ groupId: bucket.groupId, percent: bucket.percent }]
        : [],
    ),
  };
}

function parseIncomeAllocationPref(
  value: string | undefined,
  categoryGroups: CategoryGroupEntity[],
): IncomeAllocationPrefs {
  if (!value) {
    return createDefaultIncomeAllocation(categoryGroups);
  }

  try {
    const parsed = JSON.parse(value) as Partial<IncomeAllocationPrefs>;

    return {
      monthlyIncome:
        typeof parsed.monthlyIncome === 'number' &&
        Number.isFinite(parsed.monthlyIncome)
          ? Math.max(0, parsed.monthlyIncome)
          : 0,
      buckets: Array.isArray(parsed.buckets)
        ? parsed.buckets.flatMap(bucket => {
            if (
              !bucket ||
              typeof bucket.groupId !== 'string' ||
              typeof bucket.percent !== 'number' ||
              !Number.isFinite(bucket.percent)
            ) {
              return [];
            }

            return [
              {
                groupId: bucket.groupId,
                percent: Math.max(0, bucket.percent),
              },
            ];
          })
        : [],
    };
  } catch {
    return createDefaultIncomeAllocation(categoryGroups);
  }
}

function serializeIncomeAllocationPref(allocation: IncomeAllocationPrefs) {
  return JSON.stringify({
    monthlyIncome: allocation.monthlyIncome,
    buckets: allocation.buckets.map(bucket => ({
      groupId: bucket.groupId,
      percent: bucket.percent,
    })),
  });
}

function DashboardPanel({
  children,
  title,
  subtitle,
  accentColor,
}: {
  children: ReactNode;
  title: ReactNode;
  subtitle: string;
  accentColor?: string;
}) {
  return (
    <View
      style={{
        minHeight: 220,
        gap: 18,
        padding: 24,
        backgroundColor: theme.cardBackground,
        border: '1px solid ' + theme.cardBorder,
        borderRadius: 12,
        boxShadow: theme.cardShadow,
      }}
    >
      <View style={{ gap: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {accentColor && (
            <View
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 9999,
                backgroundColor: accentColor,
              }}
            />
          )}
          <Text style={{ ...metricTitle, color: theme.pageTextDark }}>
            {title}
          </Text>
        </View>
        <Text style={{ ...metricSubtitle, color: theme.pageTextSubdued }}>
          {subtitle}
        </Text>
      </View>
      {children}
    </View>
  );
}

function NetWorthSparkline({
  points,
  trendColor,
  onHover,
  onMouseLeave,
}: {
  points: NetWorthGraphPoint[];
  trendColor: string;
  onHover: (point: NetWorthGraphPoint) => void;
  onMouseLeave: () => void;
}) {
  const animProps = useRechartsAnimation();
  const gradId = buildGradientId('dashboard-networth', 'neutral');

  if (points.length < 2) {
    return (
      <View
        style={{
          height: 120,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ ...caption, color: theme.pageTextSubdued }}>
          <Trans>Not enough data</Trans>
        </Text>
      </View>
    );
  }

  const yValues = points
    .map(point => point.y)
    .filter(value => Number.isFinite(value));
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const yRange = maxY - minY;
  // Keep the lowest stroke inside the SVG clip area so flat sections do not render half-width.
  const yPadding = Math.max(yRange * 0.08, Math.abs(maxY) * 0.02, 1);
  const yDomain: [number, number] = [minY - yPadding, maxY + yPadding];
  const renderLatestDot = (dotProps: DotItemDotProps) => {
    if (
      dotProps.index !== points.length - 1 ||
      typeof dotProps.cx !== 'number' ||
      typeof dotProps.cy !== 'number'
    ) {
      return null;
    }

    return (
      <circle
        cx={dotProps.cx}
        cy={dotProps.cy}
        r={5}
        fill={theme.cardBackground}
        stroke={trendColor}
        strokeWidth={3}
      />
    );
  };

  return (
    <ChartContainer minHeight={120}>
      {({ width, height }) => (
        <ComposedChart
          width={width}
          height={height}
          data={points}
          onMouseLeave={onMouseLeave}
          margin={{ top: 4, right: 10, bottom: 0, left: 2 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={trendColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={yDomain} />
          <Area
            type="linear"
            dataKey="y"
            stroke="none"
            fill={`url(#${gradId})`}
            dot={false}
            {...animProps}
          />
          <Line
            type="linear"
            dataKey="y"
            stroke={trendColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            dot={renderLatestDot}
            activeDot={{
              r: 5,
              fill: theme.cardBackground,
              stroke: trendColor,
              strokeWidth: 3,
            }}
            {...animProps}
          />
          <RechartsTooltip
            contentStyle={{ display: 'none' }}
            isAnimationActive={false}
            cursor={{
              stroke: trendColor,
              strokeWidth: 1,
              strokeDasharray: '3 3',
              strokeOpacity: 0.4,
            }}
            labelFormatter={(label, items) => {
              const point = items[0]?.payload as NetWorthGraphPoint | undefined;
              if (point) onHover(point);
              return '';
            }}
          />
        </ComposedChart>
      )}
    </ChartContainer>
  );
}

function SpendingProgress({
  ariaLabel,
  color,
  label,
  progress,
}: {
  ariaLabel: string;
  color: string;
  label: ReactNode;
  progress: number;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View
      aria-label={ariaLabel}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clampedProgress * 100)}
      role="meter"
      style={{ gap: 8 }}
    >
      <View
        style={{
          alignSelf: 'flex-end',
          padding: '4px 8px',
          borderRadius: 8,
          backgroundColor: color,
        }}
      >
        <Text style={{ ...caption, ...tabularFigure, color: 'white' }}>
          {label}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          overflow: 'hidden',
          backgroundColor: theme.surfaceSubtle,
          borderRadius: 9999,
        }}
      >
        <View
          style={{
            width: `${clampedProgress * 100}%`,
            minWidth: progress > 0 ? 4 : 0,
            height: '100%',
            backgroundColor: color,
            borderRadius: 9999,
          }}
        />
      </View>
    </View>
  );
}

function MonthlySpendingCard({
  budgetType,
  monthLabel,
}: {
  budgetType: string;
  monthLabel: string;
}) {
  return budgetType === 'tracking' ? (
    <TrackingMonthlySpendingCard monthLabel={monthLabel} />
  ) : (
    <EnvelopeMonthlySpendingCard monthLabel={monthLabel} />
  );
}

function EnvelopeMonthlySpendingCard({ monthLabel }: { monthLabel: string }) {
  const format = useFormat();
  const spent =
    useSheetValue<'envelope-budget', 'total-spent'>(
      envelopeBudget.totalSpent,
    ) ?? 0;
  // envelope totalBudgeted is negated server-side (returns a negative number);
  // negate again to get a positive "how much you budgeted" value.
  const budgetedRaw =
    useSheetValue<'envelope-budget', 'total-budgeted'>(
      envelopeBudget.totalBudgeted,
    ) ?? 0;
  const budgeted = Math.abs(budgetedRaw);
  const progress = budgeted > 0 ? Math.abs(spent) / budgeted : 0;

  return (
    <MonthlySpendingContent
      budgeted={budgeted}
      monthLabel={monthLabel}
      progress={progress}
      spent={spent}
      spentDisplay={format(Math.abs(spent), 'financial')}
    />
  );
}

function TrackingMonthlySpendingCard({ monthLabel }: { monthLabel: string }) {
  const format = useFormat();
  const spent =
    useSheetValue<'tracking-budget', 'total-spent'>(
      trackingBudget.totalSpent,
    ) ?? 0;
  // tracking totalBudgetedExpense (total-budgeted) is positive; no negation needed.
  const budgeted = Math.abs(
    useSheetValue<'tracking-budget', 'total-budgeted'>(
      trackingBudget.totalBudgetedExpense,
    ) ?? 0,
  );
  const progress = budgeted > 0 ? Math.abs(spent) / budgeted : 0;

  return (
    <MonthlySpendingContent
      budgeted={budgeted}
      monthLabel={monthLabel}
      progress={progress}
      spent={spent}
      spentDisplay={format(Math.abs(spent), 'financial')}
    />
  );
}

function MonthlySpendingContent({
  budgeted,
  monthLabel,
  progress,
  spent,
  spentDisplay,
}: {
  budgeted: number;
  monthLabel: string;
  progress: number;
  spent: number;
  spentDisplay: string;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const remaining = budgeted - Math.abs(spent);
  const isOverBudget = remaining < 0;
  const progressColor = isOverBudget
    ? theme.semanticError
    : theme.semanticSuccess;
  const remainingDisplay = format(Math.abs(remaining), 'financial');
  const graphLabel = isOverBudget
    ? t('{{amount}} over', { amount: remainingDisplay })
    : t('{{amount}} left', { amount: remainingDisplay });

  return (
    <DashboardPanel
      title={<Trans>Monthly Spending</Trans>}
      subtitle={monthLabel}
      accentColor={progressColor}
    >
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ ...metricValue, color: theme.pageText }}>
            {spentDisplay}
          </Text>
          <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
            <Trans>spent this month</Trans>
          </Text>
        </View>
        <SpendingProgress
          ariaLabel={graphLabel}
          color={progressColor}
          label={graphLabel}
          progress={progress}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Budgeted</Trans>
            </Text>
            <Text
              style={{ ...bodyStrong, ...tabularFigure, color: theme.pageText }}
            >
              {format(budgeted, 'financial')}
            </Text>
          </View>
          <View style={{ gap: 2, alignItems: 'flex-end' }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              {isOverBudget ? (
                <Trans>Over budget</Trans>
              ) : (
                <Trans>Remaining</Trans>
              )}
            </Text>
            <Text
              style={{ ...bodyStrong, ...tabularFigure, color: theme.pageText }}
            >
              {remainingDisplay}
            </Text>
          </View>
        </View>
      </View>
    </DashboardPanel>
  );
}

function NetWorthDashboardCard({ budgetMonth }: { budgetMonth: string }) {
  const locale = useLocale();
  const format = useFormat();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const currentMonth = monthUtils.currentMonth();
  const reportEndMonth = monthUtils.isAfter(budgetMonth, currentMonth)
    ? currentMonth
    : budgetMonth;
  const reportStartMonth = monthUtils.subMonths(reportEndMonth, 5);
  const subtitle = `${monthUtils.format(
    reportStartMonth,
    'MMM yyyy',
    locale,
  )} - ${monthUtils.format(reportEndMonth, 'MMM yyyy', locale)}`;

  const params = useMemo(
    () =>
      netWorthSpreadsheet(
        reportStartMonth,
        reportEndMonth,
        accounts,
        [],
        'and',
        locale,
        'Monthly',
        firstDayOfWeekIdx,
        format,
      ),
    [
      accounts,
      firstDayOfWeekIdx,
      format,
      locale,
      reportEndMonth,
      reportStartMonth,
    ],
  );
  const data = useSpreadsheetReport('dashboard_net_worth', params);
  const isLoading = accountsLoading || data == null;
  const graphData = data?.graphData.data ?? [];
  const totalChange = data?.totalChange ?? 0;
  const trendColor =
    totalChange < 0
      ? theme.semanticError
      : totalChange > 0
        ? theme.semanticSuccess
        : theme.pageTextSubdued;

  const [hovered, setHovered] = useState<NetWorthGraphPoint | null>(null);

  const displayNetWorthStr = hovered?.networth
    ? hovered.networth
    : format(data?.netWorth ?? 0, 'financial');

  const displayDate = hovered?.date ?? null;

  const displayChange = hovered
    ? hovered.y - (graphData[0]?.y ?? 0)
    : totalChange;

  const displayTrendColor =
    displayChange < 0
      ? theme.semanticError
      : displayChange > 0
        ? theme.semanticSuccess
        : theme.pageTextSubdued;

  const displayTrendTint =
    displayChange < 0
      ? theme.semanticErrorSoft
      : displayChange > 0
        ? theme.semanticSuccessSoft
        : theme.surfaceSubtle;

  const changeDisplay =
    displayChange > 0
      ? `+${format(displayChange, 'financial')}`
      : format(displayChange, 'financial');

  // Point shown in assets/debt breakdown — hovered point or latest
  const displayPoint =
    hovered ?? (graphData.length > 0 ? graphData[graphData.length - 1] : null);

  return (
    <DashboardPanel
      title={<Trans>Net Worth</Trans>}
      subtitle={subtitle}
      accentColor={trendColor}
    >
      {isLoading ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>Loading</Trans>
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {/* Metric row: large net worth + change badge */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ gap: 2 }}>
              <Text style={{ ...metricValue, color: theme.pageText }}>
                {displayNetWorthStr}
              </Text>
              <Text style={{ ...caption, color: theme.pageTextSubdued }}>
                {displayDate ?? <Trans>current net worth</Trans>}
              </Text>
            </View>
            <Text
              style={{
                ...bodyStrong,
                ...tabularFigure,
                color: displayTrendColor,
                textAlign: 'right',
                padding: '3px 8px',
                borderRadius: 9999,
                backgroundColor: displayTrendTint,
                flexShrink: 0,
              }}
            >
              {changeDisplay}
            </Text>
          </View>

          {/* Recharts area chart */}
          <NetWorthSparkline
            points={graphData}
            trendColor={trendColor}
            onHover={setHovered}
            onMouseLeave={() => setHovered(null)}
          />

          {/* Assets / Debt breakdown */}
          {displayPoint?.assets && (
            <View
              style={{
                flexDirection: 'row',
                gap: 16,
                paddingTop: 8,
                borderTop: `1px solid ${theme.tableBorder}`,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...caption, color: theme.pageTextSubdued }}>
                  <Trans>Assets</Trans>
                </Text>
                <Text
                  style={{
                    ...bodySm,
                    color: theme.semanticSuccess,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {displayPoint.assets}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...caption, color: theme.pageTextSubdued }}>
                  <Trans>Debt</Trans>
                </Text>
                <Text
                  style={{
                    ...bodySm,
                    color: theme.semanticError,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {displayPoint.debt}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </DashboardPanel>
  );
}

function useTopCategories({
  categoryGroups,
  startMonth,
}: {
  categoryGroups: CategoryGroupEntity[];
  startMonth: string;
}) {
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categoryFallback = useMemo(() => {
    return new Map(
      categoryGroups.flatMap(group =>
        (group.categories ?? []).map(category => [
          category.id,
          {
            categoryName: category.name,
            groupName: group.name,
          },
        ]),
      ),
    );
  }, [categoryGroups]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    void aqlQuery(
      q('transactions')
        .filter({
          $and: [
            { date: { $transform: '$month', $eq: startMonth } },
            { amount: { $lt: 0 } },
          ],
        })
        .groupBy([{ $id: '$category.id' }])
        .select([
          { category: { $id: '$category.id' } },
          { categoryName: { $id: '$category.name' } },
          { categoryGroupName: { $id: '$category.group.name' } },
          { categoryHidden: { $id: '$category.hidden' } },
          { categoryGroupHidden: { $id: '$category.group.hidden' } },
          { categoryIncome: { $id: '$category.is_income' } },
          { accountOffBudget: { $id: '$account.offbudget' } },
          { amount: { $sum: '$amount' } },
        ]),
    )
      .then(({ data }: { data: TopCategoryRow[] }) => {
        if (!isCurrent) {
          return;
        }

        const categories = data
          .filter(
            row =>
              row.category &&
              !row.categoryHidden &&
              !row.categoryGroupHidden &&
              !row.categoryIncome &&
              !row.accountOffBudget &&
              row.amount,
          )
          .map(row => {
            const fallback = categoryFallback.get(row.category ?? '');
            const groupName =
              row.categoryGroupName ?? fallback?.groupName ?? 'Personal';
            const categoryName =
              row.categoryName ?? fallback?.categoryName ?? row.category ?? '';
            const color = getCategoryColor(groupName, categoryName);

            return {
              id: row.category ?? '',
              name: categoryName,
              amount: Math.abs(row.amount ?? 0),
              color: color.color,
              tint: color.tint,
            };
          })
          .sort((left, right) => right.amount - left.amount)
          .slice(0, 5);

        setTopCategories(categories);
      })
      .catch(() => {
        if (isCurrent) {
          setTopCategories([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [categoryFallback, startMonth]);

  return { isLoading, topCategories };
}

function useTransactionsToReview() {
  const [transactions, setTransactions] = useState<ReviewTransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    void aqlQuery(
      uncategorizedTransactions()
        .options({ splits: 'none' })
        .orderBy([{ date: 'desc' }, { id: 'desc' }])
        .limit(5)
        .select([
          'id',
          'date',
          'amount',
          { accountId: 'account.id' },
          { importedPayee: 'imported_payee' },
          { payeeName: 'payee.name' },
          { accountName: 'account.name' },
        ]),
    )
      .then(({ data }: { data: ReviewTransactionRow[] }) => {
        if (isCurrent) {
          setTransactions(data);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setTransactions([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return { isLoading, transactions };
}

function TransactionsToReviewCard() {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const navigate = useNavigate();
  const { isLoading, transactions } = useTransactionsToReview();
  const subtitle = isLoading
    ? t('Pending review')
    : t('{{count}} pending', { count: transactions.length });

  return (
    <DashboardPanel
      title={<Trans>Transactions to Review</Trans>}
      subtitle={subtitle}
    >
      {isLoading ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>Loading</Trans>
        </Text>
      ) : transactions.length === 0 ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>No uncategorized transactions</Trans>
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {transactions.map(transaction => {
            const payee =
              transaction.payeeName ??
              transaction.importedPayee ??
              t('Unknown payee');

            return (
              <Button
                key={transaction.id}
                variant="bare"
                aria-label={t('Review {{payee}}', { payee })}
                onPress={() =>
                  navigate('/accounts', {
                    state: {
                      goBack: true,
                      filterConditions: [
                        {
                          field: 'id',
                          op: 'is',
                          value: transaction.id,
                          type: 'id',
                        },
                      ],
                    },
                  })
                }
                style={{
                  width: '100%',
                  minHeight: 0,
                  justifyContent: 'stretch',
                  padding: 0,
                  color: theme.pageText,
                }}
              >
                <View
                  style={{
                    minWidth: 0,
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: theme.surfaceSubtle,
                  }}
                >
                  <View
                    style={{
                      minWidth: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        flexShrink: 0,
                        borderRadius: 9999,
                        backgroundColor:
                          transaction.amount < 0
                            ? theme.semanticError
                            : theme.semanticSuccess,
                      }}
                    />
                    <View style={{ minWidth: 0, gap: 2 }}>
                      <Text
                        title={payee}
                        style={{
                          ...bodyStrong,
                          minWidth: 0,
                          color: theme.pageText,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {payee}
                      </Text>
                      <Text
                        title={transaction.accountName ?? undefined}
                        style={{
                          ...caption,
                          minWidth: 0,
                          color: theme.pageTextSubdued,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {monthUtils.format(transaction.date, 'MMM d', locale)}
                        {transaction.accountName
                          ? ` - ${transaction.accountName}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ ...tableCellAmount, color: theme.pageText }}>
                      {format(transaction.amount, 'financial')}
                    </Text>
                    <Text
                      style={{
                        ...caption,
                        color: theme.semanticInfo,
                        padding: '2px 7px',
                        borderRadius: 9999,
                        backgroundColor: theme.semanticInfoSoft,
                      }}
                    >
                      <Trans>Needs category</Trans>
                    </Text>
                  </View>
                </View>
              </Button>
            );
          })}
        </View>
      )}
    </DashboardPanel>
  );
}

function RecurringsCard() {
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const today = monthUtils.currentDay();
  const endDate = monthUtils.addDays(today, 14);
  const schedulesQuery = useMemo(
    () =>
      q('schedules')
        .select('*')
        .filter({
          $and: [
            { next_date: { $gte: today } },
            { next_date: { $lte: endDate } },
            { completed: false },
            { '_account.closed': false },
          ],
        })
        .orderBy({ next_date: 'asc' })
        .limit(5),
    [endDate, today],
  );
  const { isLoading, schedules, statuses } = useSchedules({
    query: schedulesQuery,
  });
  const { data: accounts = [] } = useAccounts();
  const { data: payees = [] } = usePayees();
  const accountNames = useMemo(
    () => new Map(accounts.map(account => [account.id, account.name])),
    [accounts],
  );
  const payeeNames = useMemo(
    () => new Map(payees.map(payee => [payee.id, payee.name])),
    [payees],
  );

  const formatScheduleAmount = (schedule: ScheduleEntity) => {
    const amount = getScheduledAmount(schedule._amount);
    const prefix =
      schedule._amountOp === 'isapprox' || schedule._amountOp === 'isbetween'
        ? '~'
        : '';
    const sign = amount > 0 ? '+' : '';

    return `${prefix}${sign}${format(Math.abs(amount || 0), 'financial')}`;
  };

  return (
    <DashboardPanel
      title={<Trans>Recurrings</Trans>}
      subtitle={t('Next 14 days')}
    >
      {isLoading ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>Loading</Trans>
        </Text>
      ) : schedules.length === 0 ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>No scheduled payments in the next 14 days</Trans>
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {schedules.map(schedule => {
            const payee =
              payeeNames.get(schedule._payee) ??
              schedule.name ??
              t('Unnamed schedule');
            const account = accountNames.get(schedule._account);
            const status = statuses.get(schedule.id) ?? 'scheduled';

            return (
              <Button
                key={schedule.id}
                variant="bare"
                aria-label={t('View schedule {{name}}', { name: payee })}
                onPress={() => navigate('/schedules')}
                style={{
                  width: '100%',
                  minHeight: 0,
                  justifyContent: 'stretch',
                  padding: 0,
                  color: theme.pageText,
                }}
              >
                <View
                  style={{
                    minWidth: 0,
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <View style={{ minWidth: 0, gap: 2 }}>
                    <Text
                      title={payee}
                      style={{
                        ...bodyStrong,
                        minWidth: 0,
                        color: theme.pageText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {payee}
                    </Text>
                    <Text
                      title={account}
                      style={{
                        ...caption,
                        minWidth: 0,
                        color: theme.pageTextSubdued,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {monthUtils.format(schedule.next_date, dateFormat)}
                      {account ? ` - ${account}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ ...tableCellAmount, color: theme.pageText }}>
                      {formatScheduleAmount(schedule)}
                    </Text>
                    <Text
                      style={{
                        ...caption,
                        color:
                          status === 'due' || status === 'missed'
                            ? theme.warningTextDark
                            : theme.pageTextSubdued,
                      }}
                    >
                      {status === 'due' || status === 'missed' ? (
                        <Trans>Due now</Trans>
                      ) : (
                        <Trans>Scheduled</Trans>
                      )}
                    </Text>
                  </View>
                </View>
              </Button>
            );
          })}
        </View>
      )}
    </DashboardPanel>
  );
}

function TopCategoriesCard({
  categoryGroups,
  monthLabel,
  startMonth,
}: {
  categoryGroups: CategoryGroupEntity[];
  monthLabel: string;
  startMonth: string;
}) {
  const format = useFormat();
  const { isLoading, topCategories } = useTopCategories({
    categoryGroups,
    startMonth,
  });
  const maxAmount = topCategories[0]?.amount ?? 0;

  return (
    <DashboardPanel
      title={<Trans>Top Categories</Trans>}
      subtitle={monthLabel}
      accentColor={topCategories[0]?.color}
    >
      {isLoading ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>Loading</Trans>
        </Text>
      ) : topCategories.length === 0 ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>No category spending yet</Trans>
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {topCategories.map(category => (
            <View
              key={category.id}
              style={{
                gap: 8,
                padding: 8,
                borderRadius: 8,
                backgroundColor: category.tint,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    minWidth: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      flexShrink: 0,
                      backgroundColor: category.color,
                      borderRadius: 9999,
                    }}
                  />
                  <Text
                    title={category.name}
                    style={{
                      ...bodyStrong,
                      minWidth: 0,
                      color: theme.pageText,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {category.name}
                  </Text>
                </View>
                <Text style={{ ...tableCellAmount, color: theme.pageText }}>
                  {format(category.amount, 'financial')}
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  overflow: 'hidden',
                  backgroundColor: theme.surfaceSubtle,
                  borderRadius: 9999,
                }}
              >
                <View
                  style={{
                    width: `${
                      maxAmount > 0 ? (category.amount / maxAmount) * 100 : 0
                    }%`,
                    minWidth: category.amount > 0 ? 5 : 0,
                    height: '100%',
                    backgroundColor: category.color,
                    borderRadius: 9999,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </DashboardPanel>
  );
}

function AccountBalanceValue({
  accountId,
}: {
  accountId: AccountEntity['id'];
}) {
  const format = useFormat();
  const balance = useSheetValue<'account', 'balance'>(
    accountBalance(accountId),
  );

  return (
    <Text style={{ ...tableCellAmount, color: theme.pageText }}>
      {format(balance ?? 0, 'financial')}
    </Text>
  );
}

function AccountSummaryRow({
  account,
  color,
  failed,
  locale,
  syncing,
  updated,
}: {
  account: AccountEntity;
  color: string;
  failed: boolean;
  locale: Locale;
  syncing: boolean;
  updated: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const statusColor = failed
    ? theme.semanticError
    : syncing
      ? theme.semanticInfo
      : updated
        ? theme.semanticInfo
        : account.account_sync_source
          ? theme.semanticSuccess
          : theme.pageTextSubdued;
  const statusLabel = failed
    ? t('Sync failed')
    : syncing
      ? t('Syncing')
      : updated
        ? t('New activity')
        : account.account_sync_source
          ? t('Last synced {{time}}', {
              time: tsToRelativeTime(account.last_sync, locale),
            })
          : t('Manual');

  return (
    <Button
      variant="bare"
      onPress={() => navigate(`/accounts/${account.id}`)}
      style={{
        width: '100%',
        minHeight: 0,
        justifyContent: 'stretch',
        padding: 0,
        color: theme.pageText,
      }}
    >
      <View
        style={{
          width: '100%',
          minWidth: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          padding: 8,
          borderRadius: 8,
          backgroundColor: theme.surfaceSubtle,
        }}
      >
        <View
          style={{
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <View
            aria-hidden
            style={{
              width: 7,
              height: 7,
              flexShrink: 0,
              backgroundColor: color,
              borderRadius: 9999,
            }}
          />
          <View style={{ minWidth: 0, gap: 2 }}>
            <Text
              title={account.name}
              style={{
                ...bodyStrong,
                minWidth: 0,
                color: theme.pageText,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {account.name}
            </Text>
            <Text
              style={{
                ...caption,
                minWidth: 0,
                color: statusColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <AccountBalanceValue accountId={account.id} />
      </View>
    </Button>
  );
}

function AccountsSummaryCard() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data: accounts = [], isLoading } = useAccounts();
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const updatedAccountIds = useSelector(state => state.account.updatedAccounts);
  const groups = useMemo(() => groupAccounts(accounts, t), [accounts, t]);
  const activeCount = groups.reduce(
    (count, group) => count + group.accounts.length,
    0,
  );

  return (
    <DashboardPanel
      title={<Trans>Accounts</Trans>}
      subtitle={
        isLoading ? t('Loading') : t('{{count}} active', { count: activeCount })
      }
      accentColor={theme.semanticInfo}
    >
      {isLoading ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>Loading</Trans>
        </Text>
      ) : activeCount === 0 ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>No active accounts</Trans>
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {groups.map(group => (
            <View key={group.key} style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    aria-hidden
                    style={{
                      width: 7,
                      height: 7,
                      flexShrink: 0,
                      borderRadius: 9999,
                      backgroundColor: group.color,
                    }}
                  />
                  <Text style={{ ...bodyStrong, color: theme.pageText }}>
                    {group.title}
                  </Text>
                </View>
                <Text style={{ ...caption, color: theme.pageTextSubdued }}>
                  {group.accounts.length === 1
                    ? t('1 account')
                    : t('{{count}} accounts', {
                        count: group.accounts.length,
                      })}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {group.accounts.map(account => (
                  <AccountSummaryRow
                    key={account.id}
                    account={account}
                    color={group.color}
                    failed={failedAccounts.has(account.id)}
                    locale={locale}
                    syncing={syncingAccountIds.includes(account.id)}
                    updated={updatedAccountIds.includes(account.id)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </DashboardPanel>
  );
}

function IncomeAllocationBucketRow({
  allocation,
  availableGroups,
  bucket,
  budgetType,
  disabledGroupIds,
  group,
  onChangeGroup,
  onChangePercent,
  onRemove,
}: {
  allocation: IncomeAllocationPrefs;
  availableGroups: CategoryGroupEntity[];
  bucket: IncomeAllocationBucket;
  budgetType: string;
  disabledGroupIds: string[];
  group?: CategoryGroupEntity;
  onChangeGroup: (groupId: string) => void;
  onChangePercent: (percent: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const envelopeSpent =
    useSheetValue<'envelope-budget', 'group-sum-amount'>(
      envelopeBudget.groupSumAmount(bucket.groupId),
    ) ?? 0;
  const trackingSpent =
    useSheetValue<'tracking-budget', 'group-sum-amount'>(
      trackingBudget.groupSumAmount(bucket.groupId),
    ) ?? 0;
  const spent = Math.abs(
    budgetType === 'tracking' ? trackingSpent : envelopeSpent,
  );
  const target = Math.round((allocation.monthlyIncome * bucket.percent) / 100);
  const variance = target - spent;
  const isOver = variance < 0;
  const progress = target > 0 ? Math.min(spent / target, 1) : 0;
  const color = group
    ? getCategoryColor(group.name).color
    : theme.pageTextSubdued;
  const groupOptions = availableGroups.map(
    availableGroup => [availableGroup.id, availableGroup.name] as const,
  );

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(180px, 1.4fr) 96px minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 72px',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderTop: '1px solid ' + theme.cardBorder,
        [`@media (max-width: ${tokens.breakpoint_medium})`]: {
          gridTemplateColumns: '1fr',
          alignItems: 'stretch',
        },
      }}
    >
      <Select
        options={groupOptions}
        value={bucket.groupId}
        defaultLabel={t('Missing group')}
        disabledKeys={disabledGroupIds}
        onChange={onChangeGroup}
        style={{
          minHeight: 34,
          padding: '6px 10px',
          color: theme.pageText,
        }}
      />
      <Input
        aria-label={t('Allocation percent for {{name}}', {
          name: group?.name ?? t('missing group'),
        })}
        inputMode="decimal"
        value={String(bucket.percent)}
        onChangeValue={value => {
          const nextValue = Number(value);
          onChangePercent(Number.isFinite(nextValue) ? nextValue : 0);
        }}
        style={{
          minHeight: 34,
          padding: '6px 10px',
          textAlign: 'right',
        }}
      />
      <Text style={{ ...bodyStrong, ...tabularFigure, color: theme.pageText }}>
        {format(target, 'financial')}
      </Text>
      <View style={{ gap: 6 }}>
        <Text
          style={{ ...bodyStrong, ...tabularFigure, color: theme.pageText }}
        >
          {format(spent, 'financial')}
        </Text>
        <View
          aria-hidden
          style={{
            height: 5,
            overflow: 'hidden',
            borderRadius: 9999,
            backgroundColor: theme.surfaceSubtle,
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              minWidth: spent > 0 ? 5 : 0,
              height: '100%',
              borderRadius: 9999,
              backgroundColor: isOver ? theme.semanticError : color,
            }}
          />
        </View>
      </View>
      <Text
        style={{
          ...bodyStrong,
          ...tabularFigure,
          color: isOver ? theme.semanticError : theme.semanticSuccess,
        }}
      >
        {isOver
          ? t('{{amount}} over', {
              amount: format(Math.abs(variance), 'financial'),
            })
          : t('{{amount}} under', {
              amount: format(variance, 'financial'),
            })}
      </Text>
      <Button
        variant="bare"
        aria-label={t('Remove {{name}} allocation', {
          name: group?.name ?? t('missing group'),
        })}
        onPress={onRemove}
        style={{
          minHeight: 0,
          justifyContent: 'flex-end',
          padding: 0,
          color: theme.pageTextSubdued,
        }}
      >
        <Trans>Remove</Trans>
      </Button>
    </View>
  );
}

function IncomeAllocationPanel({
  budgetType,
  categoryGroups,
  monthLabel,
}: {
  budgetType: string;
  categoryGroups: CategoryGroupEntity[];
  monthLabel: string;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const [storedAllocation, setStoredAllocation] = useSyncedPref(
    incomeAllocationPrefKey,
  );
  const availableGroups = useMemo(
    () => getExpenseCategoryGroups(categoryGroups),
    [categoryGroups],
  );
  const parsedAllocation = useMemo(
    () => parseIncomeAllocationPref(storedAllocation, categoryGroups),
    [categoryGroups, storedAllocation],
  );
  const [allocation, setAllocation] = useState(parsedAllocation);
  const [incomeDraft, setIncomeDraft] = useState(
    parsedAllocation.monthlyIncome
      ? format.forEdit(parsedAllocation.monthlyIncome)
      : '',
  );

  useEffect(() => {
    setAllocation(parsedAllocation);
    setIncomeDraft(
      parsedAllocation.monthlyIncome
        ? format.forEdit(parsedAllocation.monthlyIncome)
        : '',
    );
  }, [format, parsedAllocation]);

  const groupsById = useMemo(
    () => new Map(categoryGroups.map(group => [group.id, group])),
    [categoryGroups],
  );
  const percentTotal = allocation.buckets.reduce(
    (total, bucket) => total + bucket.percent,
    0,
  );
  const hasInvalidTotal = Math.abs(percentTotal - 100) > 0.001;
  const hasMissingGroups = allocation.buckets.some(
    bucket => !groupsById.has(bucket.groupId),
  );
  const hasStoredAllocation = Boolean(storedAllocation);
  const isDirty =
    !hasStoredAllocation ||
    serializeIncomeAllocationPref(allocation) !==
      serializeIncomeAllocationPref(parsedAllocation);
  const usedGroupIds = allocation.buckets.map(bucket => bucket.groupId);
  const nextAvailableGroup = availableGroups.find(
    group => !usedGroupIds.includes(group.id),
  );

  function updateBucket(
    index: number,
    update: Partial<IncomeAllocationBucket>,
  ) {
    setAllocation(current => ({
      ...current,
      buckets: current.buckets.map((bucket, bucketIndex) =>
        bucketIndex === index ? { ...bucket, ...update } : bucket,
      ),
    }));
  }

  function saveAllocation() {
    const parsedIncome = format.fromEdit(incomeDraft, allocation.monthlyIncome);
    const nextAllocation = {
      ...allocation,
      monthlyIncome: Math.max(0, parsedIncome ?? 0),
    };

    setAllocation(nextAllocation);
    setStoredAllocation(serializeIncomeAllocationPref(nextAllocation));
  }

  return (
    <DashboardPanel
      title={<Trans>Manage Your Money Like The 1%</Trans>}
      subtitle={monthLabel}
      accentColor={theme.semanticInfo}
    >
      <View style={{ gap: 16 }}>
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 320px) 1fr',
            gap: 16,
            alignItems: 'end',
            [`@media (max-width: ${tokens.breakpoint_medium})`]: {
              gridTemplateColumns: '1fr',
            },
          }}
        >
          <View style={{ gap: 6 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Expected monthly income</Trans>
            </Text>
            <Input
              aria-label={t('Expected monthly income')}
              inputMode="decimal"
              placeholder={format(0, 'financial')}
              value={incomeDraft}
              onChangeValue={value => {
                setIncomeDraft(value);
                const parsedIncome = format.fromEdit(value, null);
                if (parsedIncome !== null) {
                  setAllocation(current => ({
                    ...current,
                    monthlyIncome: Math.max(0, parsedIncome),
                  }));
                }
              }}
              style={{
                minHeight: 38,
                padding: '8px 10px',
              }}
            />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ ...bodyStrong, color: theme.pageText }}>
              <Trans>Allocate income across your highest-level buckets.</Trans>
            </Text>
            <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
              <Trans>
                Targets are calculated from your manual income setting. Actuals
                come from this month&apos;s category group spending.
              </Trans>
            </Text>
          </View>
        </View>

        <View
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(180px, 1.4fr) 96px minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 72px',
            gap: 10,
            color: theme.pageTextSubdued,
            [`@media (max-width: ${tokens.breakpoint_medium})`]: {
              display: 'none',
            },
          }}
        >
          <Text style={caption}>
            <Trans>Bucket</Trans>
          </Text>
          <Text style={{ ...caption, textAlign: 'right' }}>
            <Trans>Percent</Trans>
          </Text>
          <Text style={caption}>
            <Trans>Target</Trans>
          </Text>
          <Text style={caption}>
            <Trans>Spent</Trans>
          </Text>
          <Text style={caption}>
            <Trans>Status</Trans>
          </Text>
          <View />
        </View>

        <View>
          {allocation.buckets.map((bucket, index) => {
            const group = groupsById.get(bucket.groupId);
            const disabledGroupIds = usedGroupIds.filter(
              groupId => groupId !== bucket.groupId,
            );

            return (
              <IncomeAllocationBucketRow
                key={`${bucket.groupId}-${index}`}
                allocation={allocation}
                availableGroups={availableGroups}
                bucket={bucket}
                budgetType={budgetType}
                disabledGroupIds={disabledGroupIds}
                group={group}
                onChangeGroup={groupId => updateBucket(index, { groupId })}
                onChangePercent={percent =>
                  updateBucket(index, { percent: Math.max(0, percent) })
                }
                onRemove={() =>
                  setAllocation(current => ({
                    ...current,
                    buckets: current.buckets.filter(
                      (_, bucketIndex) => bucketIndex !== index,
                    ),
                  }))
                }
              />
            );
          })}
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={{
                ...bodyStrong,
                color:
                  hasInvalidTotal || hasMissingGroups
                    ? theme.semanticError
                    : theme.pageText,
              }}
            >
              {t('Total allocation: {{percent}}%', {
                percent: percentTotal.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }),
              })}
            </Text>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              {hasMissingGroups ? (
                <Trans>One or more saved groups no longer exists.</Trans>
              ) : hasInvalidTotal ? (
                <Trans>Allocation must equal 100% before saving.</Trans>
              ) : !hasStoredAllocation ? (
                <Trans>Default allocation rule. Save to keep it.</Trans>
              ) : isDirty ? (
                <Trans>Unsaved allocation changes.</Trans>
              ) : (
                <Trans>Allocation rule saved.</Trans>
              )}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="normal"
              isDisabled={!nextAvailableGroup}
              onPress={() => {
                if (!nextAvailableGroup) {
                  return;
                }

                setAllocation(current => ({
                  ...current,
                  buckets: [
                    ...current.buckets,
                    { groupId: nextAvailableGroup.id, percent: 0 },
                  ],
                }));
              }}
            >
              <Trans>Add bucket</Trans>
            </Button>
            <Button
              variant="normal"
              onPress={() => navigate('/schedules?view=manual')}
            >
              <Trans>Manual entries</Trans>
            </Button>
            <Button
              variant="primary"
              isDisabled={hasInvalidTotal || hasMissingGroups || !isDirty}
              onPress={saveAllocation}
            >
              <Trans>Save allocation</Trans>
            </Button>
          </View>
        </View>
      </View>
    </DashboardPanel>
  );
}

type SavingsAdvisorData = Awaited<
  ReturnType<typeof send<'ai/savings-advisor'>>
>;
type SavingsAdvisorChatData = Awaited<
  ReturnType<typeof send<'ai/savings-advisor-chat'>>
>;
type SavingsAdvisorChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function SavingsAdvisorLocalBadge({ model }: { model: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        padding: '3px 8px',
        borderRadius: 9999,
        backgroundColor: theme.chatSuccessSoft,
      }}
    >
      <View
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          backgroundColor: theme.chatSuccess,
        }}
      />
      <Text style={{ ...caption, color: theme.chatSuccess }}>
        {model} <Trans>local</Trans>
      </Text>
    </View>
  );
}

function SavingsAdvisorMessageBubble({
  index,
  message,
}: {
  index: number;
  message: SavingsAdvisorChatMessage;
}) {
  const isUser = message.role === 'user';

  return (
    <View
      style={{
        maxWidth: '88%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        padding: '8px 10px',
        borderRadius: 10,
        backgroundColor: isUser
          ? theme.chatUserAccentSoft
          : index === 0
            ? theme.chatAdvisorAccentSoft
            : theme.chatNeutralSubtle,
      }}
    >
      <Text
        style={{
          ...bodySm,
          color: theme.chatTextPrimary,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.content}
      </Text>
    </View>
  );
}

function SavingsAdvisorCard({ month }: { month: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<SavingsAdvisorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<SavingsAdvisorChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatError, setChatError] = useState<SavingsAdvisorChatData['error']>();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const modelLabel = 'qwen3:4b';
  const suggestedQuestions = [
    t('Where can I save?'),
    t('What changed this month?'),
    t('What should I review?'),
  ];

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const nextData = await send('ai/savings-advisor', { month });
        if (!isCancelled) {
          setData(nextData);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [month]);

  useEffect(() => {
    setMessages([]);
    setDraft('');
    setChatError(undefined);
    setIsChatLoading(false);
  }, [month]);

  async function sendMessage(content: string) {
    const trimmedContent = content.trim();
    if (!trimmedContent || isChatLoading) {
      return;
    }

    const nextMessages: SavingsAdvisorChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmedContent },
    ];

    setMessages(nextMessages);
    setDraft('');
    setChatError(undefined);
    setIsChatLoading(true);

    try {
      const result = await send('ai/savings-advisor-chat', {
        month,
        messages: nextMessages,
      });

      if (result.reply) {
        setMessages([
          ...nextMessages,
          { role: 'assistant', content: result.reply },
        ]);
      } else {
        setChatError(result.error ?? 'unavailable');
      }
    } catch {
      setChatError('unavailable');
    } finally {
      setIsChatLoading(false);
    }
  }

  return (
    <DashboardPanel
      title={<Trans>Savings advisor</Trans>}
      subtitle={t('Local AI summary and chat')}
      accentColor={theme.semanticInfo}
    >
      {isLoading && !data ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>Computing metrics</Trans>
        </Text>
      ) : !data ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          <Trans>No savings insight yet</Trans>
        </Text>
      ) : (
        <View style={{ gap: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Text
              style={{
                ...bodyStrong,
                color: theme.pageText,
                flex: 1,
                minWidth: 0,
              }}
            >
              {data.response.summary}
            </Text>
            <SavingsAdvisorLocalBadge model={modelLabel} />
          </View>

          <View style={{ gap: 8 }}>
            {data.response.topActions.slice(0, 2).map(action => (
              <View
                key={`${action.title}-${action.impactEstimate}`}
                style={{
                  gap: 4,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: theme.chatNeutralSubtle,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <Text style={{ ...bodyStrong, color: theme.pageText }}>
                    {action.title}
                  </Text>
                  <Text style={{ ...caption, color: theme.semanticSuccess }}>
                    {action.impactEstimate}
                  </Text>
                </View>
                <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
                  {action.reason}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {suggestedQuestions.map(question => (
              <Button
                key={question}
                variant="normal"
                isDisabled={isChatLoading}
                onPress={() => sendMessage(question)}
                style={{
                  minHeight: 30,
                  padding: '6px 10px',
                  borderRadius: 9999,
                  border: `1px solid ${theme.chatNeutralBorder}`,
                  backgroundColor: theme.chatNeutralSurface,
                  color: theme.chatAdvisorAccentDeep,
                }}
              >
                {question}
              </Button>
            ))}
          </View>

          {(messages.length > 0 || isChatLoading) && (
            <View
              style={{
                minHeight: 112,
                maxHeight: 220,
                gap: 8,
                padding: 10,
                overflowY: 'auto',
                borderRadius: 10,
                backgroundColor: theme.chatNeutralPale,
                border: `1px solid ${theme.chatNeutralBorder}`,
              }}
            >
              {messages.map((message, index) => (
                <SavingsAdvisorMessageBubble
                  key={`${message.role}-${index}`}
                  index={index}
                  message={message}
                />
              ))}
              {isChatLoading && (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    padding: '8px 10px',
                    borderRadius: 10,
                    backgroundColor: theme.chatNeutralSubtle,
                  }}
                >
                  <Text style={{ ...bodySm, color: theme.chatTextSecondary }}>
                    <Trans>Thinking locally...</Trans>
                  </Text>
                </View>
              )}
            </View>
          )}

          {chatError && (
            <View
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: theme.chatErrorSoft,
              }}
            >
              <Text style={{ ...bodySm, color: theme.chatError }}>
                {chatError === 'invalid_messages' ? (
                  <Trans>Enter a question before sending.</Trans>
                ) : (
                  <Trans>
                    Local AI unavailable. Check Ollama and qwen3:4b.
                  </Trans>
                )}
              </Text>
            </View>
          )}

          {data.response.riskFlags.length > 0 && (
            <Text style={{ ...caption, color: theme.semanticError }}>
              {data.response.riskFlags.join(', ')}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Input
              aria-label={t('Ask Savings advisor')}
              placeholder={t('Ask about this month')}
              value={draft}
              disabled={isChatLoading}
              onChange={event => setDraft(event.currentTarget.value)}
              onEnter={(value, event) => {
                event.preventDefault();
                void sendMessage(value);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 38,
                padding: '8px 10px',
                borderRadius: 9999,
                border: `1px solid ${theme.chatNeutralBorder}`,
                backgroundColor: theme.chatNeutralSurface,
                color: theme.chatTextPrimary,
              }}
            />
            <Button
              variant="primary"
              aria-label={t('Send message')}
              isDisabled={isChatLoading || draft.trim().length === 0}
              onPress={() => sendMessage(draft)}
              style={{
                width: 38,
                height: 38,
                minHeight: 38,
                padding: 0,
                backgroundColor: theme.chatUserAccent,
                borderColor: theme.chatUserAccent,
              }}
            >
              <SvgArrowButtonRight1 width={15} height={15} />
            </Button>
          </View>
        </View>
      )}
    </DashboardPanel>
  );
}

export function BudgetDashboardShell({
  budgetType,
  categoryGroups,
  startMonth,
}: BudgetDashboardShellProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const monthLabel = monthUtils.format(startMonth, 'MMMM yyyy', locale);

  return (
    <View
      role="region"
      aria-label={t('Dashboard overview')}
      style={{
        flexShrink: 0,
        gap: 16,
        padding: '16px 0 0',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ ...display2xl, color: theme.pageTextDark }}>
            <Trans>Dashboard</Trans>
          </Text>
          <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
            {monthLabel}
          </Text>
        </View>
      </View>

      <SavingsAdvisorCard month={startMonth} />

      <IncomeAllocationPanel
        budgetType={budgetType}
        categoryGroups={categoryGroups}
        monthLabel={monthLabel}
      />

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          [`@media (max-width: ${tokens.breakpoint_medium})`]: {
            gridTemplateColumns: '1fr',
          },
        }}
      >
        <MonthlySpendingCard budgetType={budgetType} monthLabel={monthLabel} />
        <NetWorthDashboardCard budgetMonth={startMonth} />
        <TransactionsToReviewCard />
        <TopCategoriesCard
          categoryGroups={categoryGroups}
          monthLabel={monthLabel}
          startMonth={startMonth}
        />
        <RecurringsCard />
        <AccountsSummaryCard />
      </View>
    </View>
  );
}
