import { getSheetValue } from '#server/budget/actions';
import * as db from '#server/db';
import * as monthUtils from '#shared/months';
import { isReportingExcludedPaymentTransfer } from '#shared/payment-transfers';
import { integerToAmount } from '#shared/util';

import {
  getOllamaConfig,
  requestOllamaSavingsAdvice,
  requestOllamaSavingsChat,
} from './ollama-client';
import type {
  SavingsAdvisorChatAllocation,
  SavingsAdvisorChatMessage,
  SavingsAdvisorChatResponse,
  SavingsAdvisorResponse,
} from './types';

type MonthlyCategoryRow = {
  month: string;
  category_id: string | null;
  category_name: string | null;
  group_id: string | null;
  group_name: string | null;
  account_name: string | null;
  payee_name: string | null;
  imported_payee?: string | null;
  notes?: string | null;
  is_income: 1 | 0 | null;
  amount: number;
};

type MonthlyNetRow = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

type TopSpendingCategory = {
  categoryId: string | null;
  categoryName: string;
  groupId: string | null;
  groupName: string;
  amount: number;
  budgeted: number;
  variance: number;
};

type TopSpendingGroup = {
  groupId: string | null;
  groupName: string;
  amount: number;
  budgeted: number;
  variance: number;
};

type SpendingGroupBreakdown = {
  groupId: string | null;
  groupName: string;
  amount: number;
  budgeted: number;
  variance: number;
  categories: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: number;
    budgeted: number;
    variance: number;
  }>;
};

type SpendingPayeeDriver = {
  payeeName: string;
  groupName: string;
  categoryName: string;
  amount: number;
  transactionCount: number;
};

type SavingsAdvisorAllocationAnalysis = {
  monthlyIncome: number;
  totalPercent: number;
  buckets: Array<{
    groupId: string;
    groupName: string;
    percent: number;
    target: number;
    actual: number;
    variance: number;
    status: 'over' | 'under' | 'on_track';
    topCategories: Array<{
      categoryName: string;
      amount: number;
    }>;
  }>;
};

function dollars(amount: number) {
  return Number(integerToAmount(amount).toFixed(2));
}

function roundDollarAmount(amount: number) {
  return Number(amount.toFixed(2));
}

function formatDollarValue(amount: number) {
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatMonthLabel(month: string) {
  return monthUtils.format(month, 'MMMM yyyy');
}

function formatDollars(amount: number) {
  const absoluteAmount = Math.abs(dollars(amount));
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteAmount);

  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const avg = average(values);
  const variance = average(values.map(value => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function includesAny(value: string, needles: string[]) {
  const lower = value.toLowerCase();
  return needles.some(needle => lower.includes(needle));
}

function fallbackAdvice(
  metrics: SavingsAdvisorMetrics,
): SavingsAdvisorResponse {
  const actions = [];

  if (metrics.rentToIncomeRatio != null && metrics.rentToIncomeRatio > 0.35) {
    actions.push({
      title: 'Reduce housing pressure',
      impactEstimate: 'Review fixed housing costs',
      reason: `Rent and housing-like spend is ${Math.round(metrics.rentToIncomeRatio * 100)}% of income.`,
    });
  }

  if (metrics.foodDiningTrendPct > 0.15) {
    actions.push({
      title: 'Cap food and dining increases',
      impactEstimate: 'Set a weekly dining limit',
      reason: `Food and dining is ${Math.round(metrics.foodDiningTrendPct * 100)}% above the recent average.`,
    });
  }

  if (metrics.cashFlowVolatility > dollars(metrics.monthIncome) * 0.25) {
    actions.push({
      title: 'Stabilize cash flow',
      impactEstimate: 'Keep a larger operating buffer',
      reason: 'Monthly net cash flow varies materially across recent months.',
    });
  }

  return {
    summary: `You spent ${formatDollars(metrics.monthExpenses)} against ${formatDollars(metrics.monthIncome)} in income this month, leaving cash flow ${formatDollars(metrics.monthIncome - metrics.monthExpenses)}.`,
    topActions: actions.slice(0, 3),
    riskFlags: metrics.savingsRate < 0 ? ['Negative savings rate'] : [],
  };
}

export type SavingsAdvisorMetrics = {
  currentDate: string;
  currentMonth: string;
  month: string;
  selectedMonthStatus: 'past' | 'current' | 'future';
  monthIncome: number;
  monthExpenses: number;
  savingsRate: number;
  rentToIncomeRatio: number | null;
  fixedSpend: number;
  discretionarySpend: number;
  foodDiningSpend: number;
  foodDiningThreeMonthAverage: number;
  foodDiningTrendPct: number;
  recurringSubscriptions: Array<{
    payee: string;
    monthlyAverage: number;
    monthsSeen: number;
  }>;
  debtPayments: number;
  cashFlowVolatility: number;
  monthlyCashFlow: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  topSpendingCategories: TopSpendingCategory[];
  topSpendingGroups: TopSpendingGroup[];
  spendingGroupBreakdowns: SpendingGroupBreakdown[];
  topSpendingPayees: SpendingPayeeDriver[];
};

type SavingsAdvisorRange = {
  startDate: string;
  endDate: string;
  monthStart: string;
  monthEnd: string;
};

type SavingsAdvisorSummaryMetrics = Omit<
  SavingsAdvisorMetrics,
  | 'monthIncome'
  | 'monthExpenses'
  | 'fixedSpend'
  | 'discretionarySpend'
  | 'foodDiningSpend'
  | 'foodDiningThreeMonthAverage'
  | 'debtPayments'
> & {
  monthIncome: number;
  monthExpenses: number;
  fixedSpend: number;
  discretionarySpend: number;
  foodDiningSpend: number;
  foodDiningThreeMonthAverage: number;
  debtPayments: number;
};

type SavingsAdvisorChatMetrics = Omit<
  SavingsAdvisorSummaryMetrics,
  'recurringSubscriptions'
> & {
  recurringSubscriptions: {
    count: number;
    totalMonthlyAverage: number;
    highestMonthlyAverage: number;
  };
  allocationAnalysis: SavingsAdvisorAllocationAnalysis | null;
};

function summarizeMetrics(
  metrics: SavingsAdvisorMetrics,
): SavingsAdvisorSummaryMetrics {
  return {
    ...metrics,
    monthIncome: dollars(metrics.monthIncome),
    monthExpenses: dollars(metrics.monthExpenses),
    fixedSpend: dollars(metrics.fixedSpend),
    discretionarySpend: dollars(metrics.discretionarySpend),
    foodDiningSpend: dollars(metrics.foodDiningSpend),
    foodDiningThreeMonthAverage: dollars(metrics.foodDiningThreeMonthAverage),
    debtPayments: dollars(metrics.debtPayments),
  };
}

function localCurrentDay() {
  return monthUtils.dayFromDate(new Date());
}

function getSelectedMonthStatus(
  selectedMonth: string,
  currentMonth: string,
): SavingsAdvisorMetrics['selectedMonthStatus'] {
  if (selectedMonth < currentMonth) {
    return 'past';
  }

  if (selectedMonth > currentMonth) {
    return 'future';
  }

  return 'current';
}

function isIncomeRow(row: MonthlyCategoryRow) {
  if (row.is_income != null) {
    return row.is_income === 1;
  }

  return row.amount > 0;
}

function signedSpendAmount(row: MonthlyCategoryRow) {
  if (isIncomeRow(row)) {
    return 0;
  }

  return Math.abs(row.amount);
}

async function getBudgetSheetValue(month: string, cell: string) {
  try {
    return await getSheetValue(`budget${month.replace('-', '')}`, cell);
  } catch {
    return null;
  }
}

function sanitizeModelAdvice(
  response: SavingsAdvisorResponse | null,
  metrics: SavingsAdvisorMetrics,
): SavingsAdvisorResponse | null {
  if (!response) {
    return null;
  }

  const serialized = JSON.stringify(response).toLowerCase();
  const hasActivity = metrics.monthIncome > 0 || metrics.monthExpenses > 0;
  const summary = response.summary.trim().toLowerCase();
  const hasDebugStyleSummary =
    response.summary.length > 280 ||
    includesAny(summary, [
      "the user's",
      'financial metrics',
      'provided data',
      'aggregate metrics',
      'financial snapshot',
      'financial profile',
    ]);
  const falselySaysFuture =
    metrics.selectedMonthStatus !== 'future' &&
    (serialized.includes('future date') ||
      serialized.includes('future period') ||
      serialized.includes('not a real financial period'));
  const falselySaysEmpty =
    hasActivity &&
    (serialized.includes('empty financial profile') ||
      serialized.includes('all metrics are zero') ||
      serialized.includes('no income, expenses') ||
      serialized.includes('no transactions have been processed'));

  if (falselySaysFuture || falselySaysEmpty || hasDebugStyleSummary) {
    return null;
  }

  return {
    ...response,
    riskFlags:
      metrics.selectedMonthStatus === 'future'
        ? response.riskFlags
        : response.riskFlags.filter(
            flag => !/future|date|not a real financial period/i.test(flag),
          ),
  };
}

function normalizeAllocationInput(
  allocation: SavingsAdvisorChatAllocation | undefined,
): SavingsAdvisorChatAllocation | null {
  if (!allocation || !Array.isArray(allocation.buckets)) {
    return null;
  }

  const monthlyIncome =
    typeof allocation.monthlyIncome === 'number' &&
    Number.isFinite(allocation.monthlyIncome)
      ? dollars(Math.max(0, allocation.monthlyIncome))
      : 0;
  const buckets = allocation.buckets.flatMap(bucket => {
    if (
      !bucket ||
      typeof bucket.groupId !== 'string' ||
      typeof bucket.groupName !== 'string' ||
      typeof bucket.percent !== 'number' ||
      !Number.isFinite(bucket.percent)
    ) {
      return [];
    }

    return [
      {
        groupId: bucket.groupId,
        groupName: bucket.groupName,
        percent: Math.max(0, bucket.percent),
      },
    ];
  });

  return buckets.length > 0 ? { monthlyIncome, buckets } : null;
}

function buildAllocationAnalysis({
  allocation,
  metrics,
}: {
  allocation: SavingsAdvisorChatAllocation | undefined;
  metrics: SavingsAdvisorSummaryMetrics;
}): SavingsAdvisorAllocationAnalysis | null {
  const normalizedAllocation = normalizeAllocationInput(allocation);
  if (!normalizedAllocation) {
    return null;
  }

  const monthlyIncome =
    normalizedAllocation.monthlyIncome > 0
      ? normalizedAllocation.monthlyIncome
      : metrics.monthIncome;
  const totalPercent = normalizedAllocation.buckets.reduce(
    (sum, bucket) => sum + bucket.percent,
    0,
  );
  const groupsById = new Map(
    metrics.spendingGroupBreakdowns
      .filter(group => group.groupId)
      .map(group => [group.groupId, group]),
  );
  const groupsByName = new Map(
    metrics.spendingGroupBreakdowns.map(group => [
      normalizeSearchLabel(group.groupName),
      group,
    ]),
  );

  return {
    monthlyIncome,
    totalPercent,
    buckets: normalizedAllocation.buckets.map(bucket => {
      const group =
        groupsById.get(bucket.groupId) ??
        groupsByName.get(normalizeSearchLabel(bucket.groupName));
      const target = roundDollarAmount((monthlyIncome * bucket.percent) / 100);
      const actual = group?.amount ?? 0;
      const variance = roundDollarAmount(actual - target);
      const status =
        Math.abs(variance) < 0.005
          ? 'on_track'
          : variance > 0
            ? 'over'
            : 'under';

      return {
        groupId: bucket.groupId,
        groupName: group?.groupName ?? bucket.groupName,
        percent: bucket.percent,
        target,
        actual,
        variance,
        status,
        topCategories:
          group?.categories.slice(0, 5).map(category => ({
            categoryName: category.categoryName,
            amount: category.amount,
          })) ?? [],
      };
    }),
  };
}

function buildChatSafeMetrics({
  allocation,
  metrics,
}: {
  allocation?: SavingsAdvisorChatAllocation;
  metrics: SavingsAdvisorSummaryMetrics;
}): SavingsAdvisorChatMetrics {
  const subscriptionAverages = metrics.recurringSubscriptions.map(
    subscription => subscription.monthlyAverage,
  );

  return {
    ...metrics,
    recurringSubscriptions: {
      count: metrics.recurringSubscriptions.length,
      totalMonthlyAverage: dollars(
        subscriptionAverages.reduce((sum, amount) => sum + amount, 0),
      ),
      highestMonthlyAverage: Math.max(0, ...subscriptionAverages),
    },
    allocationAnalysis: buildAllocationAnalysis({ allocation, metrics }),
  };
}

function asksForTopSpendingGroup(question: string) {
  const hasRankingWord = /\b(biggest|largest|top|highest|most)\b/.test(
    question,
  );
  const asksForGroup = /\b(group|groups|bucket|buckets)\b/.test(question);
  const asksForHighLevel = /\bhigh[-\s]?level\b|\btop[-\s]?level\b/.test(
    question,
  );

  return hasRankingWord && (asksForGroup || asksForHighLevel);
}

function asksForTopSpendingCategory(question: string) {
  const hasRankingWord = /\b(biggest|largest|top|highest|most)\b/.test(
    question,
  );
  const asksForCategory = /\b(category|categories)\b/.test(question);
  const asksAboutSpending = /\b(spending|spend|expense|expenses)\b/.test(
    question,
  );

  return (
    hasRankingWord &&
    (asksForCategory || asksAboutSpending) &&
    !asksForTopSpendingGroup(question)
  );
}

function normalizeSearchLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findRequestedGroup(
  question: string,
  metrics: SavingsAdvisorChatMetrics,
) {
  const normalizedQuestion = normalizeSearchLabel(question);

  return metrics.spendingGroupBreakdowns.find(group => {
    const normalizedGroup = normalizeSearchLabel(group.groupName);
    return new RegExp(`(^| )${normalizedGroup}( |$)`).test(normalizedQuestion);
  });
}

function asksForGroupCategoryBreakdown(question: string) {
  return (
    /\b(show|list|breakdown|detail|details|each|items?|categories|category|spent|spending)\b/.test(
      question,
    ) && /\b(group|bucket|category|categories|items?)\b/.test(question)
  );
}

function asksForMonthChange(question: string) {
  return /\b(changed|change|different|difference|month over month|month-over-month)\b/.test(
    question,
  );
}

function asksForSavingsAdvice(question: string) {
  return /\b(save|savings|reduce|cut|lower|improve|improved|improvement|review)\b/.test(
    question,
  );
}

function asksForOverBudgetCategories(question: string) {
  return /\b(over[-\s]?budget|overspend|overspent|over[-\s]?spent|over target|above budget|exceeded|exceeding)\b/.test(
    question,
  );
}

function asksForAllocationImprovement(question: string) {
  return (
    /\b(30[/-]30[/-]40|allocation|rule|target|bucket|buckets|fixed|fun|future me|future)\b/.test(
      question,
    ) && asksForSavingsAdvice(question)
  );
}

function buildMonthChangeReply(metrics: SavingsAdvisorChatMetrics) {
  const currentMonthFlow = metrics.monthlyCashFlow.find(
    row => row.month === metrics.month,
  );
  const previousMonthFlow = [...metrics.monthlyCashFlow]
    .filter(row => row.month < metrics.month)
    .at(-1);

  if (!currentMonthFlow || !previousMonthFlow) {
    return `No prior-month aggregate cash-flow data is available for ${formatMonthLabel(metrics.month)}.`;
  }

  const incomeChange = currentMonthFlow.income - previousMonthFlow.income;
  const expenseChange = currentMonthFlow.expenses - previousMonthFlow.expenses;
  const netChange = currentMonthFlow.net - previousMonthFlow.net;

  return [
    `Income ${incomeChange >= 0 ? 'increased' : 'decreased'} by ${formatDollarValue(Math.abs(incomeChange))} from ${formatMonthLabel(previousMonthFlow.month)}.`,
    `Expenses ${expenseChange >= 0 ? 'increased' : 'decreased'} by ${formatDollarValue(Math.abs(expenseChange))}.`,
    `Net cash flow ${netChange >= 0 ? 'improved' : 'worsened'} by ${formatDollarValue(Math.abs(netChange))}.`,
  ].join('\n');
}

function getOverBudgetCategories(metrics: SavingsAdvisorChatMetrics) {
  return metrics.spendingGroupBreakdowns
    .flatMap(group =>
      group.categories.map(category => ({
        ...category,
        groupName: group.groupName,
      })),
    )
    .filter(category => category.budgeted > 0 && category.variance > 0)
    .sort((a, b) => b.variance - a.variance);
}

function buildOverBudgetCategoryReply(metrics: SavingsAdvisorChatMetrics) {
  const overBudgetCategories = getOverBudgetCategories(metrics);
  const monthLabel = formatMonthLabel(metrics.month);

  if (overBudgetCategories.length === 0) {
    return `No categories are over budget in ${monthLabel}.`;
  }

  return [
    `Categories over budget in ${monthLabel}:`,
    ...overBudgetCategories
      .slice(0, 8)
      .map(
        category =>
          `${category.categoryName} (${category.groupName}): over by ${formatDollarValue(category.variance)}. Spent ${formatDollarValue(category.amount)} against ${formatDollarValue(category.budgeted)}.`,
      ),
  ].join('\n');
}

function buildSavingsAdviceFallbackReply(metrics: SavingsAdvisorChatMetrics) {
  const allocationReply = buildAllocationImprovementReply(metrics);
  if (allocationReply) {
    return allocationReply;
  }

  const overBudgetCategories = getOverBudgetCategories(metrics);
  if (overBudgetCategories.length > 0) {
    return [
      `Start with these over-budget categories in ${formatMonthLabel(metrics.month)}:`,
      ...overBudgetCategories.slice(0, 4).map(category => {
        const drivers = metrics.topSpendingPayees
          .filter(payee => payee.categoryName === category.categoryName)
          .slice(0, 2)
          .map(payee => `${payee.payeeName} ${formatDollarValue(payee.amount)}`)
          .join(', ');

        return `${category.categoryName} (${category.groupName}) is over by ${formatDollarValue(category.variance)}: spent ${formatDollarValue(category.amount)} against ${formatDollarValue(category.budgeted)}.${drivers ? ` Main drivers: ${drivers}.` : ''}`;
      }),
    ].join('\n');
  }

  const topCategories = metrics.topSpendingCategories.slice(0, 4);
  if (topCategories.length === 0) {
    return `No spending categories are available for ${formatMonthLabel(metrics.month)}.`;
  }

  return [
    `Review these largest spending categories in ${formatMonthLabel(metrics.month)}:`,
    ...topCategories.map(
      category =>
        `${category.categoryName} (${category.groupName}): ${formatDollarValue(category.amount)}.`,
    ),
  ].join('\n');
}

function buildAllocationImprovementReply(metrics: SavingsAdvisorChatMetrics) {
  const analysis = metrics.allocationAnalysis;
  if (!analysis) {
    return null;
  }

  const monthLabel = formatMonthLabel(metrics.month);
  const overTargetBuckets = analysis.buckets
    .filter(bucket => bucket.variance > 0)
    .sort((a, b) => b.variance - a.variance);
  const bucketsToReview =
    overTargetBuckets.length > 0
      ? overTargetBuckets
      : [...analysis.buckets].sort((a, b) => b.actual - a.actual).slice(0, 2);

  if (bucketsToReview.length === 0) {
    return `No allocation buckets are available for ${monthLabel}.`;
  }

  const lines = bucketsToReview.map(bucket => {
    const drivers = bucket.topCategories
      .slice(0, 3)
      .map(
        category =>
          `${category.categoryName} ${formatDollarValue(category.amount)}`,
      )
      .join(', ');
    const status =
      bucket.variance > 0
        ? `over target by ${formatDollarValue(bucket.variance)}`
        : `under target by ${formatDollarValue(Math.abs(bucket.variance))}`;

    return `${bucket.groupName}: ${status}. Target ${formatDollarValue(bucket.target)} (${bucket.percent}%), actual ${formatDollarValue(bucket.actual)}.${drivers ? ` Main drivers: ${drivers}.` : ''}`;
  });

  return [
    `For the allocation rule in ${monthLabel}, review these buckets first:`,
    ...lines,
  ].join('\n');
}

function buildDirectChatReply(
  metrics: SavingsAdvisorChatMetrics,
  messages: SavingsAdvisorChatMessage[],
) {
  const question = messages.at(-1)?.content.toLowerCase() ?? '';
  const requestedGroup = findRequestedGroup(question, metrics);
  const monthLabel = formatMonthLabel(metrics.month);

  if (requestedGroup && asksForGroupCategoryBreakdown(question)) {
    if (requestedGroup.categories.length === 0) {
      return `No spending categories are available for ${requestedGroup.groupName} in ${monthLabel}.`;
    }

    return [
      `${requestedGroup.groupName} category totals in ${monthLabel}:`,
      ...requestedGroup.categories.map(
        category =>
          `${category.categoryName}: ${formatDollarValue(category.amount)}`,
      ),
    ].join('\n');
  }

  if (asksForTopSpendingGroup(question)) {
    const topGroup = metrics.topSpendingGroups.at(0);
    return topGroup
      ? `The biggest spending group in ${monthLabel} is ${topGroup.groupName} at ${formatDollarValue(topGroup.amount)}.`
      : `No spending categories are available for ${monthLabel}.`;
  }

  if (asksForTopSpendingCategory(question)) {
    const topCategory = metrics.topSpendingCategories.at(0);
    return topCategory
      ? `The biggest spending category in ${monthLabel} is ${topCategory.categoryName} (${topCategory.groupName}) at ${formatDollarValue(topCategory.amount)}.`
      : `No spending categories are available for ${monthLabel}.`;
  }

  if (asksForOverBudgetCategories(question)) {
    return buildOverBudgetCategoryReply(metrics);
  }

  if (asksForAllocationImprovement(question)) {
    return buildAllocationImprovementReply(metrics);
  }

  if (asksForMonthChange(question)) {
    return buildMonthChangeReply(metrics);
  }

  return null;
}

function validateChatMessages(
  messages: SavingsAdvisorChatMessage[] | undefined,
): SavingsAdvisorChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const normalized = messages
    .slice(-12)
    .map(message => ({
      role: message.role,
      content:
        typeof message.content === 'string' ? message.content.trim() : '',
    }))
    .filter(message => message.content.length > 0);

  if (
    normalized.length === 0 ||
    normalized.some(
      message =>
        (message.role !== 'user' && message.role !== 'assistant') ||
        message.content.length > 2000,
    ) ||
    normalized.at(-1)?.role !== 'user'
  ) {
    return null;
  }

  return normalized;
}

async function buildSavingsAdvisorContext({
  allocation,
  month,
}: {
  allocation?: SavingsAdvisorChatAllocation;
  month?: string;
} = {}): Promise<{
  metrics: SavingsAdvisorMetrics;
  summarizedForModel: SavingsAdvisorSummaryMetrics;
  chatSafeMetrics: SavingsAdvisorChatMetrics;
  range: SavingsAdvisorRange;
}> {
  const targetMonth = month ?? monthUtils.currentMonth();
  const currentDate = localCurrentDay();
  const currentMonth = monthUtils.monthFromDate(currentDate);
  const startMonth = monthUtils.subMonths(targetMonth, 5);
  const startDate = monthUtils.firstDayOfMonth(startMonth);
  const endDate = monthUtils.lastDayOfMonth(targetMonth);
  const startDateRepr = db.toDateRepr(startDate);
  const endDateRepr = db.toDateRepr(endDate);
  const monthStart = monthUtils.firstDayOfMonth(targetMonth);
  const monthEnd = monthUtils.lastDayOfMonth(targetMonth);
  const transactionMonthSql = `substr(CAST(t.date AS TEXT), 1, 4) || '-' || substr(CAST(t.date AS TEXT), 5, 2)`;

  const rows = await db.all<MonthlyCategoryRow>(
    `SELECT ${transactionMonthSql} AS month,
            c.id AS category_id,
            c.name AS category_name,
            g.id AS group_id,
            g.name AS group_name,
            a.name AS account_name,
            p.name AS payee_name,
            t.imported_payee,
            t.notes,
            c.is_income,
            t.amount
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account AND a.tombstone = 0
       LEFT JOIN categories c ON c.id = t.category AND c.tombstone = 0
       LEFT JOIN category_groups g ON g.id = c.cat_group AND g.tombstone = 0
       LEFT JOIN payees p ON p.id = t.payee AND p.tombstone = 0
      WHERE t.date >= ?
        AND t.date <= ?
        AND t.is_parent = 0
        AND IFNULL(a.offbudget, 0) = 0
        AND c.id IS NOT NULL`,
    [startDateRepr, endDateRepr],
  );

  const reportingRows = rows.filter(
    row =>
      !isReportingExcludedPaymentTransfer({
        categoryName: row.category_name,
        categoryGroupName: row.group_name,
        accountName: row.account_name,
        payeeName: row.payee_name,
        importedPayee: row.imported_payee,
        notes: row.notes,
      }),
  );

  const manualRows = await db.all<{
    name: string;
    amount: number;
    category_id: string | null;
    category_name: string | null;
    group_id: string | null;
    group_name: string | null;
    is_income: 1 | 0 | null;
    start_month: string;
    end_month: string | null;
  }>(
    `SELECT m.name,
            m.amount,
            c.id AS category_id,
            c.name AS category_name,
            g.id AS group_id,
            g.name AS group_name,
            c.is_income,
            m.start_month,
            m.end_month
       FROM manual_recurring_entries m
       LEFT JOIN categories c ON c.id = m.category AND c.tombstone = 0
       LEFT JOIN category_groups g ON g.id = c.cat_group AND g.tombstone = 0
      WHERE m.start_month <= ?
        AND (m.end_month IS NULL OR m.end_month >= ?)
        AND m.active = 1
        AND m.tombstone = 0
        AND m.cadence = 'monthly'`,
    [targetMonth, startMonth],
  );

  for (const manualRow of manualRows) {
    const manualStartMonth =
      manualRow.start_month > startMonth ? manualRow.start_month : startMonth;
    const manualEndMonth =
      manualRow.end_month && manualRow.end_month < targetMonth
        ? manualRow.end_month
        : targetMonth;

    for (const rowMonth of monthUtils.rangeInclusive(
      manualStartMonth,
      manualEndMonth,
    )) {
      reportingRows.push({
        month: rowMonth,
        category_id: manualRow.category_id,
        category_name: manualRow.category_name,
        group_id: manualRow.group_id,
        group_name: manualRow.group_name,
        account_name: null,
        payee_name: manualRow.name,
        imported_payee: null,
        notes: null,
        is_income: manualRow.is_income,
        amount: -Math.abs(manualRow.amount),
      });
    }
  }

  const currentRows = reportingRows.filter(row => row.month === targetMonth);
  const spendingCategories = new Map<string, TopSpendingCategory>();
  const spendingGroups = new Map<string, TopSpendingGroup>();
  const spendingPayees = new Map<string, SpendingPayeeDriver>();

  for (const row of currentRows) {
    if (isIncomeRow(row)) {
      continue;
    }

    const amount = signedSpendAmount(row);
    if (amount <= 0) {
      continue;
    }

    const categoryName = row.category_name ?? 'Uncategorized';
    const groupName = row.group_name ?? 'Other';
    const categoryKey = row.category_id ?? `${groupName}\u0000${categoryName}`;
    const currentCategory = spendingCategories.get(categoryKey) ?? {
      categoryId: row.category_id,
      categoryName,
      groupId: row.group_id,
      groupName,
      amount: 0,
      budgeted: 0,
      variance: 0,
    };
    currentCategory.amount += amount;
    spendingCategories.set(categoryKey, currentCategory);

    const groupKey = row.group_id ?? groupName;
    const currentGroup = spendingGroups.get(groupKey) ?? {
      groupId: row.group_id,
      groupName,
      amount: 0,
      budgeted: 0,
      variance: 0,
    };
    currentGroup.amount += amount;
    spendingGroups.set(groupKey, currentGroup);

    if (row.payee_name) {
      const payeeKey = `${groupKey}\u0000${categoryKey}\u0000${row.payee_name}`;
      const currentPayee = spendingPayees.get(payeeKey) ?? {
        payeeName: row.payee_name,
        groupName,
        categoryName,
        amount: 0,
        transactionCount: 0,
      };
      currentPayee.amount += amount;
      currentPayee.transactionCount += 1;
      spendingPayees.set(payeeKey, currentPayee);
    }
  }

  const topSpendingCategories = await Promise.all(
    [...spendingCategories.values()].map(async category => {
      const budgeted =
        category.categoryId == null
          ? 0
          : Math.abs(
              (await getBudgetSheetValue(
                targetMonth,
                `budget-${category.categoryId}`,
              )) ?? 0,
            );

      return {
        ...category,
        amount: dollars(category.amount),
        budgeted: dollars(budgeted),
        variance: dollars(category.amount - budgeted),
      };
    }),
  );
  topSpendingCategories.sort((a, b) => b.amount - a.amount);
  const topSpendingCategoryList = topSpendingCategories.slice(0, 10);
  const topSpendingGroups = await Promise.all(
    [...spendingGroups.values()].map(async group => {
      const budgeted =
        group.groupId == null
          ? 0
          : Math.abs(
              (await getBudgetSheetValue(
                targetMonth,
                `group-budget-${group.groupId}`,
              )) ?? 0,
            );

      return {
        ...group,
        amount: dollars(group.amount),
        budgeted: dollars(budgeted),
        variance: dollars(group.amount - budgeted),
      };
    }),
  );
  topSpendingGroups.sort((a, b) => b.amount - a.amount);
  const spendingGroupBreakdowns = topSpendingGroups.map(group => ({
    ...group,
    categories: topSpendingCategories
      .filter(category => category.groupName === group.groupName)
      .sort((a, b) => b.amount - a.amount),
  }));
  const topSpendingPayees = [...spendingPayees.values()]
    .map(payee => ({
      ...payee,
      amount: dollars(payee.amount),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  /*
   * Keep the sorted aggregate objects above as the only category/group facts
   * sent to chat. The raw row maps may contain account and transaction detail
   * and should not escape this context builder.
   */

  const rawMonthIncome = currentRows
    .filter(isIncomeRow)
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const rawMonthExpenses = currentRows.reduce(
    (sum, row) => sum + signedSpendAmount(row),
    0,
  );
  const [sheetMonthIncome, sheetMonthExpenses] = await Promise.all([
    getBudgetSheetValue(targetMonth, 'total-income'),
    getBudgetSheetValue(targetMonth, 'total-spent'),
  ]);
  const monthIncome =
    sheetMonthIncome == null ? rawMonthIncome : Math.abs(sheetMonthIncome);
  const monthExpenses =
    sheetMonthExpenses == null
      ? rawMonthExpenses
      : Math.abs(sheetMonthExpenses);
  const savingsRate =
    monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome : 0;

  const rentSpend = Math.abs(
    currentRows
      .filter(
        row =>
          !isIncomeRow(row) &&
          includesAny(
            `${row.category_name ?? ''} ${row.group_name ?? ''} ${row.payee_name ?? ''}`,
            ['rent', 'mortgage', 'housing', 'apartment', 'landlord'],
          ),
      )
      .reduce((sum, row) => sum + signedSpendAmount(row), 0),
  );

  const hasFixedGroup = currentRows.some(row =>
    includesAny(row.group_name ?? '', ['fixed']),
  );
  const fixedSpend = currentRows
    .filter(row => {
      if (isIncomeRow(row)) {
        return false;
      }

      if (hasFixedGroup) {
        return includesAny(row.group_name ?? '', ['fixed']);
      }

      return includesAny(
        `${row.category_name ?? ''} ${row.group_name ?? ''} ${row.payee_name ?? ''}`,
        [
          'rent',
          'mortgage',
          'insurance',
          'utility',
          'utilities',
          'subscription',
          'loan',
          'internet',
          'phone',
        ],
      );
    })
    .reduce((sum, row) => sum + signedSpendAmount(row), 0);

  const hasFunGroup = currentRows.some(row =>
    includesAny(row.group_name ?? '', ['fun']),
  );
  const discretionarySpend = currentRows
    .filter(row => {
      if (isIncomeRow(row)) {
        return false;
      }

      if (hasFunGroup) {
        return includesAny(row.group_name ?? '', ['fun']);
      }

      return includesAny(
        `${row.category_name ?? ''} ${row.group_name ?? ''} ${row.payee_name ?? ''}`,
        ['food', 'dining', 'restaurant', 'shopping', 'entertainment', 'travel'],
      );
    })
    .reduce((sum, row) => sum + signedSpendAmount(row), 0);

  const foodDiningByMonth = new Map<string, number>();
  for (const row of reportingRows) {
    if (
      !isIncomeRow(row) &&
      includesAny(`${row.category_name ?? ''} ${row.payee_name ?? ''}`, [
        'food',
        'dining',
        'restaurant',
        'grocery',
        'groceries',
      ])
    ) {
      foodDiningByMonth.set(
        row.month,
        (foodDiningByMonth.get(row.month) ?? 0) + signedSpendAmount(row),
      );
    }
  }

  const foodDiningSpend = foodDiningByMonth.get(targetMonth) ?? 0;
  const priorFoodMonths = [...foodDiningByMonth.entries()]
    .filter(([rowMonth]) => rowMonth < targetMonth)
    .slice(-3)
    .map(([, amount]) => amount);
  const foodDiningThreeMonthAverage = average(priorFoodMonths);
  const foodDiningTrendPct =
    foodDiningThreeMonthAverage > 0
      ? (foodDiningSpend - foodDiningThreeMonthAverage) /
        foodDiningThreeMonthAverage
      : 0;

  const subscriptionPayees = new Map<
    string,
    { amount: number; months: Set<string> }
  >();
  for (const row of reportingRows) {
    if (
      !isIncomeRow(row) &&
      row.payee_name &&
      includesAny(`${row.category_name ?? ''} ${row.payee_name}`, [
        'subscription',
        'netflix',
        'spotify',
        'audible',
        'apple',
        'google',
        'adobe',
        'openai',
      ])
    ) {
      const current = subscriptionPayees.get(row.payee_name) ?? {
        amount: 0,
        months: new Set<string>(),
      };
      current.amount += signedSpendAmount(row);
      current.months.add(row.month);
      subscriptionPayees.set(row.payee_name, current);
    }
  }

  const recurringSubscriptions = [...subscriptionPayees.entries()]
    .filter(([, value]) => value.months.size >= 2)
    .map(([payee, value]) => ({
      payee,
      monthlyAverage: dollars(value.amount / value.months.size),
      monthsSeen: value.months.size,
    }))
    .sort((a, b) => b.monthlyAverage - a.monthlyAverage)
    .slice(0, 10);

  const debtPayments = currentRows
    .filter(
      row =>
        !isIncomeRow(row) &&
        includesAny(`${row.category_name ?? ''} ${row.group_name ?? ''}`, [
          'loan',
          'debt',
          'credit card',
        ]),
    )
    .reduce((sum, row) => sum + signedSpendAmount(row), 0);

  const byMonth = new Map<string, MonthlyNetRow>();
  for (const row of reportingRows) {
    const current = byMonth.get(row.month) ?? {
      month: row.month,
      income: 0,
      expenses: 0,
      net: 0,
    };

    if (isIncomeRow(row)) {
      current.income += Math.abs(row.amount);
    } else {
      current.expenses += signedSpendAmount(row);
    }
    current.net += isIncomeRow(row)
      ? Math.abs(row.amount)
      : -signedSpendAmount(row);
    byMonth.set(row.month, current);
  }

  const monthlyCashFlow = await Promise.all(
    [...byMonth.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(async row => {
        const [sheetIncome, sheetExpenses] = await Promise.all([
          getBudgetSheetValue(row.month, 'total-income'),
          getBudgetSheetValue(row.month, 'total-spent'),
        ]);
        const income = sheetIncome == null ? row.income : Math.abs(sheetIncome);
        const expenses =
          sheetExpenses == null ? row.expenses : Math.abs(sheetExpenses);

        return {
          month: row.month,
          income: dollars(income),
          expenses: dollars(expenses),
          net: dollars(income - expenses),
        };
      }),
  );

  const metrics: SavingsAdvisorMetrics = {
    currentDate,
    currentMonth,
    month: targetMonth,
    selectedMonthStatus: getSelectedMonthStatus(targetMonth, currentMonth),
    monthIncome,
    monthExpenses,
    savingsRate,
    rentToIncomeRatio: monthIncome > 0 ? rentSpend / monthIncome : null,
    fixedSpend,
    discretionarySpend,
    foodDiningSpend,
    foodDiningThreeMonthAverage,
    foodDiningTrendPct,
    recurringSubscriptions,
    debtPayments,
    cashFlowVolatility: standardDeviation(monthlyCashFlow.map(row => row.net)),
    monthlyCashFlow,
    topSpendingCategories: topSpendingCategoryList,
    topSpendingGroups,
    spendingGroupBreakdowns,
    topSpendingPayees,
  };

  const summarizedForModel = summarizeMetrics(metrics);
  const chatSafeMetrics = buildChatSafeMetrics({
    allocation,
    metrics: summarizedForModel,
  });

  return {
    metrics,
    summarizedForModel,
    chatSafeMetrics,
    range: { startDate, endDate, monthStart, monthEnd },
  };
}

export async function getSavingsAdvisor({ month }: { month?: string } = {}) {
  const { metrics, summarizedForModel, chatSafeMetrics, range } =
    await buildSavingsAdvisorContext({ month });

  const modelResult = await requestOllamaSavingsAdvice(chatSafeMetrics);
  const modelResponse = sanitizeModelAdvice(modelResult.response, metrics);
  const deterministicAdvice = fallbackAdvice(metrics);

  return {
    metrics: summarizedForModel,
    model: modelResult.model,
    promptVersion: modelResult.promptVersion,
    response: {
      ...(modelResponse ?? deterministicAdvice),
      summary: deterministicAdvice.summary,
    },
    range,
  };
}

export async function getSavingsAdvisorChat({
  allocation,
  month,
  messages,
}: {
  allocation?: SavingsAdvisorChatAllocation;
  month?: string;
  messages?: SavingsAdvisorChatMessage[];
} = {}): Promise<SavingsAdvisorChatResponse> {
  const normalizedMessages = validateChatMessages(messages);
  const { model } = getOllamaConfig();

  if (!normalizedMessages) {
    return {
      reply: null,
      model,
      promptVersion: 'advisor-chat-v2',
      source: 'fallback',
      error: 'invalid_messages',
    };
  }

  const { chatSafeMetrics } = await buildSavingsAdvisorContext({
    allocation,
    month,
  });
  const directReply = buildDirectChatReply(chatSafeMetrics, normalizedMessages);

  if (directReply) {
    return {
      reply: directReply,
      model,
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    };
  }

  const modelResult = await requestOllamaSavingsChat({
    metrics: chatSafeMetrics,
    messages: normalizedMessages,
  });

  if (!modelResult.reply) {
    const fallbackReply = asksForSavingsAdvice(
      normalizedMessages.at(-1)?.content.toLowerCase() ?? '',
    )
      ? buildSavingsAdviceFallbackReply(chatSafeMetrics)
      : null;

    if (fallbackReply) {
      return {
        reply: fallbackReply,
        model: modelResult.model,
        promptVersion: modelResult.promptVersion,
        source: 'fallback',
      };
    }

    return {
      reply: null,
      model: modelResult.model,
      promptVersion: modelResult.promptVersion,
      source: 'fallback',
      error: 'unavailable',
    };
  }

  return {
    reply: modelResult.reply,
    model: modelResult.model,
    promptVersion: modelResult.promptVersion,
    source: 'ollama',
  };
}
