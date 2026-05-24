// @ts-strict-ignore
import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgCalendar,
  SvgCheveronDown,
  SvgCheveronLeft,
  SvgCheveronRight,
  SvgDotsHorizontalTriple,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import {
  bodyMd,
  bodySm,
  bodyStrong,
  caption,
  displayLg,
  metricValue,
  tableCellAmount,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  NoteEntity,
} from '@actual-app/core/types/models';

import {
  useBudgetActions,
  useCreateCategoryGroupMutation,
  useCreateCategoryMutation,
  useDeleteCategoryGroupMutation,
  useDeleteCategoryMutation,
  useSaveCategoryGroupMutation,
  useSaveCategoryMutation,
} from '#budget';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
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
    .map(group => ({ ...group, categories: getVisibleCategories(group) }));
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
  color = theme.pageText,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string;
}) {
  return (
    <View
      style={{
        minWidth: 0,
        minHeight: 92,
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.surfaceSubtle,
      }}
    >
      <Text style={{ ...caption, color: theme.pageTextSubdued }}>{label}</Text>
      <Text style={{ ...metricValue, color }}>{value}</Text>
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
  const hasCircularData = budgeted > 0;
  const remainingColor =
    remaining < 0
      ? theme.semanticError
      : remaining > 0
        ? theme.semanticSuccess
        : theme.pageTextSubdued;
  const remainingLabel =
    remaining < 0 ? <Trans>Over</Trans> : <Trans>Left</Trans>;

  return (
    <View
      style={{
        // Use flex-row instead of CSS Grid: a CSS Grid container inside a
        // flex column has a browser quirk where its own track height (220 px)
        // is ignored when the flex parent computes item sizes, collapsing the
        // grid to the right card's content height (~149 px) and letting the
        // left card overflow into the table below. Flex-row propagates item
        // heights correctly in all cases.
        //
        // flexShrink: 0 prevents the outer flex column (the page-level
        // content stack) from compressing this overview section below its
        // natural height. Without it the outer column distributes any
        // height-deficit across items here, pushing the left card's metrics
        // down into the table.
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'row',
        gap: 14,
        alignItems: 'stretch',
        [`@media (max-width: ${tokens.breakpoint_medium})`]: {
          flexDirection: 'column',
        },
      }}
    >
      <View
        style={{
          flex: '1.2 1 0',
          minWidth: 0,
          padding: 24,
          minHeight: 220,
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
            aria-hidden={hasCircularData}
            style={{
              width: 76,
              height: 76,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              background: hasCircularData
                ? `conic-gradient(${theme.semanticInfo} ${
                    progress * 100
                  }%, ${theme.surfaceSubtle} 0)`
                : theme.surfaceSubtle,
              boxShadow: `inset 0 0 0 16px ${theme.tableBackground}`,
            }}
          >
            {!hasCircularData && (
              <Text
                style={{
                  ...caption,
                  color: theme.pageTextSubdued,
                }}
              >
                <Trans>No data</Trans>
              </Text>
            )}
          </View>
        </View>
        <View
          style={{
            // flexShrink: 0 prevents this inner grid from being compressed
            // when the left card is stretched taller than its natural content
            // height (e.g., when align-items:stretch forces it to match the
            // right card). Without it the flex column distributes excess
            // height by shrinking this grid.
            flexShrink: 0,
            display: 'grid',
            // auto-fit with minmax reflows based on container width, not
            // viewport width. At ~294px (sidebar present at 768 px viewport)
            // this shows 1 column; at ≥440 px it shows all 3.
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
            gap: 10,
            [`@media (max-width: ${tokens.breakpoint_small})`]: {
              gridTemplateColumns: '1fr',
            },
          }}
        >
          <CategorySummaryCard
            label={<Trans>Spent</Trans>}
            value={format(spent, 'financial')}
          />
          <CategorySummaryCard
            label={<Trans>Budgeted</Trans>}
            value={format(budgeted, 'financial')}
          />
          <CategorySummaryCard
            label={remainingLabel}
            value={format(Math.abs(remaining), 'financial')}
            color={remainingColor}
          />
        </View>
      </View>

      <View
        style={{
          flex: '0.8 1 0',
          minWidth: 220,
          padding: 24,
          minHeight: 220,
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

const categoryTableColumns =
  'minmax(0, 1fr) minmax(72px, 88px) minmax(120px, 0.5fr) minmax(72px, 88px)';
const categoryTableCompactColumns =
  'minmax(0, 1fr) minmax(72px, 88px) minmax(72px, 88px)';
// The Pace column is hidden and the table switches to compact columns when
// the viewport is narrow. breakpoint_medium (730px) doesn't account for the
// ~240px sidebar; at 768px the content area is only ~528px, which squeezes
// the category-name column to single letters. 900px gives the Pace column
// enough room (content ≥ 660px → category column ≥ 268px) before it appears.
const tablePaceBreakpoint = '900px';
const categoryTableResponsiveStyle = {
  [`@media (max-width: ${tablePaceBreakpoint})`]: {
    gridTemplateColumns: categoryTableCompactColumns,
  },
};
const paceColumnResponsiveStyle = {
  [`@media (max-width: ${tablePaceBreakpoint})`]: {
    display: 'none',
  },
};

function AmountCell({
  value,
  muted = false,
  color,
  role = 'cell',
  showDash = false,
}: {
  value: number;
  muted?: boolean;
  color?: string;
  role?: 'cell' | 'columnheader';
  showDash?: boolean;
}) {
  const format = useFormat();

  return (
    <Text
      role={role}
      style={{
        ...tableCellAmount,
        minWidth: 72,
        color: color ?? (muted ? theme.pageTextSubdued : theme.pageText),
        textAlign: 'right',
        whiteSpace: 'nowrap',
      }}
    >
      {showDash ? '-' : format(Math.abs(value), 'financial')}
    </Text>
  );
}

function PaceCell({
  color,
  value,
  show = true,
}: {
  color: string;
  value: number;
  show?: boolean;
}) {
  const clampedValue = Math.min(Math.max(value, 0), 1);
  const percentage = Math.round(value * 100);
  const ariaValue = Math.max(0, percentage);

  return (
    <View
      role="cell"
      style={{
        minWidth: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
      }}
    >
      {show ? (
        <>
          <View
            role="meter"
            aria-valuemin={0}
            aria-valuemax={Math.max(100, ariaValue)}
            aria-valuenow={ariaValue}
            aria-valuetext={`${percentage}%`}
            style={{
              height: 6,
              minWidth: 44,
              flex: 1,
              borderRadius: 9999,
              backgroundColor: theme.surfaceSubtle,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${clampedValue * 100}%`,
                height: '100%',
                borderRadius: 9999,
                backgroundColor: color,
              }}
            />
          </View>
          <Text
            style={{
              ...caption,
              minWidth: 36,
              color: theme.pageTextSubdued,
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}
          >
            {percentage}%
          </Text>
        </>
      ) : null}
    </View>
  );
}

function CategoryColorDot({
  color,
  size = 8,
}: {
  color: string;
  size?: number;
}) {
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 9999,
        backgroundColor: color,
      }}
    />
  );
}

function RowGrid({
  children,
  role = 'row',
  style,
}: {
  children: ReactNode;
  role?: 'row';
  style?: Record<string, unknown>;
}) {
  return (
    <View
      role={role}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: categoryTableColumns,
        alignItems: 'center',
        columnGap: 16,
        minHeight: 44,
        padding: '0 24px',
        borderBottom: `1px solid ${theme.tableBorder}`,
        [`@media (max-width: ${tokens.breakpoint_small})`]: {
          columnGap: 10,
          padding: '0 12px',
        },
        ...categoryTableResponsiveStyle,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function RowActionButton({
  label,
  children,
  onPress,
}: {
  label: string;
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Button
      variant="bare"
      aria-label={label}
      onPress={onPress}
      style={{
        width: 28,
        height: 28,
        minHeight: 0,
        padding: 4,
        color: theme.pageTextSubdued,
      }}
    >
      {children}
    </Button>
  );
}

function CategoryRow({
  budgetType,
  category,
  groupName,
  onOpenCategoryMenu,
  startMonth,
}: {
  budgetType: BudgetType;
  category: CategoryEntity;
  groupName: string;
  onOpenCategoryMenu: (categoryId: CategoryEntity['id']) => void;
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
  const hasBudget = budgetedAmount > 0;
  const isOverspent = hasBudget && spentAmount > budgetedAmount;
  const progress = hasBudget
    ? Math.min(Math.max(spentAmount / budgetedAmount, 0), 1)
    : 0;
  const categoryColor = getCategoryColor(groupName);

  return (
    <RowGrid
      style={{
        backgroundColor: theme.tableBackground,
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
          [`@media (max-width: ${tokens.breakpoint_small})`]: {
            gap: 8,
            paddingLeft: 12,
          },
        }}
      >
        <CategoryColorDot color={categoryColor.color} size={7} />
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
            flex: 1,
            minWidth: 0,
            justifyContent: 'flex-start',
            padding: 0,
            color: theme.pageText,
          }}
        >
          <Text
            title={category.name}
            style={{
              ...bodyMd,
              minWidth: 0,
              color: theme.pageText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {category.name}
          </Text>
        </Button>
        <RowActionButton
          label={t('Manage {{name}} category', { name: category.name })}
          onPress={() => onOpenCategoryMenu(category.id)}
        >
          <SvgDotsHorizontalTriple width={14} height={14} />
        </RowActionButton>
      </View>
      <AmountCell
        value={spentAmount}
        muted={spentAmount === 0}
        color={isOverspent ? theme.semanticError : undefined}
      />
      <View style={paceColumnResponsiveStyle}>
        <PaceCell
          color={isOverspent ? theme.semanticError : theme.semanticSuccess}
          value={progress}
          show={hasBudget}
        />
      </View>
      <AmountCell
        value={budgetedAmount}
        muted={!hasBudget}
        showDash={!hasBudget}
      />
    </RowGrid>
  );
}

function CategoryGroupRow({
  budgetType,
  group,
  isCollapsed,
  onOpenCategoryGroupMenu,
  onToggle,
}: {
  budgetType: BudgetType;
  group: CategoryGroupView;
  isCollapsed: boolean;
  onOpenCategoryGroupMenu: (groupId: CategoryGroupEntity['id']) => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
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
  const hasBudget = groupBudgeted > 0;
  const isOverspent = hasBudget && groupSpent > groupBudgeted;
  const progress = hasBudget
    ? Math.min(Math.max(groupSpent / groupBudgeted, 0), 1)
    : 0;

  return (
    <RowGrid
      style={{
        backgroundColor: theme.surfaceSubtle,
      }}
    >
      <View
        role="rowheader"
        style={{
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Button
          variant="bare"
          aria-expanded={!isCollapsed}
          aria-label={t('Toggle {{name}} categories', { name: group.name })}
          onPress={onToggle}
          style={{
            width: 20,
            height: 28,
            minHeight: 0,
            padding: 0,
            color: theme.pageTextSubdued,
          }}
        >
          {isCollapsed ? (
            <SvgCheveronRight
              width={12}
              height={12}
              style={{ color: theme.pageTextSubdued }}
            />
          ) : (
            <SvgCheveronDown
              width={12}
              height={12}
              style={{ color: theme.pageTextSubdued }}
            />
          )}
        </Button>
        <CategoryColorDot color={groupColor.color} />
        <Text
          title={group.name}
          style={{
            ...bodyStrong,
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
        <RowActionButton
          label={t('Manage {{name}} category group', { name: group.name })}
          onPress={() => onOpenCategoryGroupMenu(group.id)}
        >
          <SvgDotsHorizontalTriple width={14} height={14} />
        </RowActionButton>
      </View>
      <AmountCell
        value={groupSpent}
        color={isOverspent ? theme.semanticError : undefined}
      />
      <View style={paceColumnResponsiveStyle}>
        <PaceCell
          color={isOverspent ? theme.semanticError : theme.semanticSuccess}
          value={progress}
          show={hasBudget}
        />
      </View>
      <AmountCell
        value={groupBudgeted}
        muted={!hasBudget}
        showDash={!hasBudget}
      />
    </RowGrid>
  );
}

function CategoryListPanel({
  budgetType,
  groups,
  onAddCategoryGroup,
  onOpenCategoryGroupMenu,
  onOpenCategoryMenu,
  startMonth,
}: {
  budgetType: BudgetType;
  groups: CategoryGroupView[];
  onAddCategoryGroup: () => void;
  onOpenCategoryGroupMenu: (groupId: CategoryGroupEntity['id']) => void;
  onOpenCategoryMenu: (categoryId: CategoryEntity['id']) => void;
  startMonth: string;
}) {
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');

  function onToggleGroup(groupId: string) {
    setCollapsedGroupIdsPref(
      collapsedGroupIds.includes(groupId)
        ? collapsedGroupIds.filter(id => id !== groupId)
        : [...collapsedGroupIds, groupId],
    );
  }

  return (
    <View
      role="table"
      style={{
        borderRadius: 16,
        backgroundColor: theme.tableBackground,
        marginTop: 8,
        overflow: 'visible',
        border: `1px solid ${theme.tableBorder}`,
      }}
    >
      <View
        role="row"
        style={{
          display: 'grid',
          gridTemplateColumns: categoryTableColumns,
          columnGap: 16,
          minHeight: 44,
          padding: '0 24px',
          alignItems: 'center',
          backgroundColor: theme.tableBackground,
          position: 'sticky',
          // 48px sticky title bar + 24px gap = 72px; the extra 24px ensures the
          // header doesn't start sticking while the overview cards are still
          // visible (which caused them to be visually covered during scroll).
          top: 72,
          zIndex: 2,
          borderBottom: `1px solid ${theme.tableBorder}`,
          [`@media (max-width: ${tokens.breakpoint_small})`]: {
            position: 'static',
          },
          ...categoryTableResponsiveStyle,
        }}
      >
        <Text
          role="columnheader"
          style={{ ...caption, color: theme.pageTextSubdued }}
        >
          <Trans>Category</Trans>
        </Text>
        <Text
          role="columnheader"
          style={{
            ...caption,
            color: theme.pageTextSubdued,
            textAlign: 'right',
          }}
        >
          <Trans>Spent</Trans>
        </Text>
        <Text
          role="columnheader"
          style={{
            ...caption,
            color: theme.pageTextSubdued,
            ...paceColumnResponsiveStyle,
          }}
        >
          <Trans>Pace</Trans>
        </Text>
        <Text
          role="columnheader"
          style={{
            ...caption,
            color: theme.pageTextSubdued,
            textAlign: 'right',
          }}
        >
          <Trans>Budget</Trans>
        </Text>
      </View>
      <View
        style={{
          width: '100%',
        }}
      >
        {groups.length === 0 ? (
          <View
            style={{
              minHeight: 220,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: 24,
            }}
          >
            <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
              <Trans>No categories yet</Trans>
            </Text>
            <Button variant="primary" onPress={onAddCategoryGroup}>
              <Trans>Add group</Trans>
            </Button>
          </View>
        ) : (
          groups.map(group => {
            const isCollapsed = collapsedGroupIds.includes(group.id);

            return (
              <Fragment key={group.id}>
                <CategoryGroupRow
                  budgetType={budgetType}
                  group={group}
                  isCollapsed={isCollapsed}
                  onOpenCategoryGroupMenu={onOpenCategoryGroupMenu}
                  onToggle={() => onToggleGroup(group.id)}
                />
                {!isCollapsed &&
                  group.categories.map(category => (
                    <CategoryRow
                      key={category.id}
                      budgetType={budgetType}
                      category={category}
                      groupName={group.name}
                      onOpenCategoryMenu={onOpenCategoryMenu}
                      startMonth={startMonth}
                    />
                  ))}
              </Fragment>
            );
          })
        )}
      </View>
    </View>
  );
}

export function Categories() {
  const { t } = useTranslation();
  const currentMonth = monthUtils.currentMonth();
  const dispatch = useDispatch();
  const spreadsheet = useSpreadsheet();
  const applyBudgetAction = useBudgetActions();
  const createCategoryGroup = useCreateCategoryGroupMutation();
  const createCategory = useCreateCategoryMutation();
  const saveCategoryGroup = useSaveCategoryGroupMutation();
  const saveCategory = useSaveCategoryMutation();
  const deleteCategoryGroup = useDeleteCategoryGroupMutation();
  const deleteCategory = useDeleteCategoryMutation();
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [budgetTypePref = 'envelope'] = useSyncedPref('budgetType');
  const budgetType = budgetTypePref === 'tracking' ? 'tracking' : 'envelope';
  const [initialized, setInitialized] = useState(false);
  const [budgetBounds, setBudgetBounds] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const {
    data: { list: categories, grouped: categoryGroups } = {
      list: [],
      grouped: [],
    },
  } = useCategories();
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

  const onOpenNewCategoryGroupModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'new-category-group',
          options: {
            onValidate: name => (!name ? t('Name is required.') : null),
            onSubmit: async name => {
              createCategoryGroup.mutate({ name });
            },
          },
        },
      }),
    );
  }, [createCategoryGroup, dispatch, t]);

  const onOpenNewCategoryModal = useCallback(
    (
      groupId: CategoryGroupEntity['id'],
      isIncome: CategoryGroupEntity['is_income'],
    ) => {
      dispatch(
        pushModal({
          modal: {
            name: 'new-category',
            options: {
              onValidate: name => (!name ? t('Name is required.') : null),
              onSubmit: async name => {
                createCategory.mutate(
                  {
                    name,
                    groupId,
                    isIncome,
                    isHidden: false,
                  },
                  {
                    onSettled: () => {
                      dispatch(
                        collapseModals({
                          rootModalName: 'category-group-menu',
                        }),
                      );
                    },
                  },
                );
              },
            },
          },
        }),
      );
    },
    [createCategory, dispatch, t],
  );

  const onSaveGroup = useCallback(
    (group: CategoryGroupEntity) => {
      saveCategoryGroup.mutate({ group });
    },
    [saveCategoryGroup],
  );

  const onDeleteGroup = useCallback(
    (groupId: CategoryGroupEntity['id']) => {
      deleteCategoryGroup.mutate(
        { id: groupId },
        {
          onSettled: () => {
            dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
          },
        },
      );
    },
    [deleteCategoryGroup, dispatch],
  );

  const onToggleGroupVisibility = useCallback(
    (groupId: CategoryGroupEntity['id']) => {
      const group = categoryGroups.find(g => g.id === groupId);
      if (!group) {
        return;
      }
      onSaveGroup({ ...group, hidden: !group.hidden });
      dispatch(collapseModals({ rootModalName: 'category-group-menu' }));
    },
    [categoryGroups, dispatch, onSaveGroup],
  );

  const onSaveCategory = useCallback(
    (category: CategoryEntity) => {
      saveCategory.mutate({ category });
    },
    [saveCategory],
  );

  const onDeleteCategory = useCallback(
    (categoryId: CategoryEntity['id']) => {
      deleteCategory.mutate(
        { id: categoryId },
        {
          onSettled: () => {
            dispatch(collapseModals({ rootModalName: 'category-menu' }));
          },
        },
      );
    },
    [deleteCategory, dispatch],
  );

  const onToggleCategoryVisibility = useCallback(
    (categoryId: CategoryEntity['id']) => {
      const category = categories.find(c => c.id === categoryId);
      if (!category) {
        return;
      }
      onSaveCategory({ ...category, hidden: !category.hidden });
      dispatch(collapseModals({ rootModalName: 'category-menu' }));
    },
    [categories, dispatch, onSaveCategory],
  );

  const onSaveNotes = useCallback(
    async (id: NoteEntity['id'], notes: string) => {
      await send('notes-save', { id, note: notes });
    },
    [],
  );

  const onOpenCategoryGroupNotesModal = useCallback(
    (id: NoteEntity['id']) => {
      const group = categoryGroups.find(g => g.id === id);
      if (!group) {
        return;
      }
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id,
              name: group.name,
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [categoryGroups, dispatch, onSaveNotes],
  );

  const onOpenCategoryNotesModal = useCallback(
    (id: NoteEntity['id']) => {
      const category = categories.find(c => c.id === id);
      if (!category) {
        return;
      }
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id,
              name: category.name,
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [categories, dispatch, onSaveNotes],
  );

  const onApplyBudgetTemplatesInGroup = useCallback(
    async (categoryIds: CategoryEntity['id'][]) => {
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

  const onOpenCategoryGroupMenuModal = useCallback(
    (groupId: CategoryGroupEntity['id']) => {
      dispatch(
        pushModal({
          modal: {
            name: 'category-group-menu',
            options: {
              groupId,
              onSave: onSaveGroup,
              onAddCategory: onOpenNewCategoryModal,
              onEditNotes: onOpenCategoryGroupNotesModal,
              onDelete: onDeleteGroup,
              onToggleVisibility: onToggleGroupVisibility,
              onApplyBudgetTemplatesInGroup,
            },
          },
        }),
      );
    },
    [
      dispatch,
      onApplyBudgetTemplatesInGroup,
      onDeleteGroup,
      onOpenCategoryGroupNotesModal,
      onOpenNewCategoryModal,
      onSaveGroup,
      onToggleGroupVisibility,
    ],
  );

  const onOpenCategoryMenuModal = useCallback(
    (categoryId: CategoryEntity['id']) => {
      dispatch(
        pushModal({
          modal: {
            name: 'category-menu',
            options: {
              categoryId,
              onSave: onSaveCategory,
              onEditNotes: onOpenCategoryNotesModal,
              onDelete: onDeleteCategory,
              onToggleVisibility: onToggleCategoryVisibility,
            },
          },
        }),
      );
    },
    [
      dispatch,
      onDeleteCategory,
      onOpenCategoryNotesModal,
      onSaveCategory,
      onToggleCategoryVisibility,
    ],
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
          // styles.page sets minHeight:700 at max-height:550px to "ensure
          // scrollability on small screens". On this page that backfires:
          // a 700px container in a <700px viewport creates two nested scroll
          // contexts, breaking position:sticky. We already have overflowY:auto
          // so the internal scroll is sufficient — override the minHeight.
          '@media (max-height: 550px)': {
            minHeight: 0,
          },
          [`@media (max-width: ${tokens.breakpoint_small})`]: {
            padding: '16px 16px 24px',
          },
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1480,
            alignSelf: 'center',
            gap: 24,
          }}
        >
          <View
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              position: 'sticky',
              top: 0,
              zIndex: 3,
              backgroundColor: theme.pageBackground,
              [`@media (max-width: ${tokens.breakpoint_small})`]: {
                alignItems: 'stretch',
                flexDirection: 'column',
              },
            }}
          >
            <Text style={{ ...displayLg, color: theme.pageTextDark }}>
              <Trans>Categories</Trans>
            </Text>
            <View
              style={{
                alignItems: 'flex-end',
                [`@media (max-width: ${tokens.breakpoint_small})`]: {
                  alignItems: 'stretch',
                },
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  [`@media (max-width: ${tokens.breakpoint_small})`]: {
                    alignItems: 'stretch',
                    flexDirection: 'column',
                  },
                }}
              >
                <CategoryMonthControls
                  startMonth={startMonth}
                  bounds={budgetBounds}
                  onMonthSelect={month => {
                    void onMonthSelect(month);
                  }}
                />
                <Button
                  variant="primary"
                  aria-label={t('Add category group')}
                  onPress={onOpenNewCategoryGroupModal}
                  style={{
                    gap: 8,
                  }}
                >
                  <SvgAdd width={12} height={12} />
                  <Trans>Add group</Trans>
                </Button>
              </View>
            </View>
          </View>

          <CategoryOverview
            budgetType={budgetType}
            monthLabel={monthLabel}
            groupCount={visibleGroups.length}
            categoryCount={visibleCategoryCount}
          />

          <CategoryListPanel
            budgetType={budgetType}
            groups={visibleGroups}
            onAddCategoryGroup={onOpenNewCategoryGroupModal}
            onOpenCategoryGroupMenu={onOpenCategoryGroupMenuModal}
            onOpenCategoryMenu={onOpenCategoryMenuModal}
            startMonth={startMonth}
          />
        </View>
      </View>
    </SheetNameProvider>
  );
}
