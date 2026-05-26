import { Fragment, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import {
  bodyMd,
  bodySm,
  bodyStrong,
  displayLg,
  tableCellAmount,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useBudgetActions } from '#budget';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useLocalPref } from '#hooks/useLocalPref';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { SheetFields } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { getCategoryColor } from './categoryColors';
import { prewarmAllMonths } from './util';

type BudgetType = 'envelope' | 'tracking';
type EnvelopeBudgetField = SheetFields<'envelope-budget'>;
type TrackingBudgetField = SheetFields<'tracking-budget'>;

type CategoryGroupView = CategoryGroupEntity & {
  categories: CategoryEntity[];
};

const budgetRowColumns =
  'minmax(220px, 1fr) minmax(180px, 520px) minmax(88px, 112px)';

function getVisibleCategories(group: CategoryGroupEntity): CategoryEntity[] {
  return (group.categories ?? []).filter(
    category => !category.hidden && !category.tombstone,
  );
}

function getVisibleGroups(groups: CategoryGroupEntity[]): CategoryGroupView[] {
  return groups
    .filter(group => !group.hidden && !group.tombstone)
    .map(group => ({ ...group, categories: getVisibleCategories(group) }));
}

function useBudgetValue(
  budgetType: BudgetType,
  envelopeField: EnvelopeBudgetField,
  trackingField: TrackingBudgetField,
) {
  const envelopeValue = useSheetValue<'envelope-budget', EnvelopeBudgetField>(
    envelopeField,
  );
  const trackingValue = useSheetValue<'tracking-budget', TrackingBudgetField>(
    trackingField,
  );
  return budgetType === 'tracking' ? trackingValue : envelopeValue;
}

function EditableBudgetCell({
  category,
  value,
  onSave,
}: {
  category: CategoryEntity;
  value: number;
  onSave: (categoryId: CategoryEntity['id'], amount: number) => void;
}) {
  const format = useFormat();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const hasBudget = Math.abs(value) > 0;

  const beginEditing = () => {
    setDraft(format.forEdit(Math.abs(value)));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft('');
  };

  const commitEditing = () => {
    const parsedAmount = format.fromEdit(draft, Math.abs(value)) ?? 0;
    onSave(category.id, parsedAmount);
    setIsEditing(false);
    setDraft('');
  };

  if (isEditing) {
    return (
      <View role="cell" style={{ alignItems: 'flex-end' }}>
        <Input
          aria-label={t('Budget amount for {{categoryName}}', {
            categoryName: category.name,
          })}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.currentTarget.value)}
          onBlur={commitEditing}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitEditing();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelEditing();
            }
          }}
          style={{
            ...tableCellAmount,
            width: 96,
            minHeight: 30,
            padding: '3px 8px',
            color: theme.pageText,
            backgroundColor: theme.formInputBackground,
            border: '1px solid ' + theme.formInputBorder,
            borderRadius: 4,
          }}
        />
      </View>
    );
  }

  return (
    <Button
      variant="bare"
      aria-label={t('Edit budget amount for {{categoryName}}', {
        categoryName: category.name,
      })}
      onPress={beginEditing}
      style={{
        ...tableCellAmount,
        minHeight: 30,
        justifyContent: 'flex-end',
        padding: '2px 4px',
        color: hasBudget ? theme.pageText : theme.pageTextSubdued,
        textAlign: 'right',
        whiteSpace: 'nowrap',
        borderRadius: 4,
      }}
    >
      {hasBudget ? format(Math.abs(value), 'financial') : '-'}
    </Button>
  );
}

function SpendingCell({
  value,
  budgeted,
  color,
}: {
  value: number;
  budgeted: number;
  color: string;
}) {
  const format = useFormat();
  const displayValue = Math.abs(value);
  const displayBudgeted = Math.abs(budgeted);
  const progress =
    displayBudgeted > 0
      ? Math.min(displayValue / displayBudgeted, 1)
      : displayValue > 0
        ? 1
        : 0;

  return (
    <View
      role="cell"
      style={{
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Text
        style={{
          ...tableCellAmount,
          width: 96,
          color: displayValue > 0 ? theme.pageText : theme.pageTextSubdued,
          whiteSpace: 'nowrap',
        }}
      >
        {format(displayValue, 'financial')}
      </Text>
      <View
        aria-hidden
        style={{
          flex: 1,
          height: 5,
          minWidth: 56,
          borderRadius: 999,
          backgroundColor: theme.tableBorder,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function GroupBudgetRow({
  budgetType,
  group,
}: {
  budgetType: BudgetType;
  group: CategoryGroupView;
}) {
  const format = useFormat();
  const groupSpent =
    useBudgetValue(
      budgetType,
      envelopeBudget.groupSumAmount(group.id),
      trackingBudget.groupSumAmount(group.id),
    ) ?? 0;
  const groupBudgeted =
    useBudgetValue(
      budgetType,
      envelopeBudget.groupBudgeted(group.id),
      trackingBudget.groupBudgeted(group.id),
    ) ?? 0;
  const groupColor = getCategoryColor(group.name).color;

  return (
    <View
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: budgetRowColumns,
        alignItems: 'center',
        columnGap: 16,
        minHeight: 32,
        marginTop: 8,
        padding: '0 16px',
        backgroundColor: theme.tableRowBackgroundHighlight,
        borderRadius: 6,
      }}
    >
      <View
        role="cell"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: groupColor,
          }}
        />
        <Text style={{ ...bodyStrong, color: theme.pageText }}>
          {group.name}
        </Text>
        <Text
          style={{
            ...captionLike,
            color: theme.pageTextSubdued,
          }}
        >
          {group.categories.length}
        </Text>
      </View>
      <SpendingCell
        value={groupSpent}
        budgeted={groupBudgeted}
        color={groupColor}
      />
      <Text role="cell" style={{ ...tableCellAmount, color: theme.pageText }}>
        {format(Math.abs(groupBudgeted), 'financial')}
      </Text>
    </View>
  );
}

const captionLike = {
  ...bodySm,
  padding: '1px 7px',
  borderRadius: 999,
  backgroundColor: theme.tableBackground,
};

function CategoryBudgetRow({
  budgetType,
  category,
  groupName,
  onBudgetAmountChange,
}: {
  budgetType: BudgetType;
  category: CategoryEntity;
  groupName: string;
  onBudgetAmountChange: (
    categoryId: CategoryEntity['id'],
    amount: number,
  ) => void;
}) {
  const spent =
    useBudgetValue(
      budgetType,
      envelopeBudget.catSumAmount(category.id),
      trackingBudget.catSumAmount(category.id),
    ) ?? 0;
  const budgeted =
    useBudgetValue(
      budgetType,
      envelopeBudget.catBudgeted(category.id),
      trackingBudget.catBudgeted(category.id),
    ) ?? 0;
  const color = getCategoryColor(groupName, category.name).color;

  return (
    <View
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: budgetRowColumns,
        alignItems: 'center',
        columnGap: 16,
        minHeight: 32,
        padding: '0 16px',
        backgroundColor: theme.pageBackground,
      }}
    >
      <View
        role="cell"
        style={{
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 20,
        }}
      >
        <View
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
        <Text
          style={{
            ...bodyMd,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: theme.pageText,
          }}
        >
          {category.name}
        </Text>
      </View>
      <SpendingCell value={spent} budgeted={budgeted} color={color} />
      <EditableBudgetCell
        category={category}
        value={budgeted}
        onSave={onBudgetAmountChange}
      />
    </View>
  );
}

export function BudgetEditorPage() {
  const { t } = useTranslation();
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const applyBudgetAction = useBudgetActions();
  const [startMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [budgetTypePref = 'envelope'] = useSyncedPref('budgetType');
  const budgetType: BudgetType =
    budgetTypePref === 'tracking' ? 'tracking' : 'envelope';
  const [initialized, setInitialized] = useState(false);
  const [budgetBounds, setBudgetBounds] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const {
    data: { grouped: categoryGroups } = {
      grouped: [],
    },
  } = useCategories();
  const locale = useLocale();
  const monthLabel = monthUtils.format(startMonth, 'MMMM yyyy', locale);
  const visibleGroups = getVisibleGroups(categoryGroups);

  useEffect(() => {
    async function run() {
      const { start, end } = await send('get-budget-bounds');
      const bounds = { start, end };
      setBudgetBounds(bounds);
      await prewarmAllMonths(budgetType, spreadsheet, bounds, startMonth);
      setInitialized(true);
    }

    void run();
  }, [budgetType, spreadsheet, startMonth]);

  const onBudgetAmountChange = (
    categoryId: CategoryEntity['id'],
    amount: number,
  ) => {
    applyBudgetAction.mutate({
      month: startMonth,
      type: 'budget-amount',
      args: {
        category: categoryId,
        amount,
      },
    });
  };

  if (!initialized || !budgetBounds) {
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
          minHeight: 0,
          padding: '16px 24px 32px',
          overflowX: 'hidden',
          overflowY: 'auto',
          [`@media (max-width: ${tokens.breakpoint_small})`]: {
            padding: '12px 8px 24px',
          },
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ ...displayLg, color: theme.pageTextDark }}>
              <Trans>Budget</Trans>
            </Text>
            <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
              {monthLabel}
            </Text>
          </View>
        </View>

        <View
          role="table"
          aria-label={t('Category budgets')}
          style={{
            flexShrink: 0,
            gap: 2,
            overflow: 'visible',
            backgroundColor: theme.pageBackground,
          }}
        >
          <View
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: budgetRowColumns,
              alignItems: 'center',
              columnGap: 16,
              minHeight: 28,
              padding: '0 16px',
              backgroundColor: theme.pageBackground,
            }}
          >
            <Text role="columnheader" style={{ ...bodySm }}>
              <Trans>Category</Trans>
            </Text>
            <Text
              role="columnheader"
              style={{ ...tableCellAmount, color: theme.pageTextSubdued }}
            >
              <Trans>Spent</Trans>
            </Text>
            <Text
              role="columnheader"
              style={{ ...tableCellAmount, color: theme.pageTextSubdued }}
            >
              <Trans>Budget</Trans>
            </Text>
          </View>

          {visibleGroups.map(group => (
            <Fragment key={group.id}>
              <GroupBudgetRow budgetType={budgetType} group={group} />
              {group.categories.map(category => (
                <CategoryBudgetRow
                  key={category.id}
                  budgetType={budgetType}
                  category={category}
                  groupName={group.name}
                  onBudgetAmountChange={onBudgetAmountChange}
                />
              ))}
            </Fragment>
          ))}
        </View>
      </View>
    </SheetNameProvider>
  );
}
