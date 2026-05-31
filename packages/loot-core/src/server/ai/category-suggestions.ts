import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { batchUpdateTransactions } from '#server/transactions';
import { insertRule } from '#server/transactions/transaction-rules';
import {
  CREDIT_CARD_PAYMENTS_CATEGORY_NAME,
  isPaymentTransferCategory,
  isPaymentTransferLike,
  PAYMENT_TRANSFER_GROUP_NAME,
} from '#shared/payment-transfers';

import { requestOllamaCategorySuggestion } from './ollama-client';
import { normalizePayeeName } from './payee-normalizer';
import { ensureAiTables } from './schema';
import type {
  AiCategorySuggestion,
  AiSuggestionSource,
  AiSuggestionStatus,
  CategorySuggestionResult,
} from './types';

type TransactionRow = {
  id: string;
  date: string;
  amount: number;
  account: string;
  account_name: string | null;
  category: string | null;
  payee: string | null;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
  raw_synced_data: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  group_name: string;
  is_income: 0 | 1;
};

type SuggestionRow = {
  id: string;
  transaction_id: string;
  normalized_payee: string | null;
  suggested_category: string | null;
  category_name: string | null;
  confidence: number;
  source: AiSuggestionSource;
  reason: string | null;
  suggested_rule: string | null;
  should_auto_apply: 0 | 1;
  status: AiSuggestionStatus;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
  applied_at: string | null;
};

const AUTO_APPLY_THRESHOLD = 0.95;
const REVIEW_THRESHOLD = 0.75;

function toSuggestion(row: SuggestionRow): AiCategorySuggestion {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    normalizedPayee: row.normalized_payee,
    categoryId: row.suggested_category,
    categoryName: row.category_name,
    confidence: row.confidence,
    source: row.source,
    reason: row.reason,
    suggestedRule: row.suggested_rule,
    shouldAutoApply: row.should_auto_apply === 1,
    status: row.status,
    model: row.model,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    appliedAt: row.applied_at,
  };
}

async function run(sql: string, params: unknown[] = []) {
  return db.run(sql, params as (string | number)[]);
}

async function getTransaction(id: string): Promise<TransactionRow | null> {
  return db.first<TransactionRow>(
    `SELECT t.id,
            t.date,
            t.amount,
            t.account,
            a.name AS account_name,
            t.category,
            t.payee,
            p.name AS payee_name,
            t.imported_payee,
            t.notes,
            t.raw_synced_data
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
       LEFT JOIN payees p ON p.id = t.payee AND p.tombstone = 0
      WHERE t.id = ?
      LIMIT 1`,
    [id],
  );
}

async function getCategories(): Promise<CategoryRow[]> {
  return db.all<CategoryRow>(
    `SELECT c.id, c.name, g.name AS group_name, c.is_income
       FROM categories c
       LEFT JOIN category_groups g ON g.id = c.cat_group
      WHERE c.tombstone = 0
        AND g.tombstone = 0
      ORDER BY g.sort_order, c.sort_order`,
  );
}

function parseRawSyncedData(rawSyncedData: string | null) {
  if (!rawSyncedData) {
    return null;
  }

  try {
    return JSON.parse(rawSyncedData);
  } catch {
    return null;
  }
}

function confidenceFromPlaid(rawConfidence: string | null | undefined) {
  switch (String(rawConfidence ?? '').toUpperCase()) {
    case 'VERY_HIGH':
      return 0.96;
    case 'HIGH':
      return 0.92;
    case 'MEDIUM':
      return 0.82;
    case 'LOW':
      return 0.65;
    default:
      return 0.8;
  }
}

function categoryByName(categories: CategoryRow[]) {
  return new Map(
    categories.map(category => [category.name.toLowerCase(), category]),
  );
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, match => `\\${match}`);
}

function buildPlaidSuggestion(
  trans: TransactionRow,
  categories: CategoryRow[],
  normalizedPayee: string,
): CategorySuggestionResult | null {
  const rawSyncedData = parseRawSyncedData(trans.raw_synced_data);
  const plaidCategoryName = rawSyncedData?.plaidSuggestedCategory;
  if (typeof plaidCategoryName !== 'string' || plaidCategoryName.length === 0) {
    return null;
  }

  const category = categoryByName(categories).get(
    plaidCategoryName.toLowerCase(),
  );
  if (!category) {
    return null;
  }

  const confidence = confidenceFromPlaid(
    rawSyncedData?.plaidCategoryConfidence,
  );
  if (confidence < REVIEW_THRESHOLD) {
    return null;
  }

  return {
    source: 'plaid',
    categoryId: category.id,
    confidence,
    normalizedPayee,
    reason: `Plaid classified this merchant as ${plaidCategoryName}.`,
    shouldAutoApply: confidence >= AUTO_APPLY_THRESHOLD,
    suggestedRule: `If payee matches ${normalizedPayee}, categorize as ${category.name}`,
    model: null,
    promptVersion: null,
  };
}

function buildPaymentTransferSuggestion(
  trans: TransactionRow,
  categories: CategoryRow[],
  normalizedPayee: string,
): CategorySuggestionResult | null {
  if (
    !isPaymentTransferLike({
      accountName: trans.account_name,
      payeeName: trans.payee_name,
      importedPayee: trans.imported_payee,
      notes: trans.notes,
    })
  ) {
    return null;
  }

  const category = categories.find(
    row =>
      row.name === CREDIT_CARD_PAYMENTS_CATEGORY_NAME &&
      row.group_name === PAYMENT_TRANSFER_GROUP_NAME,
  );

  if (!category) {
    return null;
  }

  return {
    source: 'rule',
    categoryId: category.id,
    confidence: 0.99,
    normalizedPayee,
    reason:
      'This matches a credit card payment pattern and should be excluded from spending reports.',
    shouldAutoApply: true,
    suggestedRule: `Categorize credit card payment transfers as ${category.name}`,
    model: null,
    promptVersion: null,
  };
}

async function buildHistorySuggestion(
  trans: TransactionRow,
  normalizedPayee: string,
): Promise<CategorySuggestionResult | null> {
  if (!normalizedPayee) {
    return null;
  }

  type HistoryRow = Pick<
    TransactionRow,
    'id' | 'category' | 'payee_name' | 'imported_payee'
  > & {
    category_name: string;
  };
  const selectHistoryRows = `
    SELECT t.id,
           t.category,
           p.name AS payee_name,
           t.imported_payee,
           c.name AS category_name
      FROM v_transactions_internal_alive t
      LEFT JOIN payees p ON p.id = t.payee AND p.tombstone = 0
      LEFT JOIN categories c ON c.id = t.category AND c.tombstone = 0
     WHERE t.id != ?
       AND t.category IS NOT NULL
       AND t.is_parent = 0
  `;
  const rawPayee = trans.imported_payee || trans.payee_name || '';
  const rawLike = `%${escapeLike(rawPayee)}%`;
  const normalizedLike = `%${escapeLike(normalizedPayee)}%`;

  let rows = rawPayee
    ? await db.all<HistoryRow>(
        `${selectHistoryRows}
           AND (
             t.imported_payee = ?
             OR p.name = ?
             OR t.imported_payee LIKE ? ESCAPE '\\'
             OR p.name LIKE ? ESCAPE '\\'
             OR t.imported_payee LIKE ? ESCAPE '\\'
             OR p.name LIKE ? ESCAPE '\\'
           )
         ORDER BY t.date DESC
         LIMIT 500`,
        [
          trans.id,
          rawPayee,
          rawPayee,
          rawLike,
          rawLike,
          normalizedLike,
          normalizedLike,
        ],
      )
    : [];

  if (rows.length === 0) {
    rows = await db.all<HistoryRow>(
      `${selectHistoryRows}
       ORDER BY t.date DESC
       LIMIT 500`,
      [trans.id],
    );
  }

  const counts = new Map<string, { count: number; name: string }>();
  let totalMatches = 0;
  for (const row of rows) {
    if (!row.category) {
      continue;
    }

    const rowPayee = normalizePayeeName(row.imported_payee || row.payee_name);
    if (rowPayee.toLowerCase() !== normalizedPayee.toLowerCase()) {
      continue;
    }

    totalMatches += 1;
    const current = counts.get(row.category) ?? {
      count: 0,
      name: row.category_name,
    };
    current.count += 1;
    counts.set(row.category, current);
  }

  const winner = [...counts.entries()].sort(
    ([, a], [, b]) => b.count - a.count,
  )[0];

  if (!winner) {
    return null;
  }

  const [categoryId, result] = winner;
  const dominance = result.count / totalMatches;
  const confidence =
    result.count >= 5 && dominance >= 0.9
      ? 0.96
      : result.count >= 3 && dominance >= 0.8
        ? 0.92
        : 0.86;

  return {
    source: 'history',
    categoryId,
    confidence,
    normalizedPayee,
    reason: `${result.count} previous ${normalizedPayee} transactions were categorized as ${result.name}.`,
    shouldAutoApply: confidence >= AUTO_APPLY_THRESHOLD,
    suggestedRule: `If payee matches ${normalizedPayee}, categorize as ${result.name}`,
    model: null,
    promptVersion: null,
  };
}

async function buildOllamaSuggestion(
  trans: TransactionRow,
  categories: CategoryRow[],
  normalizedPayee: string,
) {
  const recentRows = await db.all<{
    payee_name: string | null;
    imported_payee: string | null;
    category_name: string | null;
  }>(
    `SELECT p.name AS payee_name,
            t.imported_payee,
            c.name AS category_name
       FROM v_transactions_internal_alive t
       LEFT JOIN payees p ON p.id = t.payee AND p.tombstone = 0
       LEFT JOIN categories c ON c.id = t.category AND c.tombstone = 0
      WHERE t.category IS NOT NULL
        AND t.is_parent = 0
      ORDER BY t.date DESC
      LIMIT 30`,
  );

  return requestOllamaCategorySuggestion({
    normalizedPayee,
    amount: trans.amount,
    categories: categories.map(category => ({
      id: category.id,
      name: category.name,
      groupName: category.group_name,
    })),
    recentContext: recentRows.map(row => {
      const payee = normalizePayeeName(row.imported_payee || row.payee_name);
      return `${payee} -> ${row.category_name}`;
    }),
  });
}

async function hasRejectedSuggestion(
  transactionId: string,
  categoryId: string | null,
) {
  if (!categoryId) {
    return false;
  }

  const rejected = await db.first<{ id: string }>(
    `SELECT id
       FROM ai_category_suggestions
      WHERE transaction_id = ?
        AND suggested_category IS ?
        AND status = 'rejected'
      LIMIT 1`,
    [transactionId, categoryId],
  );

  return Boolean(rejected);
}

async function persistSuggestion(
  transactionId: string,
  suggestion: CategorySuggestionResult,
  status: AiSuggestionStatus,
) {
  await ensureAiTables();

  await run(
    `UPDATE ai_category_suggestions
        SET status = 'superseded'
      WHERE transaction_id = ?
        AND status = 'pending'`,
    [transactionId],
  );

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  await run(
    `INSERT INTO ai_category_suggestions
       (id,
        transaction_id,
        normalized_payee,
        suggested_category,
        confidence,
        source,
        reason,
        suggested_rule,
        should_auto_apply,
        status,
        model,
        prompt_version,
        created_at,
        applied_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      transactionId,
      suggestion.normalizedPayee,
      suggestion.categoryId,
      suggestion.confidence,
      suggestion.source,
      suggestion.reason,
      suggestion.suggestedRule,
      suggestion.shouldAutoApply ? 1 : 0,
      status,
      suggestion.model ?? null,
      suggestion.promptVersion ?? null,
      createdAt,
      status === 'auto_applied' ? createdAt : null,
    ],
  );

  return id;
}

async function applySuggestionToTransaction(
  transactionId: string,
  categoryId: string,
  { overwriteExisting = false }: { overwriteExisting?: boolean } = {},
) {
  const current = await getTransaction(transactionId);
  if (!current || (current.category && !overwriteExisting)) {
    return false;
  }

  await batchUpdateTransactions({
    updated: [{ id: transactionId, category: categoryId }],
    learnCategories: false,
  });

  return true;
}

export async function suggestCategoryForTransaction(transactionId: string) {
  await ensureAiTables();

  const trans = await getTransaction(transactionId);
  if (!trans || !trans.amount) {
    return null;
  }

  const rawPayee = trans.imported_payee || trans.payee_name;
  const normalizedPayee = normalizePayeeName(rawPayee);
  const categories = await getCategories();

  const currentCategory = trans.category
    ? categories.find(category => category.id === trans.category)
    : null;
  if (
    currentCategory &&
    isPaymentTransferCategory({
      categoryName: currentCategory.name,
      categoryGroupName: currentCategory.group_name,
    })
  ) {
    return null;
  }

  const deterministicSuggestion =
    buildPaymentTransferSuggestion(trans, categories, normalizedPayee) ??
    buildPlaidSuggestion(trans, categories, normalizedPayee) ??
    (trans.category
      ? null
      : await buildHistorySuggestion(trans, normalizedPayee));

  const suggestion =
    deterministicSuggestion ??
    (trans.category
      ? null
      : await buildOllamaSuggestion(trans, categories, normalizedPayee));

  if (!suggestion || !suggestion.categoryId) {
    return null;
  }

  if (await hasRejectedSuggestion(transactionId, suggestion.categoryId)) {
    return null;
  }

  const shouldAutoApply = suggestion.confidence >= AUTO_APPLY_THRESHOLD;
  const status = shouldAutoApply ? 'auto_applied' : 'pending';

  const id = await persistSuggestion(transactionId, suggestion, status);

  if (shouldAutoApply) {
    const applied = await applySuggestionToTransaction(
      transactionId,
      suggestion.categoryId,
      { overwriteExisting: suggestion.source === 'rule' },
    );

    if (!applied) {
      await run(
        `UPDATE ai_category_suggestions
            SET status = 'superseded'
          WHERE id = ?`,
        [id],
      );
    }
  }

  return id;
}

export async function runCategorySuggestions({
  transactionIds,
  limit = 25,
}: {
  transactionIds?: string[];
  limit?: number;
} = {}) {
  await ensureAiTables();

  const ids = transactionIds?.length
    ? transactionIds.slice(0, limit)
    : (
        await db.all<{ id: string }>(
          `SELECT id
             FROM v_transactions_internal_alive
            WHERE category IS NULL
              AND is_parent = 0
            ORDER BY date DESC
            LIMIT ?`,
          [limit],
        )
      ).map(row => row.id);

  const suggestionIds = [];
  for (const transactionId of ids) {
    const suggestionId = await suggestCategoryForTransaction(transactionId);
    if (suggestionId) {
      suggestionIds.push(suggestionId);
    }
  }

  return { suggested: suggestionIds.length };
}

export async function getCategorySuggestions({
  transactionIds,
  status = 'pending',
}: {
  transactionIds?: string[];
  status?: AiSuggestionStatus;
} = {}) {
  await ensureAiTables();

  const params: unknown[] = [status];
  const transactionFilter = transactionIds?.length
    ? `AND s.transaction_id IN (${transactionIds.map(() => '?').join(', ')})`
    : '';

  if (transactionIds?.length) {
    params.push(...transactionIds);
  }

  const rows = await db.all<SuggestionRow>(
    `SELECT s.*,
            c.name AS category_name
       FROM ai_category_suggestions s
       LEFT JOIN categories c ON c.id = s.suggested_category AND c.tombstone = 0
      WHERE s.status = ?
        ${transactionFilter}
      ORDER BY s.created_at DESC
      LIMIT 50`,
    params as (string | number)[],
  );

  return rows.map(toSuggestion);
}

export async function acceptCategorySuggestion({
  id,
  createRule = false,
}: {
  id: string;
  createRule?: boolean;
}) {
  await ensureAiTables();

  const rows = await db.all<SuggestionRow>(
    `SELECT s.*,
            c.name AS category_name
       FROM ai_category_suggestions s
       LEFT JOIN categories c ON c.id = s.suggested_category AND c.tombstone = 0
      WHERE s.id = ?
      LIMIT 1`,
    [id],
  );
  const suggestion = rows[0];

  if (!suggestion?.suggested_category) {
    return { applied: false };
  }

  const current = await getTransaction(suggestion.transaction_id);
  if (!current || current.category) {
    await run(
      `UPDATE ai_category_suggestions
          SET status = 'superseded'
        WHERE id = ?`,
      [id],
    );
    return { applied: false };
  }

  await batchUpdateTransactions({
    updated: [
      {
        id: suggestion.transaction_id,
        category: suggestion.suggested_category,
      },
    ],
    learnCategories: !createRule,
  });

  if (createRule && current.payee) {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: current.payee }],
      actions: [
        { op: 'set', field: 'category', value: suggestion.suggested_category },
      ],
    });
  }

  await run(
    `UPDATE ai_category_suggestions
        SET status = 'accepted',
            applied_at = ?
      WHERE id = ?`,
    [new Date().toISOString(), id],
  );

  return { applied: true };
}

export async function rejectCategorySuggestion({ id }: { id: string }) {
  await ensureAiTables();

  await run(
    `UPDATE ai_category_suggestions
        SET status = 'rejected'
      WHERE id = ?`,
    [id],
  );

  return {};
}
