// @ts-strict-ignore
import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCalendar,
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import {
  bodySm,
  bodyStrong,
  caption,
  display2xl,
  displayLg,
  metricValue,
  tableCellAmount,
  titleMd,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { SheetFields } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { getCategoryColor } from './categoryColors';
import { prewarmAllMonths, prewarmMonth } from './util';

type BudgetType = 'envelope' | 'tracking';
type EnvelopeBudgetField = SheetFields<'envelope-budget'>;
type TrackingBudgetField = SheetFields<'tracking-budget'>;

type CategoryGroupView = CategoryGroupEntity & {
  categories: CategoryEntity[];
};

function getVisibleCategories(group: CategoryGroupEntity): CategoryEntity[] {
  return (group.categories ?? []).filter(
    category => !category.hidden && !category.tombstone,
  );
}

function getVisibleGroups(groups: CategoryGroupEntity[]): CategoryGroupView[] {
  return groups
    .filter(group => !group.hidden && !group.tombstone)
    .map(group => ({ ...group, categories: getVisibleCategories(group) }))
    .filter(group => group.categories.length > 0);
}

function formatMonthRange(startMonth: string, locale) {
  return monthUtils.format(startMonth, 'MMMM yyyy', locale);
}

function useBudgetValue(
  budgetType: BudgetType,
  envelopeBinding: EnvelopeBudgetField,
  trackingBinding: TrackingBudgetField,
) {
  const envelopeValue = useSheetValue<'envelope-budget', EnvelopeBudgetField>(
    envelopeBinding,
  );
  const trackingValue = useSheetValue<'tracking-budget', TrackingBudgetField>(
    trackingBinding,
  );

  return budgetType === 'tracking' ? trackingValue : envelopeValue;
}

function useBudgetSummaryValues(budgetType: BudgetType) {
  const rawSpent = useBudgetValue(
    budgetType,
    envelopeBudget.totalSpent,
    trackingBudget.totalSpent,
  );
  const rawBudgeted = useBudgetValue(
    budgetType,
    envelopeBudget.totalBudgeted,
    trackingBudget.totalBudgetedExpense,
  );
  const spent = Math.abs(rawSpent ?? 0);
  const budgeted = Math.abs(rawBudgeted ?? 0);

  return {
    spent,
    budgeted,
    remaining: budgeted - spent,
  };
}

function CategoryMonthControls({
  startMonth,
  bounds,
  onMonthSelect,
}: {
  startMonth: string;
  bounds: { start: string; end: string } | null;
  onMonthSelect: (month: string) => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const isPreviousDisabled = bounds != null && startMonth <= bounds.start;
  const isNextDisabled = bounds != null && startMonth >= bounds.end;

  return (
    <View
      aria-label={t('Category month')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 4,
        borderRadius: 9999,
        border: `1px solid ${theme.tableBorder}`,
        backgroundColor: theme.tableBackground,
      }}
    >
      <Button
        variant="bare"
        aria-label={t('Previous month')}
        isDisabled={isPreviousDisabled}
        onPress={() => onMonthSelect(monthUtils.subMonths(startMonth, 1))}
        style={{
          width: 34,
          height: 34,
          minHeight: 0,
          padding: 0,
          borderRadius: 9999,
          color: isPreviousDisabled
            ? theme.pageTextLight
            : theme.pageTextSubdued,
        }}
      >
        <SvgCheveronLeft width={14} height={14} />
      </Button>
      <View
        style={{
          minWidth: 150,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: theme.pageText,
        }}
      >
        <SvgCalendar width={14} height={14} />
        <Text style={{ ...bodyStrong, color: theme.pageText }}>
          {monthUtils.format(startMonth, 'MMMM yyyy', locale)}
        </Text>
      </View>
      <Button
        variant="bare"
        aria-label={t('Next month')}
        isDisabled={isNextDisabled}
        onPress={() => onMonthSelect(monthUtils.addMonths(startMonth, 1))}
        style={{
          width: 34,
          height: 34,
          minHeight: 0,
          padding: 0,
          borderRadius: 9999,
          color: isNextDisabled ? theme.pageTextLight : theme.pageTextSubdued,
        }}
      >
        <SvgCheveronRight width={14} height={14} />
      </Button>
    </View>
  );
}

function CategorySummaryCard({
  label,
  value,
  detail,
  color = theme.pageText,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  color?: string;
}) {
  return (
    <View
      style={{
        gap: 6,
        minWidth: 0,
        minHeight: 96,
        padding: 16,
        borderRadius: 12,
        justifyContent: 'space-between',
        overflow: 'hidden',
        backgroundColor: theme.surfaceSubtle,
      }}
    >
      <Text style={{ ...caption, color: theme.pageTextSubdued }}>{label}</Text>
      <Text style={{ ...metricValue, color }}>{value}</Text>
      {detail ? (
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function CategoryOverview({
  budgetType,
  monthLabel,
  groupCount,
  categoryCount,
}: {
  budgetType: BudgetType;
  monthLabel: string;
  groupCount: number;
  categoryCount: number;
}) {
  const format = useFormat();
  const { spent, budgeted, remaining } = useBudgetSummaryValues(budgetType);
  const progress =
    budgeted > 0 ? Math.min(Math.max(spent / budgeted, 0), 1) : 0;
  const remainingColor =
    remaining < 0 ? theme.semanticError : theme.semanticSuccess;
  const remainingLabel =
    remaining < 0 ? <Trans>Over</Trans> : <Trans>Left</Trans>;

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(220px, 0.8fr)',
        gap: 14,
        [`@media (max-width: ${tokens.breakpoint_small})`]: {
          gridTemplateColumns: '1fr',
        },
      }}
    >
      <View
        style={{
          padding: 24,
          borderRadius: 16,
          backgroundColor: theme.tableBackground,
          boxShadow: `0 18px 50px ${theme.tableBorder}`,
          gap: 22,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ ...displayLg, color: theme.pageText }}>
              <Trans>Category plan</Trans>
            </Text>
            <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
              {monthLabel}
            </Text>
          </View>
          <View
            aria-hidden
            style={{
              width: 76,
              height: 76,
              borderRadius: 9999,
              background: `conic-gradient(${theme.semanticInfo} ${
                progress * 100
              }%, ${theme.surfaceSubtle} 0)`,
              boxShadow: `inset 0 0 0 16px ${theme.tableBackground}`,
            }}
          />
        </View>
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          <CategorySummaryCard
            label={<Trans>Spent</Trans>}
            value={format(spent, 'financial')}
            detail={<Trans>this month</Trans>}
          />
          <CategorySummaryCard
            label={<Trans>Budgeted</Trans>}
            value={format(budgeted, 'financial')}
            detail={<Trans>planned</Trans>}
          />
          <CategorySummaryCard
            label={remainingLabel}
            value={format(Math.abs(remaining), 'financial')}
            color={remainingColor}
            detail={
              remaining < 0 ? (
                <Trans>over budget</Trans>
              ) : (
                <Trans>remaining</Trans>
              )
            }
          />
        </View>
      </View>

      <View
        style={{
          padding: 24,
          borderRadius: 16,
          backgroundColor: theme.tableBackground,
          gap: 18,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ ...displayLg, color: theme.pageText }}>
            <Trans>All categories</Trans>
          </Text>
          <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
            {monthLabel}
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...bodyStrong, color: theme.pageTextSubdued }}>
              <Trans>Groups</Trans>
            </Text>
            <Text style={{ ...metricValue, color: theme.pageText }}>
              {groupCount}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...bodyStrong, color: theme.pageTextSubdued }}>
              <Trans>Categories</Trans>
            </Text>
            <Text style={{ ...metricValue, color: theme.pageText }}>
              {categoryCount}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function AmountCell({
  value,
  muted = false,
  color,
}: {
  value: number;
  muted?: boolean;
  color?: string;
}) {
  const format = useFormat();

  return (
    <Text
      style={{
        ...tableCellAmount,
        color: color ?? (muted ? theme.pageTextSubdued : theme.pageText),
      }}
    >
      {format(Math.abs(value), 'financial')}
    </Text>
  );
}

function ProgressBar({
  color,
  opacity = 1,
  value,
}: {
  color: string;
  opacity?: number;
  value: number;
}) {
  const width = `${Math.min(Math.max(value, 0), 1) * 100}%`;

  return (
    <View
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(Math.max(value, 0), 1) * 100)}
      style={{
        height: 6,
        minWidth: 80,
        flex: 1,
        borderRadius: 9999,
        backgroundColor: theme.surfaceSubtle,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width,
          height: '100%',
          borderRadius: 9999,
          backgroundColor: color,
          opacity,
        }}
      />
    </View>
  );
}

const categoryToneOpacities = [0.72, 0.84, 0.96, 1];

function getCategoryTone(index: number) {
  return categoryToneOpacities[index % categoryToneOpacities.length];
}

function CategoryRow({
  budgetType,
  category,
  groupName,
  index,
  startMonth,
}: {
  budgetType: BudgetType;
  category: CategoryEntity;
  groupName: string;
  index: number;
  startMonth: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const budgeted = useBudgetValue(
    budgetType,
    envelopeBudget.catBudgeted(category.id),
    trackingBudget.catBudgeted(category.id),
  );
  const spent = useBudgetValue(
    budgetType,
    envelopeBudget.catSumAmount(category.id),
    trackingBudget.catSumAmount(category.id),
  );
  const budgetedAmount = Math.abs(budgeted ?? 0);
  const spentAmount = Math.abs(spent ?? 0);
  const progress =
    budgetedAmount > 0
      ? Math.min(Math.max(spentAmount / budgetedAmount, 0), 1)
      : spentAmount > 0
        ? 1
        : 0;
  const categoryColor = getCategoryColor(groupName);
  const toneOpacity = getCategoryTone(index);

  return (
    <Button
      variant="bare"
      aria-label={t('View {{name}} activity', { name: category.name })}
      onPress={() =>
        navigate('/accounts', {
          state: {
            goBack: true,
            filterConditions: [
              {
                field: 'category',
                op: 'is',
                value: category.id,
                type: 'id',
              },
              {
                field: 'date',
                op: 'is',
                value: startMonth,
                options: { month: true },
                type: 'date',
              },
            ],
            categoryId: category.id,
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
          width: '100%',
          display: 'grid',
          gridTemplateColumns:
            'minmax(150px, 1.4fr) minmax(72px, 0.4fr) minmax(104px, 0.8fr) minmax(72px, 0.4fr)',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          borderRadius: 8,
          backgroundColor: theme.tableBackground,
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
              width: 7,
              height: 7,
              flexShrink: 0,
              borderRadius: 9999,
              backgroundColor: categoryColor.color,
              opacity: toneOpacity,
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
        <AmountCell value={spentAmount} muted={spentAmount === 0} />
        <ProgressBar
          color={categoryColor.color}
          opacity={toneOpacity}
          value={progress}
        />
        <AmountCell value={budgetedAmount} muted={budgetedAmount === 0} />
      </View>
    </Button>
  );
}

function CategoryGroupSection({
  budgetType,
  group,
  startMonth,
}: {
  budgetType: BudgetType;
  group: CategoryGroupView;
  startMonth: string;
}) {
  const groupColor = getCategoryColor(group.name);
  const groupBudgeted = Math.abs(
    useBudgetValue(
      budgetType,
      envelopeBudget.groupBudgeted(group.id),
      trackingBudget.groupBudgeted(group.id),
    ) ?? 0,
  );
  const groupSpent = Math.abs(
    useBudgetValue(
      budgetType,
      envelopeBudget.groupSumAmount(group.id),
      trackingBudget.groupSumAmount(group.id),
    ) ?? 0,
  );
  const progress =
    groupBudgeted > 0
      ? Math.min(Math.max(groupSpent / groupBudgeted, 0), 1)
      : groupSpent > 0
        ? 1
        : 0;

  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 14,
        backgroundColor: groupColor.tint,
      }}
    >
      <View
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(150px, 1.4fr) minmax(72px, 0.4fr) minmax(104px, 0.8fr) minmax(72px, 0.4fr)',
          alignItems: 'center',
          gap: 10,
          padding: '0 10px',
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
              width: 7,
              height: 7,
              flexShrink: 0,
              borderRadius: 9999,
              backgroundColor: groupColor.color,
            }}
          />
          <Text
            title={group.name}
            style={{
              ...titleMd,
              minWidth: 0,
              color: theme.pageText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {group.name}
          </Text>
          <Text
            style={{
              ...caption,
              color: groupColor.color,
              padding: '2px 7px',
              borderRadius: 9999,
              backgroundColor: theme.tableBackground,
            }}
          >
            {group.categories.length}
          </Text>
        </View>
        <AmountCell value={groupSpent} />
        <ProgressBar color={groupColor.color} value={progress} />
        <AmountCell value={groupBudgeted} />
      </View>
      <View style={{ gap: 6 }}>
        {group.categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            budgetType={budgetType}
            category={category}
            groupName={group.name}
            index={index}
            startMonth={startMonth}
          />
        ))}
      </View>
    </View>
  );
}

function CategoryListPanel({
  budgetType,
  groups,
  startMonth,
}: {
  budgetType: BudgetType;
  groups: CategoryGroupView[];
  startMonth: string;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: theme.tableBackground,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(150px, 1.4fr) minmax(72px, 0.4fr) minmax(104px, 0.8fr) minmax(72px, 0.4fr)',
          gap: 10,
          padding: '16px 26px 12px',
          backgroundColor: theme.pageBackground,
        }}
      >
        <Text style={{ ...caption, color: theme.pageTextSubdued }}>
          <Trans>Category</Trans>
        </Text>
        <Text
          style={{
            ...caption,
            color: theme.pageTextSubdued,
            textAlign: 'right',
          }}
        >
          <Trans>Spent</Trans>
        </Text>
        <Text style={{ ...caption, color: theme.pageTextSubdued }}>
          <Trans>Pace</Trans>
        </Text>
        <Text
          style={{
            ...caption,
            color: theme.pageTextSubdued,
            textAlign: 'right',
          }}
        >
          <Trans>Budget</Trans>
        </Text>
      </View>
      <View style={{ gap: 10, padding: 12 }}>
        {groups.map(group => (
          <CategoryGroupSection
            key={group.id}
            budgetType={budgetType}
            group={group}
            startMonth={startMonth}
          />
        ))}
      </View>
    </View>
  );
}

function CategorySidePanel({
  groups,
  monthLabel,
}: {
  groups: CategoryGroupView[];
  monthLabel: string;
}) {
  return (
    <View
      style={{
        gap: 14,
        padding: 22,
        borderRadius: 16,
        backgroundColor: theme.tableBackground,
        alignSelf: 'start',
        position: 'sticky',
        top: 16,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ ...displayLg, color: theme.pageText }}>
          <Trans>Regular categories</Trans>
        </Text>
        <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
          {monthLabel}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {groups.map(group => {
          const groupColor = getCategoryColor(group.name);
          return (
            <View
              key={group.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 10,
                backgroundColor: groupColor.tint,
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
                    borderRadius: 9999,
                    backgroundColor: groupColor.color,
                  }}
                />
                <Text
                  title={group.name}
                  style={{
                    ...caption,
                    color: groupColor.color,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.name}
                </Text>
              </View>
              <Text style={{ ...caption, color: groupColor.color }}>
                {group.categories.length}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function Categories() {
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [budgetTypePref = 'envelope'] = useSyncedPref('budgetType');
  const budgetType = budgetTypePref === 'tracking' ? 'tracking' : 'envelope';
  const [initialized, setInitialized] = useState(false);
  const [budgetBounds, setBudgetBounds] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const locale = useLocale();
  const monthLabel = formatMonthRange(startMonth, locale);

  const visibleGroups = useMemo(
    () => getVisibleGroups(categoryGroups),
    [categoryGroups],
  );
  const visibleCategoryCount = visibleGroups.reduce(
    (count, group) => count + group.categories.length,
    0,
  );

  const init = useEffectEvent(() => {
    async function run() {
      const { start, end } = await send('get-budget-bounds');
      setBudgetBounds({ start, end });
      await prewarmAllMonths(
        budgetType,
        spreadsheet,
        { start, end },
        startMonth,
      );
      setInitialized(true);
    }
    void run();
  });
  useEffect(() => init(), []);

  const onMonthSelect = async (month: string) => {
    setStartMonthPref(month);
    if (month < startMonth) {
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.subMonths(month, 1),
      );
    } else if (month > startMonth) {
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.addMonths(month, 1),
      );
    }
  };

  if (!initialized || !categoryGroups) {
    return null;
  }

  const titlebarHeight = 36;

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
      <View
        style={{
          ...styles.page,
          height: `calc(100% - ${titlebarHeight}px)`,
          marginTop: titlebarHeight,
          padding: '24px 24px 32px',
          overflowX: 'hidden',
          overflowY: 'auto',
          backgroundColor: theme.pageBackground,
          [`@media (min-width: ${tokens.breakpoint_small})`]: {
            paddingTop: 24,
          },
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1480,
            alignSelf: 'center',
            gap: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ ...display2xl, color: theme.pageTextDark }}>
                <Trans>Categories</Trans>
              </Text>
              <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
                {monthLabel}
              </Text>
            </View>
            <CategoryMonthControls
              startMonth={startMonth}
              bounds={budgetBounds}
              onMonthSelect={month => {
                void onMonthSelect(month);
              }}
            />
          </View>

          <CategoryOverview
            budgetType={budgetType}
            monthLabel={monthLabel}
            groupCount={visibleGroups.length}
            categoryCount={visibleCategoryCount}
          />

          <View
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.34fr)',
              gap: 16,
              alignItems: 'start',
              [`@media (max-width: ${tokens.breakpoint_small})`]: {
                gridTemplateColumns: '1fr',
              },
            }}
          >
            <CategoryListPanel
              budgetType={budgetType}
              groups={visibleGroups}
              startMonth={startMonth}
            />
            <CategorySidePanel groups={visibleGroups} monthLabel={monthLabel} />
          </View>
        </View>
      </View>
    </SheetNameProvider>
  );
}
