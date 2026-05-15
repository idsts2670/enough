import React, { useEffect, useMemo, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import {
  bodySm,
  bodyStrong,
  caption,
  display2xl,
  metricSubtitle,
  metricTitle,
  metricValue,
  tableCellAmount,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import type { FormatType } from '#hooks/useFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useSheetValue } from '#hooks/useSheetValue';
import { aqlQuery } from '#queries/aqlQuery';
import type { SheetFields } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

type BudgetDashboardShellProps = {
  budgetType: string;
  categoryGroups: CategoryGroupEntity[];
  startMonth: string;
};

type MetricCardProps = {
  label: string;
  value: ReactNode;
  subtitle: string;
};

type FinancialMetricValueProps =
  | {
      budgetKind: 'envelope';
      binding: SheetFields<'envelope-budget'>;
    }
  | {
      budgetKind: 'tracking';
      binding: SheetFields<'tracking-budget'>;
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
};

type CategoryColor = {
  color: string;
  tint: string;
};

const categoryColorTokens = [
  {
    key: 'housing',
    words: ['housing', 'home', 'rent', 'mortgage'],
    color: theme.categoryHousing,
    tint: theme.categoryHousingTint,
  },
  {
    key: 'food',
    words: ['food', 'drink', 'grocery', 'restaurant'],
    color: theme.categoryFood,
    tint: theme.categoryFoodTint,
  },
  {
    key: 'transport',
    words: ['transport', 'car', 'transit', 'gas'],
    color: theme.categoryTransport,
    tint: theme.categoryTransportTint,
  },
  {
    key: 'shopping',
    words: ['shopping', 'retail'],
    color: theme.categoryShopping,
    tint: theme.categoryShoppingTint,
  },
  {
    key: 'bills',
    words: ['bill', 'subscription', 'utility'],
    color: theme.categoryBills,
    tint: theme.categoryBillsTint,
  },
  {
    key: 'health',
    words: ['health', 'medical', 'fitness', 'pharmacy'],
    color: theme.categoryHealth,
    tint: theme.categoryHealthTint,
  },
  {
    key: 'entertainment',
    words: ['entertainment', 'hobby', 'media'],
    color: theme.categoryEntertainment,
    tint: theme.categoryEntertainmentTint,
  },
  {
    key: 'travel',
    words: ['travel', 'flight', 'hotel'],
    color: theme.categoryTravel,
    tint: theme.categoryTravelTint,
  },
  {
    key: 'income',
    words: ['income'],
    color: theme.categoryIncome,
    tint: theme.categoryIncomeTint,
  },
  {
    key: 'debt',
    words: ['debt', 'loan', 'payment'],
    color: theme.categoryDebt,
    tint: theme.categoryDebtTint,
  },
  {
    key: 'savings',
    words: ['saving', 'investment'],
    color: theme.categorySavings,
    tint: theme.categorySavingsTint,
  },
  {
    key: 'personal',
    words: ['personal'],
    color: theme.categoryPersonal,
    tint: theme.categoryPersonalTint,
  },
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getCategoryColor(groupName: string): CategoryColor {
  const normalized = groupName.toLowerCase();
  const namedToken = categoryColorTokens.find(
    token =>
      normalized.includes(token.key) ||
      token.words.some(word => normalized.includes(word)),
  );

  return (
    namedToken ??
    categoryColorTokens[stableHash(normalized) % categoryColorTokens.length]
  );
}

const EnvelopeDashboardCellValue = <
  FieldName extends SheetFields<'envelope-budget'>,
>(
  props: ComponentProps<typeof CellValue<'envelope-budget', FieldName>>,
) => {
  return <CellValue {...props} />;
};

const TrackingDashboardCellValue = <
  FieldName extends SheetFields<'tracking-budget'>,
>(
  props: ComponentProps<typeof CellValue<'tracking-budget', FieldName>>,
) => {
  return <CellValue {...props} />;
};

function FinancialMetricValue(props: FinancialMetricValueProps) {
  const metric = ({
    name,
    type,
    value,
  }: {
    name: string;
    type?: FormatType;
    value: number | null;
  }) => (
    <CellValueText
      name={name}
      type={type}
      value={value ?? 0}
      style={{ ...metricValue, color: theme.pageText }}
    />
  );

  if (props.budgetKind === 'tracking') {
    return (
      <TrackingDashboardCellValue binding={props.binding} type="financial">
        {metric}
      </TrackingDashboardCellValue>
    );
  }

  return (
    <EnvelopeDashboardCellValue binding={props.binding} type="financial">
      {metric}
    </EnvelopeDashboardCellValue>
  );
}

function MetricCard({ label, value, subtitle }: MetricCardProps) {
  return (
    <View
      style={{
        minHeight: 112,
        justifyContent: 'space-between',
        gap: 16,
        padding: 24,
        backgroundColor: theme.cardBackground,
        border: '1px solid ' + theme.cardBorder,
        borderRadius: 12,
        boxShadow: theme.cardShadow,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ ...metricTitle, color: theme.pageTextDark }}>
          {label}
        </Text>
        <Text style={{ ...metricSubtitle, color: theme.pageTextSubdued }}>
          {subtitle}
        </Text>
      </View>
      <View>{value}</View>
    </View>
  );
}

function DashboardPanel({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: ReactNode;
  subtitle: string;
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
        <Text style={{ ...metricTitle, color: theme.pageTextDark }}>
          {title}
        </Text>
        <Text style={{ ...metricSubtitle, color: theme.pageTextSubdued }}>
          {subtitle}
        </Text>
      </View>
      {children}
    </View>
  );
}

function SpendingProgress({
  color,
  progress,
}: {
  color: string;
  progress: number;
}) {
  return (
    <View
      style={{
        height: 8,
        overflow: 'hidden',
        backgroundColor: theme.tableRowBackgroundHover,
        borderRadius: 9999,
      }}
    >
      <View
        style={{
          width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
          minWidth: progress > 0 ? 4 : 0,
          height: '100%',
          backgroundColor: color,
          borderRadius: 9999,
        }}
      />
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
  const budgeted =
    useSheetValue<'envelope-budget', 'total-budgeted'>(
      envelopeBudget.totalBudgeted,
    ) ?? 0;
  const progress = budgeted > 0 ? Math.abs(spent) / Math.abs(budgeted) : 0;

  return (
    <MonthlySpendingContent
      budgeted={budgeted}
      monthLabel={monthLabel}
      progress={progress}
      spent={spent}
      spentDisplay={format(spent, 'financial')}
    />
  );
}

function TrackingMonthlySpendingCard({ monthLabel }: { monthLabel: string }) {
  const format = useFormat();
  const spent =
    useSheetValue<'tracking-budget', 'total-spent'>(
      trackingBudget.totalSpent,
    ) ?? 0;
  const budgeted =
    useSheetValue<'tracking-budget', 'total-budgeted'>(
      trackingBudget.totalBudgetedExpense,
    ) ?? 0;
  const progress = budgeted > 0 ? Math.abs(spent) / Math.abs(budgeted) : 0;

  return (
    <MonthlySpendingContent
      budgeted={budgeted}
      monthLabel={monthLabel}
      progress={progress}
      spent={spent}
      spentDisplay={format(spent, 'financial')}
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
  const format = useFormat();
  const remaining = budgeted - Math.abs(spent);
  const isOverBudget = remaining < 0;
  const progressColor =
    budgeted > 0 && Math.abs(spent) > budgeted
      ? theme.categoryDebt
      : theme.categoryFood;

  return (
    <DashboardPanel
      title={<Trans>Monthly Spending</Trans>}
      subtitle={monthLabel}
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
        <SpendingProgress color={progressColor} progress={progress} />
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
            <Text style={{ ...bodyStrong, color: theme.pageText }}>
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
            <Text style={{ ...bodyStrong, color: theme.pageText }}>
              {format(Math.abs(remaining), 'financial')}
            </Text>
          </View>
        </View>
      </View>
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
            const color = getCategoryColor(groupName);

            return {
              id: row.category ?? '',
              name:
                row.categoryName ??
                fallback?.categoryName ??
                row.category ??
                '',
              amount: Math.abs(row.amount ?? 0),
              color: color.color,
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
    <DashboardPanel title={<Trans>Top Categories</Trans>} subtitle={monthLabel}>
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
            <View key={category.id} style={{ gap: 6 }}>
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
              <SpendingProgress
                color={category.color}
                progress={maxAmount > 0 ? category.amount / maxAmount : 0}
              />
            </View>
          ))}
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
  const isTrackingBudget = budgetType === 'tracking';

  return (
    <View
      aria-label={t('Dashboard overview')}
      style={{
        flexShrink: 0,
        gap: 16,
        padding: '16px 4px 0',
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

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <MetricCard
          label={isTrackingBudget ? t('Income') : t('Available funds')}
          value={
            isTrackingBudget ? (
              <FinancialMetricValue
                budgetKind="tracking"
                binding={trackingBudget.totalIncome}
              />
            ) : (
              <FinancialMetricValue
                budgetKind="envelope"
                binding={envelopeBudget.incomeAvailable}
              />
            )
          }
          subtitle={monthLabel}
        />
        <MetricCard
          label={t('Budgeted')}
          value={
            isTrackingBudget ? (
              <FinancialMetricValue
                budgetKind="tracking"
                binding={trackingBudget.totalBudgetedExpense}
              />
            ) : (
              <FinancialMetricValue
                budgetKind="envelope"
                binding={envelopeBudget.totalBudgeted}
              />
            )
          }
          subtitle={monthLabel}
        />
        <MetricCard
          label={t('Spent')}
          value={
            isTrackingBudget ? (
              <FinancialMetricValue
                budgetKind="tracking"
                binding={trackingBudget.totalSpent}
              />
            ) : (
              <FinancialMetricValue
                budgetKind="envelope"
                binding={envelopeBudget.totalSpent}
              />
            )
          }
          subtitle={monthLabel}
        />
        <MetricCard
          label={isTrackingBudget ? t('Left') : t('Balance')}
          value={
            isTrackingBudget ? (
              <FinancialMetricValue
                budgetKind="tracking"
                binding={trackingBudget.totalLeftover}
              />
            ) : (
              <FinancialMetricValue
                budgetKind="envelope"
                binding={envelopeBudget.totalBalance}
              />
            )
          }
          subtitle={monthLabel}
        />
      </View>

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <MonthlySpendingCard budgetType={budgetType} monthLabel={monthLabel} />
        <TopCategoriesCard
          categoryGroups={categoryGroups}
          monthLabel={monthLabel}
          startMonth={startMonth}
        />
      </View>
    </View>
  );
}
