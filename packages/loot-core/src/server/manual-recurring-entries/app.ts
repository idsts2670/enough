import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type { CategoryEntity } from '#types/models';

export type ManualRecurringEntry = {
  id: string;
  name: string;
  amount: number;
  category: CategoryEntity['id'];
  startMonth: string;
  endMonth: string | null;
  dayOfMonth: number;
  cadence: 'monthly';
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type EntryInput = {
  name: string;
  amount: number;
  category: CategoryEntity['id'];
  startMonth: string;
  endMonth?: string | null;
  dayOfMonth: number;
};

type EntryUpdateInput = Partial<EntryInput> & {
  id: string;
};

function toEntry(row: db.DbManualRecurringEntry): ManualRecurringEntry {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    category: row.category,
    startMonth: row.start_month,
    endMonth: row.end_month ?? null,
    dayOfMonth: row.day_of_month,
    cadence: 'monthly',
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function validateCategory(categoryId: string) {
  const row = await db.first<Pick<db.DbCategory, 'is_income' | 'tombstone'>>(
    'SELECT is_income, tombstone FROM categories WHERE id = ?',
    [categoryId],
  );

  if (!row || row.tombstone === 1) {
    throw new Error('Manual recurring entry category does not exist.');
  }

  if (row.is_income === 1) {
    throw new Error('Manual recurring entries must use expense categories.');
  }
}

function validateMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Manual recurring entry month must use YYYY-MM.');
  }
}

function validateMonthRange(startMonth: string, endMonth?: string | null) {
  validateMonth(startMonth);

  if (endMonth) {
    validateMonth(endMonth);

    if (endMonth < startMonth) {
      throw new Error(
        'Manual recurring entry endMonth cannot be before startMonth.',
      );
    }
  }
}

function validateDay(dayOfMonth: number) {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error('Manual recurring entry dayOfMonth must be 1 through 31.');
  }
}

function validateAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      'Manual recurring entry amount must be a positive integer.',
    );
  }
}

function validateName(name: string) {
  if (!name.trim()) {
    throw new Error('Manual recurring entry name is required.');
  }
}

async function listManualRecurringEntries(): Promise<ManualRecurringEntry[]> {
  const rows = await db.all<db.DbManualRecurringEntry>(
    `SELECT * FROM manual_recurring_entries
     WHERE tombstone = 0
     ORDER BY active DESC, start_month, name COLLATE NOCASE, id`,
  );

  return rows.map(toEntry);
}

async function createManualRecurringEntry({
  name,
  amount,
  category,
  startMonth,
  endMonth,
  dayOfMonth,
}: EntryInput): Promise<string> {
  validateName(name);
  validateAmount(amount);
  validateMonthRange(startMonth, endMonth);
  validateDay(dayOfMonth);
  await validateCategory(category);

  const now = new Date().toISOString();
  return db.insertWithSchema('manual_recurring_entries', {
    name: name.trim(),
    amount,
    category,
    start_month: startMonth,
    end_month: endMonth || null,
    day_of_month: dayOfMonth,
    cadence: 'monthly',
    active: true,
    created_at: now,
    updated_at: now,
    tombstone: false,
  });
}

async function updateManualRecurringEntry({
  id,
  name,
  amount,
  category,
  startMonth,
  endMonth,
  dayOfMonth,
}: EntryUpdateInput): Promise<void> {
  const existing = await db.first<db.DbManualRecurringEntry>(
    'SELECT * FROM manual_recurring_entries WHERE id = ? AND tombstone = 0',
    [id],
  );

  if (!existing) {
    throw new Error('Manual recurring entry does not exist.');
  }

  const updates: Partial<db.DbManualRecurringEntry> & { id: string } = { id };

  if (name != null) {
    validateName(name);
    updates.name = name.trim();
  }

  if (amount != null) {
    validateAmount(amount);
    updates.amount = amount;
  }

  if (category != null) {
    await validateCategory(category);
    updates.category = category;
  }

  const nextStartMonth = startMonth ?? existing.start_month;
  const nextEndMonth =
    endMonth === undefined ? existing.end_month : endMonth || null;

  if (startMonth != null || endMonth !== undefined) {
    validateMonthRange(nextStartMonth, nextEndMonth);
  }

  if (startMonth != null) {
    updates.start_month = startMonth;
  }

  if (endMonth !== undefined) {
    updates.end_month = endMonth || null;
  }

  if (dayOfMonth != null) {
    validateDay(dayOfMonth);
    updates.day_of_month = dayOfMonth;
  }

  updates.updated_at = new Date().toISOString();
  await db.updateWithSchema('manual_recurring_entries', updates);
}

async function setManualRecurringEntryActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}): Promise<void> {
  await db.updateWithSchema('manual_recurring_entries', {
    id,
    active,
    updated_at: new Date().toISOString(),
  });
}

async function deleteManualRecurringEntry({ id }: { id: string }) {
  await db.delete_('manual_recurring_entries', id);
}

export type ManualRecurringEntriesHandlers = {
  'manual-recurring-entries/list': typeof listManualRecurringEntries;
  'manual-recurring-entries/create': typeof createManualRecurringEntry;
  'manual-recurring-entries/update': typeof updateManualRecurringEntry;
  'manual-recurring-entries/delete': typeof deleteManualRecurringEntry;
  'manual-recurring-entries/pause': typeof pauseManualRecurringEntry;
  'manual-recurring-entries/resume': typeof resumeManualRecurringEntry;
};

async function pauseManualRecurringEntry({ id }: { id: string }) {
  await setManualRecurringEntryActive({ id, active: false });
}

async function resumeManualRecurringEntry({ id }: { id: string }) {
  await setManualRecurringEntryActive({ id, active: true });
}

export const app = createApp<ManualRecurringEntriesHandlers>();

app.method('manual-recurring-entries/list', listManualRecurringEntries);
app.method(
  'manual-recurring-entries/create',
  mutator(undoable(createManualRecurringEntry)),
);
app.method(
  'manual-recurring-entries/update',
  mutator(undoable(updateManualRecurringEntry)),
);
app.method(
  'manual-recurring-entries/delete',
  mutator(undoable(deleteManualRecurringEntry)),
);
app.method(
  'manual-recurring-entries/pause',
  mutator(undoable(pauseManualRecurringEntry)),
);
app.method(
  'manual-recurring-entries/resume',
  mutator(undoable(resumeManualRecurringEntry)),
);
