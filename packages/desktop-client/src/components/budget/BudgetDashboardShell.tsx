import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import {
  bodySm,
  display2xl,
  metricSubtitle,
  metricTitle,
  metricValue,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import type { FormatType } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import type { SheetFields } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

type BudgetDashboardShellProps = {
  budgetType: string;
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

export function BudgetDashboardShell({
  budgetType,
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
    </View>
  );
}
