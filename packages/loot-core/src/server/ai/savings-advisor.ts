import * as db from '#server/db';
import * as monthUtils from '#shared/months';
import { integerToAmount } from '#shared/util';

import {
  getOllamaConfig,
  requestOllamaSavingsAdvice,
  requestOllamaSavingsChat,
} from './ollama-client';
import type {
  SavingsAdvisorChatMessage,
  SavingsAdvisorChatResponse,
  SavingsAdvisorResponse,
} from './types';

type MonthlyCategoryRow = {
  month: string;
  category_name: string | null;
  group_name: string | null;
  payee_name: string | null;
  amount: number;
};

type MonthlyNetRow = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

function dollars(amount: number) {
  return Number(integerToAmount(amount).toFixed(2));
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
    summary: `Savings rate is ${Math.round(metrics.savingsRate * 100)}% this month, with ${dollars(metrics.monthExpenses)} in expenses against ${dollars(metrics.monthIncome)} in income.`,
    topActions: actions.slice(0, 3),
    riskFlags: metrics.savingsRate < 0 ? ['Negative savings rate'] : [],
  };
}

export type SavingsAdvisorMetrics = {
  month: string;
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

function buildChatSafeMetrics(
  metrics: SavingsAdvisorSummaryMetrics,
): SavingsAdvisorChatMetrics {
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
  };
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
  month,
}: {
  month?: string;
} = {}): Promise<{
  metrics: SavingsAdvisorMetrics;
  summarizedForModel: SavingsAdvisorSummaryMetrics;
  chatSafeMetrics: SavingsAdvisorChatMetrics;
  range: SavingsAdvisorRange;
}> {
  const targetMonth = month ?? monthUtils.currentMonth();
  const startMonth = monthUtils.subMonths(targetMonth, 5);
  const startDate = monthUtils.firstDayOfMonth(startMonth);
  const endDate = monthUtils.lastDayOfMonth(targetMonth);
  const monthStart = monthUtils.firstDayOfMonth(targetMonth);
  const monthEnd = monthUtils.lastDayOfMonth(targetMonth);

  const rows = await db.all<MonthlyCategoryRow>(
    `SELECT substr(t.date, 1, 7) AS month,
            c.name AS category_name,
            g.name AS group_name,
            p.name AS payee_name,
            t.amount
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account AND a.tombstone = 0
       LEFT JOIN categories c ON c.id = t.category AND c.tombstone = 0
       LEFT JOIN category_groups g ON g.id = c.cat_group AND g.tombstone = 0
       LEFT JOIN payees p ON p.id = t.payee AND p.tombstone = 0
      WHERE t.date >= ?
        AND t.date <= ?
        AND t.is_parent = 0
        AND IFNULL(a.offbudget, 0) = 0`,
    [startDate, endDate],
  );

  const currentRows = rows.filter(row => row.month === targetMonth);
  const monthIncome = currentRows
    .filter(row => row.amount > 0)
    .reduce((sum, row) => sum + row.amount, 0);
  const monthExpenses = Math.abs(
    currentRows
      .filter(row => row.amount < 0)
      .reduce((sum, row) => sum + row.amount, 0),
  );
  const savingsRate =
    monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome : 0;

  const rentSpend = Math.abs(
    currentRows
      .filter(row =>
        includesAny(
          `${row.category_name ?? ''} ${row.group_name ?? ''} ${row.payee_name ?? ''}`,
          ['rent', 'mortgage', 'housing', 'apartment', 'landlord'],
        ),
      )
      .reduce((sum, row) => (row.amount < 0 ? sum + row.amount : sum), 0),
  );

  const fixedSpend = Math.abs(
    currentRows
      .filter(row =>
        includesAny(
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
        ),
      )
      .reduce((sum, row) => (row.amount < 0 ? sum + row.amount : sum), 0),
  );

  const discretionarySpend = Math.abs(
    currentRows
      .filter(row =>
        includesAny(
          `${row.category_name ?? ''} ${row.group_name ?? ''} ${row.payee_name ?? ''}`,
          [
            'food',
            'dining',
            'restaurant',
            'shopping',
            'entertainment',
            'travel',
          ],
        ),
      )
      .reduce((sum, row) => (row.amount < 0 ? sum + row.amount : sum), 0),
  );

  const foodDiningByMonth = new Map<string, number>();
  for (const row of rows) {
    if (
      row.amount < 0 &&
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
        (foodDiningByMonth.get(row.month) ?? 0) + Math.abs(row.amount),
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
  for (const row of rows) {
    if (
      row.amount < 0 &&
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
      current.amount += Math.abs(row.amount);
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

  const debtPayments = Math.abs(
    currentRows
      .filter(row =>
        includesAny(`${row.category_name ?? ''} ${row.group_name ?? ''}`, [
          'loan',
          'debt',
          'credit card',
        ]),
      )
      .reduce((sum, row) => (row.amount < 0 ? sum + row.amount : sum), 0),
  );

  const byMonth = new Map<string, MonthlyNetRow>();
  for (const row of rows) {
    const current = byMonth.get(row.month) ?? {
      month: row.month,
      income: 0,
      expenses: 0,
      net: 0,
    };

    if (row.amount > 0) {
      current.income += row.amount;
    } else {
      current.expenses += Math.abs(row.amount);
    }
    current.net += row.amount;
    byMonth.set(row.month, current);
  }

  const monthlyCashFlow = [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(row => ({
      month: row.month,
      income: dollars(row.income),
      expenses: dollars(row.expenses),
      net: dollars(row.net),
    }));

  const metrics: SavingsAdvisorMetrics = {
    month: targetMonth,
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
  };

  const summarizedForModel = summarizeMetrics(metrics);
  const chatSafeMetrics = buildChatSafeMetrics(summarizedForModel);

  return {
    metrics,
    summarizedForModel,
    chatSafeMetrics,
    range: { startDate, endDate, monthStart, monthEnd },
  };
}

export async function getSavingsAdvisor({ month }: { month?: string } = {}) {
  const { metrics, summarizedForModel, range } =
    await buildSavingsAdvisorContext({ month });

  const modelResult = await requestOllamaSavingsAdvice(summarizedForModel);

  return {
    metrics: summarizedForModel,
    promptVersion: modelResult.promptVersion,
    response: modelResult.response ?? fallbackAdvice(metrics),
    range,
  };
}

export async function getSavingsAdvisorChat({
  month,
  messages,
}: {
  month?: string;
  messages?: SavingsAdvisorChatMessage[];
} = {}): Promise<SavingsAdvisorChatResponse> {
  const normalizedMessages = validateChatMessages(messages);
  const { model } = getOllamaConfig();

  if (!normalizedMessages) {
    return {
      reply: null,
      model,
      promptVersion: 'advisor-chat-v1',
      error: 'invalid_messages',
    };
  }

  const { chatSafeMetrics } = await buildSavingsAdvisorContext({ month });
  const modelResult = await requestOllamaSavingsChat({
    metrics: chatSafeMetrics,
    messages: normalizedMessages,
  });

  if (!modelResult.reply) {
    return {
      reply: null,
      model: modelResult.model,
      promptVersion: modelResult.promptVersion,
      error: 'unavailable',
    };
  }

  return {
    reply: modelResult.reply,
    model: modelResult.model,
    promptVersion: modelResult.promptVersion,
  };
}
