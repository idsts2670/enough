import * as db from '#server/db';
import {
  CREDIT_CARD_PAYMENTS_CATEGORY_NAME,
  PAYMENT_TRANSFER_GROUP_NAME,
} from '#shared/payment-transfers';

import {
  acceptCategorySuggestion,
  getCategorySuggestions,
  rejectCategorySuggestion,
  suggestCategoryForTransaction,
} from './category-suggestions';

beforeEach(
  (
    global as typeof globalThis & { emptyDatabase: () => () => void }
  ).emptyDatabase(),
);

async function setupCategorizationFixture() {
  await db.insertAccount({ id: 'acct', name: 'Checking' });
  await db.insertCategoryGroup({ id: 'group', name: 'Food' });
  const categoryId = await db.insertCategory({
    id: 'restaurants',
    name: 'Restaurants',
    cat_group: 'group',
  });
  await db.insertPayee({ id: 'payee', name: "Mo's Irish Pub" });

  return { categoryId };
}

async function insertHistoryTransactions(count: number, categoryId: string) {
  for (let index = 0; index < count; index++) {
    await db.insertTransaction({
      id: `history-${index}`,
      account: 'acct',
      amount: -2200 - index,
      date: `2026-01-${String(index + 1).padStart(2, '0')}`,
      payee: 'payee',
      imported_payee: "TST* MO'S IRISH PU...",
      category: categoryId,
    });
  }
}

async function insertUncategorizedTransaction(id = 'target') {
  await db.insertTransaction({
    id,
    account: 'acct',
    amount: -1800,
    date: '2026-02-01',
    payee: 'payee',
    imported_payee: "TST* MO'S IRISH PU...",
  });
}

async function getTransactionCategory(id: string) {
  const row = await db.first<{ category: string | null }>(
    'SELECT category FROM v_transactions_internal_alive WHERE id = ?',
    [id],
  );
  return row?.category ?? null;
}

async function setupPaymentTransferFixture() {
  await db.insertAccount({ id: 'checking', name: 'TOTAL CHECKING' });
  await db.insertCategoryGroup({
    id: 'payment-group',
    name: PAYMENT_TRANSFER_GROUP_NAME,
  });
  await db.insertCategory({
    id: 'credit-card-payments',
    name: CREDIT_CARD_PAYMENTS_CATEGORY_NAME,
    cat_group: 'payment-group',
  });
  await db.insertCategoryGroup({ id: 'loan-group', name: 'Debt' });
  await db.insertCategory({
    id: 'loan-payments',
    name: 'Loan Payments',
    cat_group: 'loan-group',
  });
  await db.insertPayee({ id: 'robinhood', name: 'Robinhood' });
}

describe('AI category suggestions', () => {
  it('skips transactions that already have a category', async () => {
    const { categoryId } = await setupCategorizationFixture();
    await db.insertTransaction({
      id: 'target',
      account: 'acct',
      amount: -1800,
      date: '2026-02-01',
      payee: 'payee',
      imported_payee: "TST* MO'S IRISH PU...",
      category: categoryId,
    });

    await expect(suggestCategoryForTransaction('target')).resolves.toBeNull();
    await expect(getCategorySuggestions()).resolves.toEqual([]);
  });

  it('keeps history suggestions below 0.95 pending for review', async () => {
    const { categoryId } = await setupCategorizationFixture();
    await insertHistoryTransactions(3, categoryId);
    await insertUncategorizedTransaction();

    const suggestionId = await suggestCategoryForTransaction('target');
    expect(suggestionId).toBeTruthy();

    const suggestions = await getCategorySuggestions();
    expect(suggestions).toMatchObject([
      {
        id: suggestionId,
        transactionId: 'target',
        categoryId,
        confidence: 0.92,
        source: 'history',
        status: 'pending',
        shouldAutoApply: false,
      },
    ]);
    expect(await getTransactionCategory('target')).toBeNull();
  });

  it('does not immediately re-suggest a rejected suggestion', async () => {
    const { categoryId } = await setupCategorizationFixture();
    await insertHistoryTransactions(3, categoryId);
    await insertUncategorizedTransaction();

    const suggestionId = await suggestCategoryForTransaction('target');
    expect(suggestionId).not.toBeNull();
    if (!suggestionId) {
      throw new Error('Expected suggestion');
    }
    await rejectCategorySuggestion({ id: suggestionId });

    await expect(suggestCategoryForTransaction('target')).resolves.toBeNull();
    await expect(getCategorySuggestions()).resolves.toEqual([]);
  });

  it('auto-applies only high-confidence history suggestions without overwriting later user changes', async () => {
    const { categoryId } = await setupCategorizationFixture();
    await insertHistoryTransactions(5, categoryId);
    await insertUncategorizedTransaction();

    const suggestionId = await suggestCategoryForTransaction('target');

    const suggestions = await getCategorySuggestions({
      status: 'auto_applied',
    });
    expect(suggestions).toMatchObject([
      {
        id: suggestionId,
        transactionId: 'target',
        categoryId,
        confidence: 0.96,
        source: 'history',
        status: 'auto_applied',
        shouldAutoApply: true,
      },
    ]);
    expect(await getTransactionCategory('target')).toBe(categoryId);
  });

  it('does not auto-apply history suggestions when prior categories are mixed', async () => {
    const { categoryId } = await setupCategorizationFixture();
    await db.insertCategory({ id: 'other', name: 'Other', cat_group: 'group' });
    await insertHistoryTransactions(5, categoryId);
    await db.insertTransaction({
      id: 'mixed-history',
      account: 'acct',
      amount: -2100,
      date: '2026-01-20',
      payee: 'payee',
      imported_payee: "TST* MO'S IRISH PU...",
      category: 'other',
    });
    await insertUncategorizedTransaction();

    const suggestionId = await suggestCategoryForTransaction('target');

    const suggestions = await getCategorySuggestions();
    expect(suggestions).toMatchObject([
      {
        id: suggestionId,
        transactionId: 'target',
        categoryId,
        confidence: 0.92,
        source: 'history',
        status: 'pending',
        shouldAutoApply: false,
      },
    ]);
    expect(await getTransactionCategory('target')).toBeNull();
  });

  it('does not overwrite a category set before accepting a stale suggestion', async () => {
    const { categoryId } = await setupCategorizationFixture();
    await db.insertCategory({ id: 'other', name: 'Other', cat_group: 'group' });
    await insertHistoryTransactions(3, categoryId);
    await insertUncategorizedTransaction();

    const suggestionId = await suggestCategoryForTransaction('target');
    expect(suggestionId).not.toBeNull();
    if (!suggestionId) {
      throw new Error('Expected suggestion');
    }
    await db.updateTransaction({ id: 'target', category: 'other' });

    await expect(
      acceptCategorySuggestion({ id: suggestionId }),
    ).resolves.toEqual({ applied: false });
    expect(await getTransactionCategory('target')).toBe('other');
  });

  it('auto-applies credit card payment transfers to the payment bucket', async () => {
    await setupPaymentTransferFixture();
    await db.insertTransaction({
      id: 'target',
      account: 'checking',
      amount: -68203,
      date: '2026-05-01',
      payee: 'robinhood',
      imported_payee: 'Robinhood',
      notes: 'Robinhood',
    });

    const suggestionId = await suggestCategoryForTransaction('target');

    expect(suggestionId).toBeTruthy();
    expect(await getTransactionCategory('target')).toBe('credit-card-payments');
    await expect(
      getCategorySuggestions({ status: 'auto_applied' }),
    ).resolves.toMatchObject([
      {
        id: suggestionId,
        transactionId: 'target',
        categoryId: 'credit-card-payments',
        confidence: 0.99,
        source: 'rule',
        status: 'auto_applied',
      },
    ]);
  });

  it('moves card payment rows out of ordinary categories like Loan Payments', async () => {
    await setupPaymentTransferFixture();
    await db.insertTransaction({
      id: 'target',
      account: 'checking',
      amount: -68203,
      date: '2026-05-01',
      payee: 'robinhood',
      imported_payee: 'Robinhood',
      notes: 'Robinhood',
      category: 'loan-payments',
    });

    const suggestionId = await suggestCategoryForTransaction('target');

    expect(suggestionId).toBeTruthy();
    expect(await getTransactionCategory('target')).toBe('credit-card-payments');
  });
});
