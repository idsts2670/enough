import * as db from '#server/db';

import type * as OllamaClient from './ollama-client';
import { requestOllamaSavingsChat, stripQwenThinking } from './ollama-client';
import { getSavingsAdvisorChat } from './savings-advisor';

vi.mock('./ollama-client', async importOriginal => {
  const actual = await importOriginal<typeof OllamaClient>();

  return {
    ...actual,
    getOllamaConfig: vi.fn(() => ({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:4b',
    })),
    requestOllamaSavingsAdvice: vi.fn(async () => ({
      promptVersion: 'advisor-v1',
      response: null,
    })),
    requestOllamaSavingsChat: vi.fn(async () => ({
      model: 'qwen3:4b',
      promptVersion: 'advisor-chat-v1',
      reply: 'Review the aggregate savings rate first.',
    })),
  };
});

beforeEach(
  (
    global as typeof globalThis & { emptyDatabase: () => () => void }
  ).emptyDatabase(),
);

async function setupSavingsAdvisorFixture() {
  await db.insertAccount({ id: 'acct', name: 'Checking' });
  await db.insertCategoryGroup({ id: 'income-group', name: 'Income' });
  await db.insertCategoryGroup({ id: 'fixed-group', name: 'Fixed' });
  const incomeCategoryId = await db.insertCategory({
    id: 'income',
    name: 'Income',
    cat_group: 'income-group',
  });
  const subscriptionCategoryId = await db.insertCategory({
    id: 'subscriptions',
    name: 'Subscriptions',
    cat_group: 'fixed-group',
  });
  await db.insertPayee({ id: 'employer', name: 'Employer Inc' });
  await db.insertPayee({ id: 'netflix', name: 'Netflix' });

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
}

describe('Savings Advisor chat', () => {
  beforeEach(() => {
    vi.mocked(requestOllamaSavingsChat).mockClear();
    vi.mocked(requestOllamaSavingsChat).mockResolvedValue({
      model: 'qwen3:4b',
      promptVersion: 'advisor-chat-v1',
      reply: 'Review the aggregate savings rate first.',
    });
  });

  it('sends aggregate-only metrics without payee names', async () => {
    await setupSavingsAdvisorFixture();

    await expect(
      getSavingsAdvisorChat({
        month: '2026-05',
        messages: [{ role: 'user', content: 'Where can I save?' }],
      }),
    ).resolves.toMatchObject({
      reply: 'Review the aggregate savings rate first.',
      model: 'qwen3:4b',
      promptVersion: 'advisor-chat-v1',
    });

    const [payload] = vi.mocked(requestOllamaSavingsChat).mock.calls[0];
    const serializedMetrics = JSON.stringify(payload.metrics);

    expect(serializedMetrics).not.toContain('Netflix');
    expect(serializedMetrics).not.toContain('Employer Inc');
    expect(serializedMetrics).toContain('recurringSubscriptions');
    expect(serializedMetrics).toContain('totalMonthlyAverage');
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
      model: 'qwen3:4b',
      promptVersion: 'advisor-chat-v1',
      reply: null,
    });

    await expect(
      getSavingsAdvisorChat({
        messages: [{ role: 'user', content: 'Where can I save?' }],
      }),
    ).resolves.toMatchObject({
      reply: null,
      model: 'qwen3:4b',
      promptVersion: 'advisor-chat-v1',
      error: 'unavailable',
    });
  });

  it('strips qwen thinking blocks from visible replies', () => {
    expect(
      stripQwenThinking('<think>private reasoning</think>\nReview cash flow.'),
    ).toBe('Review cash flow.');
  });
});
