import * as db from '#server/db';
import * as sheet from '#server/sheet';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';

import { createAllBudgets, createBudget } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Base budget', () => {
  it('includes manual recurring entries in monthly category and group spending without transactions', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'Future Me' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    const hsaCategoryId = await db.insertCategory({
      name: 'HSA',
      cat_group: 'group1',
    });

    await createBudget(['2024-01', '2024-02']);

    await db.insertWithSchema('manual_recurring_entries', {
      id: 'manual-entry-1',
      name: 'HSA contribution',
      amount: 50000,
      category: hsaCategoryId,
      start_month: '2024-02',
      end_month: null,
      day_of_month: 1,
      cadence: 'monthly',
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      tombstone: false,
    });
    await db.insertWithSchema('manual_recurring_entries', {
      id: 'manual-entry-2',
      name: 'Catch-up HSA contribution',
      amount: 25000,
      category: hsaCategoryId,
      start_month: '2024-02',
      end_month: null,
      day_of_month: 1,
      cadence: 'monthly',
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      tombstone: false,
    });

    await sheet.waitOnSpreadsheet();

    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2024-01'),
        `sum-amount-${hsaCategoryId}`,
      ),
    ).toBe(0);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2024-02'),
        `sum-amount-${hsaCategoryId}`,
      ),
    ).toBe(-75000);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2024-02'),
        'group-sum-amount-group1',
      ),
    ).toBe(-75000);

    const transactions = await db.all('SELECT * FROM transactions');
    expect(transactions).toHaveLength(0);
  });

  it('stops manual recurring entries after their end month', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'Future Me' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    const rothCategoryId = await db.insertCategory({
      name: 'Roth IRA',
      cat_group: 'group1',
    });

    await createBudget(['2024-12', '2025-01']);

    await db.insertWithSchema('manual_recurring_entries', {
      id: 'manual-entry-1',
      name: 'Roth IRA contribution',
      amount: 58300,
      category: rothCategoryId,
      start_month: '2024-01',
      end_month: '2024-12',
      day_of_month: 1,
      cadence: 'monthly',
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      tombstone: false,
    });
    await db.insertWithSchema('manual_recurring_entries', {
      id: 'manual-entry-2',
      name: 'Roth IRA contribution',
      amount: 62500,
      category: rothCategoryId,
      start_month: '2025-01',
      end_month: null,
      day_of_month: 1,
      cadence: 'monthly',
      active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      tombstone: false,
    });

    await sheet.waitOnSpreadsheet();

    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2024-12'),
        `sum-amount-${rothCategoryId}`,
      ),
    ).toBe(-58300);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2025-01'),
        `sum-amount-${rothCategoryId}`,
      ),
    ).toBe(-62500);
  });

  it('excludes paused manual recurring entries from budget spending', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'Future Me' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    const hsaCategoryId = await db.insertCategory({
      name: 'HSA',
      cat_group: 'group1',
    });

    await createBudget(['2024-02']);

    await db.insertWithSchema('manual_recurring_entries', {
      id: 'manual-entry-1',
      name: 'HSA contribution',
      amount: 50000,
      category: hsaCategoryId,
      start_month: '2024-02',
      end_month: null,
      day_of_month: 1,
      cadence: 'monthly',
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      tombstone: false,
    });

    await sheet.waitOnSpreadsheet();

    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2024-02'),
        `sum-amount-${hsaCategoryId}`,
      ),
    ).toBe(-50000);

    await db.updateWithSchema('manual_recurring_entries', {
      id: 'manual-entry-1',
      active: false,
      updated_at: '2024-01-02T00:00:00.000Z',
    });

    await sheet.waitOnSpreadsheet();

    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2024-02'),
        `sum-amount-${hsaCategoryId}`,
      ),
    ).toBe(0);
  });

  it('Recomputes budget cells when account fields change', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'income',
      is_income: 1,
    });
    const catId = await db.insertCategory({
      name: 'foo',
      cat_group: 'group1',
    });

    await createAllBudgets();

    // Insert a transaction referencing an account that doesn't exist
    // yet
    await db.insertTransaction({
      date: '2016-12-15',
      amount: -5000,
      account: '29eef937-9933-49ef-80d9-71627074cf31',
      category: catId,
    });

    // Make sure that the spreadsheet finishes processing to make sure
    // the next change doesn't get batched in with it
    await sheet.waitOnSpreadsheet();

    // The category should have nothing spent on it yet
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2016-12'),
        `sum-amount-${catId}`,
      ),
    ).toBe(0);

    // Create the referenced account
    await db.insertAccount({
      id: '29eef937-9933-49ef-80d9-71627074cf31',
      name: 'foo',
    });

    // Make sure the spreadsheet finishes processing
    await sheet.waitOnSpreadsheet();

    // The category should see the transaction
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2016-12'),
        `sum-amount-${catId}`,
      ),
    ).toBe(-5000);
  });

  it('Excludes hidden categories from group totals in Tracking Budget', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'tracking';

    // Create a group with multiple categories
    await db.insertCategoryGroup({ id: 'group1', name: 'Test Group' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });

    const visibleCatId = await db.insertCategory({
      name: 'Visible Category',
      cat_group: 'group1',
    });

    const hiddenCatId = await db.insertCategory({
      name: 'Hidden Category',
      cat_group: 'group1',
      hidden: 1,
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual category amounts
    expect(sheet.getCellValue(sheetName, `sum-amount-${visibleCatId}`)).toBe(
      -1000,
    );

    expect(sheet.getCellValue(sheetName, `sum-amount-${hiddenCatId}`)).toBe(
      -2000,
    );

    // Verify group total only includes visible category
    expect(sheet.getCellValue(sheetName, `group-sum-amount-group1`)).toBe(
      -1000,
    );

    // Now toggle hidden status of the hidden category to make it visible
    await db.updateCategory({
      id: hiddenCatId,
      name: 'Hidden Category',
      cat_group: 'group1',
      is_income: 0,
      hidden: 0,
    });

    await sheet.waitOnSpreadsheet();

    // After making hidden category visible, group total should include both
    expect(sheet.getCellValue(sheetName, `group-sum-amount-group1`)).toBe(
      -3000,
    );
  });

  it('Excludes hidden category groups from budget totals in Tracking Budget', async () => {
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'tracking';

    // Create two expense groups - one visible, one hidden
    await db.insertCategoryGroup({
      id: 'visible-group',
      name: 'Visible Group',
    });
    await db.insertCategoryGroup({
      id: 'hidden-group',
      name: 'Hidden Group',
      hidden: 1,
    });

    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });

    const visibleGroupCatId = await db.insertCategory({
      name: 'Visible Group Category',
      cat_group: 'visible-group',
    });

    const hiddenGroupCatId = await db.insertCategory({
      name: 'Hidden Group Category',
      cat_group: 'hidden-group',
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleGroupCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenGroupCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual amounts
    expect(
      sheet.getCellValue(sheetName, `sum-amount-${visibleGroupCatId}`),
    ).toBe(-1000);

    expect(
      sheet.getCellValue(sheetName, `sum-amount-${hiddenGroupCatId}`),
    ).toBe(-2000);

    expect(
      sheet.getCellValue(sheetName, `group-sum-amount-visible-group`),
    ).toBe(-1000);

    expect(sheet.getCellValue(sheetName, `group-sum-amount-hidden-group`)).toBe(
      -2000,
    );

    // Verify total spent only includes visible group
    expect(sheet.getCellValue(sheetName, 'total-spent')).toBe(-1000);

    // Now toggle hidden status of the hidden group to make it visible
    await db.updateCategoryGroup({
      id: 'hidden-group',
      name: 'Hidden Group',
      is_income: 0,
      hidden: 0,
    });

    await sheet.waitOnSpreadsheet();

    // After making hidden group visible, total should include both
    expect(sheet.getCellValue(sheetName, 'total-spent')).toBe(-3000);
  });

  it('Includes hidden categories in group totals for Envelope Budget', async () => {
    await sheet.loadSpreadsheet(db);
    // Envelope is the default, but explicit for clarity
    sheet.get().meta().budgetType = 'envelope';

    // Create a group with multiple categories
    await db.insertCategoryGroup({ id: 'group1', name: 'Test Group' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });

    const visibleCatId = await db.insertCategory({
      name: 'Visible Category',
      cat_group: 'group1',
    });

    const hiddenCatId = await db.insertCategory({
      name: 'Hidden Category',
      cat_group: 'group1',
      hidden: 1,
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify group total includes both visible and hidden category amounts
    expect(sheet.getCellValue(sheetName, `group-sum-amount-group1`)).toBe(
      -3000,
    );
  });

  it('Includes hidden category groups in budget totals for Envelope Budget', async () => {
    await sheet.loadSpreadsheet(db);
    // Envelope is the default, but explicit for clarity
    sheet.get().meta().budgetType = 'envelope';

    // Create two expense groups - one visible, one hidden
    await db.insertCategoryGroup({
      id: 'visible-group',
      name: 'Visible Group',
    });
    await db.insertCategoryGroup({
      id: 'hidden-group',
      name: 'Hidden Group',
      hidden: 1,
    });

    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });

    const visibleGroupCatId = await db.insertCategory({
      name: 'Visible Group Category',
      cat_group: 'visible-group',
    });

    const hiddenGroupCatId = await db.insertCategory({
      name: 'Hidden Group Category',
      cat_group: 'hidden-group',
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    await db.insertAccount({ id: 'account1', name: 'Account 1' });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleGroupCatId,
    });

    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenGroupCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify total spent includes both visible and hidden group amounts
    expect(sheet.getCellValue(sheetName, 'total-spent')).toBe(-3000);
  });
});
