import { getSheetValue } from '#server/budget/actions';
import * as db from '#server/db';

import type * as OllamaClient from './ollama-client';
import {
  requestOllamaSavingsAdvice,
  requestOllamaSavingsChat,
  stripQwenThinking,
} from './ollama-client';
import { getSavingsAdvisor, getSavingsAdvisorChat } from './savings-advisor';
import type { SavingsAdvisorMetrics } from './savings-advisor';

vi.mock('./ollama-client', async importOriginal => {
  const actual = await importOriginal<typeof OllamaClient>();

  return {
    ...actual,
    getOllamaConfig: vi.fn(() => ({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:8b',
    })),
    requestOllamaSavingsAdvice: vi.fn(async () => ({
      model: 'qwen3:8b',
      promptVersion: 'advisor-v1',
      response: null,
    })),
    requestOllamaSavingsChat: vi.fn(async () => ({
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      reply: 'Review the aggregate savings rate first.',
    })),
  };
});

vi.mock('#server/budget/actions', () => ({
  getSheetValue: vi.fn(async () => {
    throw new Error('Missing sheet value');
  }),
}));

beforeEach(
  (
    global as typeof globalThis & { emptyDatabase: () => () => void }
  ).emptyDatabase(),
);

async function setupSavingsAdvisorFixture() {
  await db.insertAccount({ id: 'acct', name: 'Checking' });
  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'fixed-group', name: 'Fixed' });
  await db.insertCategoryGroup({ id: 'fun-group', name: 'Fun' });
  await db.insertCategoryGroup({
    id: 'transfers-group',
    name: 'Transfers & Payments',
  });
  const incomeCategoryId = await db.insertCategory({
    id: 'income',
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
  });
  const subscriptionCategoryId = await db.insertCategory({
    id: 'subscriptions',
    name: 'Subscriptions',
    cat_group: 'fixed-group',
  });
  const groceryCategoryId = await db.insertCategory({
    id: 'groceries',
    name: 'Groceries',
    cat_group: 'fun-group',
  });
  const creditCardPaymentsCategoryId = await db.insertCategory({
    id: 'credit-card-payments',
    name: 'Credit Card Payments',
    cat_group: 'transfers-group',
  });
  await db.insertPayee({ id: 'employer', name: 'Employer Inc' });
  await db.insertPayee({ id: 'netflix', name: 'Netflix' });
  await db.insertPayee({ id: 'transfer', name: 'Credit Card Payment' });
  await db.insertPayee({ id: 'grocery-payee', name: "Trader Joe's" });
  await db.insertPayee({ id: 'card-payee', name: 'Capital One' });

  await db.insertTransaction({
    id: 'income-may',
    account: 'acct',
    amount: 500000,
    date: '2026-05-01',
    payee: 'employer',
    category: incomeCategoryId,
    is_parent: 0,
  });

  for (const month of ['2026-03', '2026-04', '2026-05']) {
    await db.insertTransaction({
      id: `netflix-${month}`,
      account: 'acct',
      amount: -2000,
      date: `${month}-05`,
      payee: 'netflix',
      category: subscriptionCategoryId,
      is_parent: 0,
    });
  }

  await db.insertTransaction({
    id: 'uncategorized-transfer-may',
    account: 'acct',
    amount: -100000,
    date: '2026-05-08',
    payee: 'transfer',
    category: null,
    is_parent: 0,
  });

  await db.insertTransaction({
    id: 'groceries-may',
    account: 'acct',
    amount: -70000,
    date: '2026-05-09',
    payee: 'grocery-payee',
    category: groceryCategoryId,
    is_parent: 0,
  });

  await db.insertTransaction({
    id: 'credit-card-payment-may',
    account: 'acct',
    amount: -90000,
    date: '2026-05-12',
    payee: 'card-payee',
    category: creditCardPaymentsCategoryId,
    is_parent: 0,
  });

  await db.insertWithSchema('manual_recurring_entries', {
    id: 'manual-hsa',
    name: 'HSA contribution',
    amount: 50000,
    category: subscriptionCategoryId,
    start_month: '2026-05',
    end_month: null,
    day_of_month: 1,
    cadence: 'monthly',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tombstone: false,
  });
}

describe('Savings Advisor chat', () => {
  beforeEach(() => {
    vi.mocked(getSheetValue).mockReset();
    vi.mocked(getSheetValue).mockRejectedValue(
      new Error('Missing sheet value'),
    );
    vi.mocked(requestOllamaSavingsChat).mockClear();
    vi.mocked(requestOllamaSavingsChat).mockResolvedValue({
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      reply: 'Review the aggregate savings rate first.',
    });
  });

  it('sends local advisor facts with aggregate payee drivers but no raw row detail', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [
          { role: 'user', content: 'How should I think about this month?' },
        ],
      }),
    ).resolves.toMatchObject({
      reply: 'Review the aggregate savings rate first.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'ollama',
    });

    const [payload] = vi.mocked(requestOllamaSavingsChat).mock.calls[0];
    const metrics = payload.metrics as SavingsAdvisorMetrics;
    const serializedMetrics = JSON.stringify(metrics);

    expect(metrics.monthIncome).toBe(5000);
    expect(metrics.monthExpenses).toBe(1220);
    expect(metrics.topSpendingCategories).toContainEqual(
      expect.objectContaining({
        categoryName: 'Groceries',
        groupName: 'Fun',
        amount: 700,
      }),
    );
    expect(metrics.topSpendingCategories).toContainEqual(
      expect.objectContaining({
        categoryName: 'Subscriptions',
        groupName: 'Fixed',
        amount: 520,
      }),
    );
    expect(metrics.spendingGroupBreakdowns).toContainEqual(
      expect.objectContaining({
        groupName: 'Fixed',
        amount: 520,
        categories: expect.arrayContaining([
          expect.objectContaining({
            categoryName: 'Subscriptions',
            amount: 520,
          }),
        ]),
      }),
    );
    expect(metrics.topSpendingCategories).not.toContainEqual(
      expect.objectContaining({
        categoryName: 'Credit Card Payments',
      }),
    );
    expect(metrics.topSpendingPayees).toContainEqual(
      expect.objectContaining({
        payeeName: "Trader Joe's",
        categoryName: 'Groceries',
        amount: 700,
        transactionCount: 1,
      }),
    );
    expect(metrics.topSpendingPayees).toContainEqual(
      expect.objectContaining({
        payeeName: 'Netflix',
        categoryName: 'Subscriptions',
        amount: 20,
        transactionCount: 1,
      }),
    );
    expect(metrics.topSpendingPayees).toContainEqual(
      expect.objectContaining({
        payeeName: 'HSA contribution',
        categoryName: 'Subscriptions',
        amount: 500,
        transactionCount: 1,
      }),
    );
    expect(serializedMetrics).not.toContain('Employer Inc');
    expect(serializedMetrics).not.toContain('Capital One');
    expect(serializedMetrics).toContain('recurringSubscriptions');
    expect(serializedMetrics).toContain('totalMonthlyAverage');
  });

  it('uses qwen for broad spending-habit advice instead of deterministic canned advice', async () => {
    await setupSavingsAdvisorFixture();

    vi.mocked(requestOllamaSavingsChat).mockResolvedValueOnce({
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      reply:
        'Start with Groceries because it is the largest flexible category, then review Subscriptions because it is over target.',
    });

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [
          {
            role: 'user',
            content:
              'Based on the budget and actual spend tell me where I can improve my spending habit',
          },
        ],
      }),
    ).resolves.toMatchObject({
      reply:
        'Start with Groceries because it is the largest flexible category, then review Subscriptions because it is over target.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'ollama',
    });

    expect(requestOllamaSavingsChat).toHaveBeenCalledOnce();
  });

  it('answers direct top-category questions from aggregate rankings', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [
          {
            role: 'user',
            content: 'What is the biggest spending category in May 2026?',
          },
        ],
      }),
    ).resolves.toMatchObject({
      reply:
        'The biggest spending category in May 2026 is Groceries (Fun) at $700.00.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    });

    expect(requestOllamaSavingsChat).not.toHaveBeenCalled();
  });

  it('answers group item questions from aggregate category breakdowns', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [
          {
            role: 'user',
            content:
              'Show me how much I spent on each item in Fixed category in May 2026?',
          },
        ],
      }),
    ).resolves.toMatchObject({
      reply: 'Fixed category totals in May 2026:\nSubscriptions: $520.00',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    });

    expect(requestOllamaSavingsChat).not.toHaveBeenCalled();
  });

  it('answers overspend questions from over-budget category facts', async () => {
    await setupSavingsAdvisorFixture();

    vi.mocked(getSheetValue).mockImplementation(async (_sheetName, cell) => {
      if (cell === 'budget-subscriptions') {
        return 30000;
      }

      if (cell === 'budget-groceries') {
        return 65000;
      }

      throw new Error('Missing sheet value');
    });

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [
          { role: 'user', content: 'Which categories did I overspend?' },
        ],
      }),
    ).resolves.toMatchObject({
      reply:
        'Categories over budget in May 2026:\nSubscriptions (Fixed): over by $220.00. Spent $520.00 against $300.00.\nGroceries (Fun): over by $50.00. Spent $700.00 against $650.00.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    });

    expect(requestOllamaSavingsChat).not.toHaveBeenCalled();
  });

  it('answers direct top-group questions from aggregate rankings', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [
          {
            role: 'user',
            content: 'What is the biggest spending bucket in May 2026?',
          },
        ],
      }),
    ).resolves.toMatchObject({
      reply: 'The biggest spending group in May 2026 is Fun at $700.00.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    });

    expect(requestOllamaSavingsChat).not.toHaveBeenCalled();
  });

  it('answers allocation improvement questions from target-vs-actual facts', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        allocation: {
          monthlyIncome: 100000,
          buckets: [
            { groupId: 'fixed-group', groupName: 'Fixed', percent: 30 },
            { groupId: 'fun-group', groupName: 'Fun', percent: 30 },
          ],
        },
        month: '2026-05',
        messages: [
          {
            role: 'user',
            content:
              'For my 30/30/40 rule on fixed, fun, and future me, which spending could be improved?',
          },
        ],
      }),
    ).resolves.toMatchObject({
      reply:
        'For the allocation rule in May 2026, review these buckets first:\nFun: over target by $400.00. Target $300.00 (30%), actual $700.00. Main drivers: Groceries $700.00.\nFixed: over target by $220.00. Target $300.00 (30%), actual $520.00. Main drivers: Subscriptions $520.00.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    });

    expect(requestOllamaSavingsChat).not.toHaveBeenCalled();
  });

  it('rejects empty and non-user-terminal chat messages', async () => {
    await expect(
      getSavingsAdvisorChat({
        messages: [{ role: 'user', content: '   ' }],
      }),
    ).resolves.toMatchObject({
      reply: null,
      error: 'invalid_messages',
    });

    await expect(
      getSavingsAdvisorChat({
        messages: [
          { role: 'user', content: 'Where can I save?' },
          { role: 'assistant', content: 'Look at spending.' },
        ],
      }),
    ).resolves.toMatchObject({
      reply: null,
      error: 'invalid_messages',
    });
  });

  it('returns unavailable when Ollama does not reply', async () => {
    vi.mocked(requestOllamaSavingsChat).mockResolvedValueOnce({
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      reply: null,
    });

    await expect(
      getSavingsAdvisorChat({
        messages: [{ role: 'user', content: 'Can you explain my plan?' }],
      }),
    ).resolves.toMatchObject({
      reply: null,
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'fallback',
      error: 'unavailable',
    });
  });

  it('answers month-change questions deterministically', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [{ role: 'user', content: 'What changed this month?' }],
      }),
    ).resolves.toMatchObject({
      reply:
        'Income increased by $5,000.00 from April 2026.\nExpenses increased by $1,200.00.\nNet cash flow improved by $3,800.00.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'deterministic',
    });
  });

  it('does not use the old cash-flow sentence for unsupported questions', async () => {
    await setupSavingsAdvisorFixture();

    vi.mocked(requestOllamaSavingsChat).mockResolvedValueOnce({
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      reply: 'The user is asking for something unavailable.',
    });

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [{ role: 'user', content: 'Can you predict my taxes?' }],
      }),
    ).resolves.toMatchObject({
      reply: 'The user is asking for something unavailable.',
      model: 'qwen3:8b',
      promptVersion: 'advisor-chat-v2',
      source: 'ollama',
    });
  });

  it('strips qwen thinking blocks from visible replies', () => {
    expect(
      stripQwenThinking('<think>private reasoning</think>\nReview cash flow.'),
    ).toBe('Review cash flow.');
    expect(
      stripQwenThinking('private reasoning</think>\nReview cash flow.'),
    ).toBe('Review cash flow.');
  });

  it('falls back when model advice contradicts computed activity or month status', async () => {
    await setupSavingsAdvisorFixture();

    vi.mocked(requestOllamaSavingsAdvice).mockResolvedValueOnce({
      model: 'qwen3:8b',
      promptVersion: 'advisor-v1',
      response: {
        summary:
          'This is an empty financial profile for a future date with no transactions.',
        topActions: [
          {
            title: 'Verify data source and date',
            impactEstimate: 'Critical',
            reason: 'Future date detected.',
          },
        ],
        riskFlags: ['Future date detected', 'All metrics are zero'],
      },
    });

    await expect(
      getSavingsAdvisor({ month: '2026-05' }),
    ).resolves.toMatchObject({
      metrics: {
        monthIncome: 5000,
        monthExpenses: 1220,
      },
      response: {
        summary:
          'You spent $1,220.00 against $5,000.00 in income this month, leaving cash flow $3,780.00.',
      },
    });

    const [advisorMetrics] = vi
      .mocked(requestOllamaSavingsAdvice)
      .mock.calls.at(-1)!;
    const serializedMetrics = JSON.stringify(advisorMetrics);

    expect(serializedMetrics).not.toContain('Employer Inc');
    expect(serializedMetrics).not.toContain('Capital One');
    expect(serializedMetrics).toContain('totalMonthlyAverage');
  });

  it('falls back when model advice returns prompt-style dashboard copy', async () => {
    await setupSavingsAdvisorFixture();

    vi.mocked(requestOllamaSavingsAdvice).mockResolvedValueOnce({
      model: 'qwen3:8b',
      promptVersion: 'advisor-v1',
      response: {
        summary:
          "The user's financial metrics show income and expenses for the selected month with a detailed explanation that should not be shown in the dashboard.",
        topActions: [],
        riskFlags: [],
      },
    });

    await expect(
      getSavingsAdvisor({ month: '2026-05' }),
    ).resolves.toMatchObject({
      response: {
        summary:
          'You spent $1,220.00 against $5,000.00 in income this month, leaving cash flow $3,780.00.',
      },
    });
  });
});
