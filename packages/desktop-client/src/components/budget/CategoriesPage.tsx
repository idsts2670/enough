// @ts-strict-ignore
import React, { useEffect, useEffectEvent, useState } from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { pageHeader } from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';

import {
  useBudgetActions,
  useDeleteCategoryGroupMutation,
  useDeleteCategoryMutation,
  useReorderCategoryGroupMutation,
  useReorderCategoryMutation,
  useSaveCategoryGroupMutation,
  useSaveCategoryMutation,
} from '#budget';
import { useCategories } from '#hooks/useCategories';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { BudgetPageHeader } from './BudgetPageHeader';
import { BudgetTable } from './BudgetTable';
import { EnvelopeBudgetProvider } from './envelope/EnvelopeBudgetContext';
import { TrackingBudgetProvider } from './tracking/TrackingBudgetContext';
import { prewarmAllMonths, prewarmMonth } from './util';

export function Categories() {
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const navigate = useNavigate();
  const [summaryCollapsed, setSummaryCollapsedPref] = useLocalPref(
    'budget.summaryCollapsed',
  );
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [bounds, setBounds] = useState({ start: startMonth, end: startMonth });
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [maxMonthsPref] = useGlobalPref('maxMonths');
  const maxMonths = maxMonthsPref || 1;
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();

  const init = useEffectEvent(() => {
    async function run() {
      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });
      await prewarmAllMonths(budgetType, spreadsheet, { start, end }, startMonth);
    }
    void run();
  });
  useEffect(() => init(), []);

  const loadBoundBudgets = useEffectEvent(() => {
    void send('get-budget-bounds').then(({ start, end }) => {
      if (bounds.start !== start || bounds.end !== end) {
        setBounds({ start, end });
      }
    });
  });
  useEffect(() => loadBoundBudgets(), []);

  const onMonthSelect = async (month, numDisplayed) => {
    setStartMonthPref(month);
    const warmingMonth = month;
    if (month < startMonth) {
      await prewarmMonth(budgetType, spreadsheet, monthUtils.subMonths(month, 1));
    } else if (month > startMonth) {
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.addMonths(month, numDisplayed),
      );
    }
    if (warmingMonth === month) {
      setStartMonthPref(month);
    }
  };

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const applyBudgetAction = useBudgetActions();

  const onApplyBudgetTemplatesInGroup = async categories => {
    applyBudgetAction.mutate({
      month: startMonth,
      type: 'apply-multiple-templates',
      args: { categories },
    });
  };

  const onShowActivity = (categoryId, month) => {
    const filterConditions = [
      { field: 'category', op: 'is', value: categoryId, type: 'id' },
      {
        field: 'date',
        op: 'is',
        value: month,
        options: { month: true },
        type: 'date',
      },
    ];
    void navigate('/accounts', {
      state: { goBack: true, filterConditions, categoryId },
    });
  };

  const saveCategory = useSaveCategoryMutation();
  const onSaveCategory = category => saveCategory.mutate({ category });

  const deleteCategory = useDeleteCategoryMutation();
  const onDeleteCategory = id => deleteCategory.mutate({ id });

  const reorderCategory = useReorderCategoryMutation();

  const saveCategoryGroup = useSaveCategoryGroupMutation();
  const onSaveCategoryGroup = group => saveCategoryGroup.mutate({ group });

  const deleteCategoryGroup = useDeleteCategoryGroupMutation();
  const onDeleteCategoryGroup = id => deleteCategoryGroup.mutate({ id });

  const reorderCategoryGroup = useReorderCategoryGroupMutation();

  const onBudgetAction = (month, type, args) => {
    applyBudgetAction.mutate({ month, type, args });
  };

  if (!categoryGroups) {
    return null;
  }

  const titlebarHeight = 36;

  const numMonths = Math.min(maxMonths, 3);
  const tableProps = {
    type: budgetType,
    prewarmStartMonth: startMonth,
    startMonth,
    numMonths,
    monthBounds: bounds,
    onDeleteCategory,
    onDeleteGroup: onDeleteCategoryGroup,
    onSaveCategory,
    onSaveGroup: onSaveCategoryGroup,
    onBudgetAction,
    onShowActivity,
    onReorderCategory: reorderCategory.mutate,
    onReorderGroup: reorderCategoryGroup.mutate,
    onApplyBudgetTemplatesInGroup,
  };

  const table =
    budgetType === 'tracking' ? (
      <TrackingBudgetProvider
        summaryCollapsed={summaryCollapsed}
        onBudgetAction={onBudgetAction}
        onToggleSummaryCollapse={onToggleCollapse}
      >
        <BudgetTable {...tableProps} type="tracking" />
      </TrackingBudgetProvider>
    ) : (
      <EnvelopeBudgetProvider
        summaryCollapsed={summaryCollapsed}
        onBudgetAction={onBudgetAction}
        onToggleSummaryCollapse={onToggleCollapse}
      >
        <BudgetTable {...tableProps} type="envelope" />
      </EnvelopeBudgetProvider>
    );

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
      <View
        style={{
          ...styles.page,
          marginTop: titlebarHeight,
          paddingLeft: 8,
          paddingRight: 8,
          overflowX: 'hidden',
          overflowY: 'auto',
          [`@media (min-width: ${tokens.breakpoint_small})`]: {
            paddingTop: 0,
          },
        }}
      >
        <Text
          style={{
            ...pageHeader,
            color: theme.pageTextDark,
            margin: '16px 16px 12px',
          }}
        >
          <Trans>Categories</Trans>
        </Text>
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{ width: '100%', maxWidth: 1700 }}>
            <BudgetPageHeader
              startMonth={startMonth}
              numMonths={numMonths}
              monthBounds={bounds}
              onMonthSelect={month => onMonthSelect(month, numMonths)}
            />
            {table}
          </View>
        </View>
      </View>
    </SheetNameProvider>
  );
}
