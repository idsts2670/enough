import React, { useCallback, useEffect, useState } from 'react';

import { styles } from '@actual-app/components/styles';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { useQueryClient } from '@tanstack/react-query';

import type { ApplyBudgetActionPayload } from '#budget';
import {
  categoryQueries,
  useBudgetActions,
  useDeleteCategoryGroupMutation,
  useDeleteCategoryMutation,
  useSaveCategoryGroupMutation,
  useSaveCategoryMutation,
} from '#budget';
import { useCategories } from '#hooks/useCategories';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { collapseModals } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { AutoSizingBudgetTable } from './DynamicBudgetTable';
import type { MonthBounds } from './MonthsContext';
import { prewarmAllMonths } from './util';

type BudgetType = 'envelope' | 'tracking';

export function BudgetEditorPage() {
  const currentMonth = monthUtils.currentMonth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const spreadsheet = useSpreadsheet();
  const applyBudgetAction = useBudgetActions();
  const saveCategoryGroup = useSaveCategoryGroupMutation();
  const saveCategory = useSaveCategoryMutation();
  const deleteCategoryGroup = useDeleteCategoryGroupMutation();
  const deleteCategory = useDeleteCategoryMutation();
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [budgetTypePref = 'envelope'] = useSyncedPref('budgetType');
  const budgetType: BudgetType =
    budgetTypePref === 'tracking' ? 'tracking' : 'envelope';
  const [initialized, setInitialized] = useState(false);
  const [budgetBounds, setBudgetBounds] = useState<MonthBounds | null>(null);
  const {
    data: { grouped: categoryGroups } = {
      grouped: [],
    },
  } = useCategories();

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

  const invalidateCategories = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: categoryQueries.lists() });
  }, [queryClient]);

  const onMonthSelect = useCallback(
    async (month: string) => {
      setStartMonthPref(month);
      if (budgetBounds) {
        await prewarmAllMonths(budgetType, spreadsheet, budgetBounds, month);
      }
    },
    [budgetBounds, budgetType, setStartMonthPref, spreadsheet],
  );

  const onBudgetAction = useCallback(
    (month: string, type: string, args: unknown) => {
      applyBudgetAction.mutate({
        month,
        type,
        args,
      } as ApplyBudgetActionPayload);
    },
    [applyBudgetAction],
  );

  const onSaveGroup = useCallback(
    (group: CategoryGroupEntity) => {
      saveCategoryGroup.mutate({ group });
    },
    [saveCategoryGroup],
  );

  const onDeleteGroup = useCallback(
    (groupId: CategoryGroupEntity['id']) => {
      dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
      deleteCategoryGroup.mutate({ id: groupId });
    },
    [deleteCategoryGroup, dispatch],
  );

  const onSaveCategory = useCallback(
    (category: CategoryEntity) => {
      saveCategory.mutate({ category });
    },
    [saveCategory],
  );

  const onDeleteCategory = useCallback(
    (categoryId: CategoryEntity['id']) => {
      dispatch(collapseModals({ rootModalName: 'category-menu' }));
      deleteCategory.mutate({ id: categoryId });
    },
    [deleteCategory, dispatch],
  );

  const onApplyBudgetTemplatesInGroup = useCallback(
    (categoryIds: CategoryEntity['id'][]) => {
      applyBudgetAction.mutate({
        month: startMonth,
        type: 'apply-multiple-templates',
        args: {
          categories: categoryIds,
        },
      });
    },
    [applyBudgetAction, startMonth],
  );

  const onReorderCategory = useCallback(
    async ({
      id,
      groupId,
      targetId,
    }: {
      id: CategoryEntity['id'];
      groupId: CategoryGroupEntity['id'];
      targetId: CategoryEntity['id'] | null;
    }) => {
      await send('category-move', { id, groupId, targetId });
      invalidateCategories();
    },
    [invalidateCategories],
  );

  const onReorderGroup = useCallback(
    async ({
      id,
      targetId,
    }: {
      id: CategoryGroupEntity['id'];
      targetId: CategoryGroupEntity['id'] | null;
    }) => {
      await send('category-group-move', { id, targetId });
      invalidateCategories();
    },
    [invalidateCategories],
  );

  const onShowActivity = useCallback(
    (categoryId: CategoryEntity['id'], month?: string) => {
      void navigate('/accounts', {
        state: {
          goBack: true,
          filterConditions: [
            {
              field: 'category',
              op: 'is',
              value: categoryId,
              type: 'id',
            },
            ...(month
              ? [
                  {
                    field: 'date',
                    op: 'is',
                    value: month,
                    options: { month: true },
                    type: 'date',
                  },
                ]
              : []),
          ],
          categoryId,
        },
      });
    },
    [navigate],
  );

  if (!initialized || !budgetBounds || !categoryGroups) {
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
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 0,
          paddingBottom: 24,
          overflow: 'hidden',
          [`@media (min-width: ${tokens.breakpoint_small})`]: {
            paddingTop: 0,
          },
        }}
      >
        <AutoSizingBudgetTable
          type={budgetType}
          prewarmStartMonth={startMonth}
          startMonth={startMonth}
          maxMonths={3}
          monthBounds={budgetBounds}
          onMonthSelect={onMonthSelect}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
          onSaveGroup={onSaveGroup}
          onDeleteGroup={onDeleteGroup}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
          onReorderCategory={onReorderCategory}
          onReorderGroup={onReorderGroup}
          onShowActivity={onShowActivity}
          onBudgetAction={onBudgetAction}
        />
      </View>
    </SheetNameProvider>
  );
}
