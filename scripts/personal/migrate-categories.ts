// @ts-strict-ignore
/**
 * Category Restructuring & Auto-Categorization Rules
 *
 * Usage (from repo root):
 *   ACTUAL_SERVER_PASSWORD=xxx npx tsx scripts/personal/migrate-categories.ts --dry-run
 *   ACTUAL_SERVER_PASSWORD=xxx npx tsx scripts/personal/migrate-categories.ts --part=a
 *   ACTUAL_SERVER_PASSWORD=xxx npx tsx scripts/personal/migrate-categories.ts --part=b
 *   ACTUAL_SERVER_PASSWORD=xxx npx tsx scripts/personal/migrate-categories.ts --part=all
 *
 * Requires the local sync server running at http://localhost:5006.
 * Start it with: yarn personal:start
 *
 * SECURITY: Never prints real transaction data or financial values.
 * Logs only group/category names and operation counts.
 */

// Import from the compiled dist output to avoid tsx trying to transpile
// .pegjs grammar files deep in loot-core's source dependency chain.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require('../../packages/api/dist/index.js') as typeof import('../../packages/api/index');

// ─── Flags ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const PART_ARG =
  process.argv.find(a => a.startsWith('--part='))?.split('=')[1] ?? 'all';
const RUN_PART_A = DRY_RUN || PART_ARG === 'a' || PART_ARG === 'all';
const RUN_PART_B = !DRY_RUN && (PART_ARG === 'b' || PART_ARG === 'all');

// ─── Connection config ────────────────────────────────────────────────────────

const SERVER_URL = 'http://localhost:5006';
const SERVER_PASSWORD = process.env.ACTUAL_SERVER_PASSWORD ?? '';

/**
 * Budget group ID — the GUID portion of the filename in
 * packages/sync-server/user-files/group-<ID>.sqlite
 * Override with ACTUAL_BUDGET_SYNC_ID env var if the file has a different name.
 */
const BUDGET_SYNC_ID =
  process.env.ACTUAL_BUDGET_SYNC_ID ??
  'a39fd6ee-bec8-4fa5-b426-c9c5ddd265fd';

// ─── Target structure ─────────────────────────────────────────────────────────

const TARGET_GROUPS: Array<{ name: string; categories: string[] }> = [
  {
    name: 'Fixed',
    categories: [
      'Rent/Mortgage',
      'Utilities',
      'Internet',
      'Phone',
      'Insurance',
      'Subscriptions',
    ],
  },
  {
    name: 'Fun',
    categories: [
      'Groceries',
      'Restaurants & Dining',
      'Entertainment',
      'Shopping',
      'Personal Care',
      'Hobbies',
    ],
  },
  {
    name: 'Trading & Investment',
    categories: ['Stocks & ETFs', 'Crypto', 'Brokerage Fees'],
  },
  {
    name: 'Future Me',
    categories: ['Emergency Fund', 'Savings Transfer', 'Retirement'],
  },
  {
    name: 'Other',
    categories: ['ATM / Cash', 'Fees & Charges', 'Miscellaneous'],
  },
];

/**
 * Old category name → new category name.
 * Used as the `transferCategoryId` argument to deleteCategory so all
 * historical transactions land in the right new category.
 *
 * Names confirmed from --dry-run output. Plaid's actual category names
 * use "&" and plural forms that differ from guessed names.
 *
 * When the old and new name are identical (Shopping, Personal Care,
 * Entertainment) the category just moves groups; the transfer target is
 * the newly-created copy in the target group (guaranteed by
 * buildCategoryNameMap being scoped to target groups in Step 4).
 */
const OLD_TO_NEW: Record<string, string> = {
  // Usual Expenses
  Food: 'Groceries',
  Bills: 'Utilities',
  'Bills (Flexible)': 'Subscriptions',
  General: 'Miscellaneous',
  // Investments and Savings
  Savings: 'Savings Transfer',
  // Plaid Categories (exact names from --dry-run):
  'Food & Drink': 'Groceries',
  Shopping: 'Shopping', // same name — moves from Plaid Categories → Fun
  Transportation: 'Entertainment', // Uber/Lyft; rules handle future ones
  'Personal Care': 'Personal Care', // same name — moves from Plaid Categories → Fun
  Entertainment: 'Entertainment', // same name — moves from Plaid Categories → Fun
  'Loan Payments': 'Miscellaneous',
  Transfers: 'Miscellaneous',
  Services: 'Miscellaneous',
  'Government & Charity': 'Miscellaneous',
  Travel: 'Entertainment',
  'Home Improvement': 'Miscellaneous',
};

/**
 * Names of old groups to delete AFTER their categories are cleared.
 * The script will skip any group listed here that no longer exists.
 */
const OLD_GROUPS_TO_DELETE = [
  'Usual Expenses',
  'Plaid Categories',
  'Investments and Savings',
];

// ─── Auto-categorization rules ────────────────────────────────────────────────

/**
 * Each entry creates one or more pre-stage rules that match
 * `imported_payee contains <value>` → set category.
 *
 * The `contains` op is case-insensitive (normalized to lowercase by the rules
 * engine in packages/loot-core/src/server/rules/condition.ts).
 */
const RULES: Array<{ importedPayeeContains: string[]; categoryName: string }> =
  [
    { importedPayeeContains: ['SOUTH LOOP'], categoryName: 'Groceries' },
    {
      importedPayeeContains: ['WHOLE FOODS', 'WHOLE FDS'],
      categoryName: 'Groceries',
    },
    { importedPayeeContains: ['TRADER JOE'], categoryName: 'Groceries' },
    { importedPayeeContains: ['MARIANO'], categoryName: 'Groceries' },
    { importedPayeeContains: ['JEWEL'], categoryName: 'Groceries' },
    { importedPayeeContains: ['AMAZON'], categoryName: 'Shopping' },
    { importedPayeeContains: ['NETFLIX'], categoryName: 'Subscriptions' },
    { importedPayeeContains: ['SPOTIFY'], categoryName: 'Subscriptions' },
    { importedPayeeContains: ['HULU'], categoryName: 'Subscriptions' },
    {
      importedPayeeContains: ['APPLE.COM/BILL', 'APPLE SERVICES'],
      categoryName: 'Subscriptions',
    },
    {
      importedPayeeContains: ['GOOGLE ONE', 'GOOGLE PLAY'],
      categoryName: 'Subscriptions',
    },
    { importedPayeeContains: ['LYFT'], categoryName: 'Entertainment' },
    { importedPayeeContains: ['UBER'], categoryName: 'Entertainment' },
    {
      importedPayeeContains: ['ATM WITHDRAWAL', 'CASH WITHDRAWAL'],
      categoryName: 'ATM / Cash',
    },
    { importedPayeeContains: ['VENMO'], categoryName: 'Miscellaneous' },
  ];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

/**
 * Build a map of "category name" → id from current groups.
 *
 * @param onlyGroupNames - when provided, only include categories that
 *   belong to one of the listed groups. Use this in Step 4 so transfer
 *   targets always resolve to the newly-created target group categories,
 *   not the old same-named Plaid categories being deleted.
 */
async function buildCategoryNameMap(
  onlyGroupNames?: string[],
): Promise<Map<string, string>> {
  const groups = await api.getCategoryGroups();
  const map = new Map<string, string>();
  for (const group of groups) {
    if (group.is_income) continue;
    if (onlyGroupNames && !onlyGroupNames.includes(group.name)) continue;
    for (const cat of group.categories ?? []) {
      map.set(cat.name, cat.id);
    }
  }
  return map;
}

/**
 * Build a map of "group name" → id from all current groups.
 */
async function buildGroupNameMap(): Promise<Map<string, string>> {
  const groups = await api.getCategoryGroups();
  const map = new Map<string, string>();
  for (const group of groups) {
    map.set(group.name, group.id);
  }
  return map;
}

// ─── Connection ───────────────────────────────────────────────────────────────

const DATA_DIR = '/tmp/actual-migration';

async function connect() {
  // Ensure the local cache directory exists before api.init() tries to scan it.
  const { mkdirSync } = await import('fs');
  mkdirSync(DATA_DIR, { recursive: true });

  section('Connecting to local sync server');
  log(`  Server : ${SERVER_URL}`);
  log(`  SyncId : ${BUDGET_SYNC_ID}`);
  log(`  DataDir: ${DATA_DIR}`);

  await api.init({
    serverURL: SERVER_URL,
    password: SERVER_PASSWORD,
    dataDir: DATA_DIR,
  });

  // downloadBudget handles both first-run (downloads) and re-run (syncs).
  // After this call the budget is loaded and ready for API calls.
  log('\n  Downloading / syncing budget...');
  await api.downloadBudget(BUDGET_SYNC_ID);
  log('  Connected.\n');
}

// ─── Dry-run: print current state ────────────────────────────────────────────

async function printCurrentState() {
  section('DRY-RUN — Current budget structure');
  const groups = await api.getCategoryGroups();

  for (const group of groups) {
    const tag = group.is_income ? ' [income]' : '';
    log(`\nGroup: "${group.name}"${tag} (${group.id})`);
    if (group.categories && group.categories.length > 0) {
      for (const cat of group.categories) {
        const hidden = cat.hidden ? ' [hidden]' : '';
        log(`  └─ "${cat.name}"${hidden} (${cat.id})`);
      }
    } else {
      log('  └─ (no categories)');
    }
  }

  log('\n--- OLD_TO_NEW mappings that will be applied in --part=a:');
  for (const [from, to] of Object.entries(OLD_TO_NEW)) {
    log(`  "${from}" → "${to}"`);
  }

  log('\n--- Groups that will be deleted in --part=a:');
  for (const name of OLD_GROUPS_TO_DELETE) {
    log(`  "${name}"`);
  }

  log('\n--- New groups that will be created in --part=a:');
  for (const g of TARGET_GROUPS) {
    log(`  "${g.name}": ${g.categories.join(', ')}`);
  }

  log(
    '\nIf the above looks correct, run with --part=a to apply. Then --part=b for rules.',
  );
}

// ─── Part A: Category restructuring ──────────────────────────────────────────

async function partA() {
  section('Part A — Category restructuring');

  // Step 1: Build current state
  const existingGroups = await api.getCategoryGroups();
  const existingGroupNames = new Set(existingGroups.map(g => g.name));

  // Step 2: Create new groups (idempotent)
  section('  Step 2/4 — Creating new groups');
  const newGroupIds = new Map<string, string>();

  for (const targetGroup of TARGET_GROUPS) {
    if (existingGroupNames.has(targetGroup.name)) {
      const existing = existingGroups.find(g => g.name === targetGroup.name)!;
      newGroupIds.set(targetGroup.name, existing.id);
      log(`  SKIP   Group "${targetGroup.name}" already exists`);
    } else {
      const id = await api.createCategoryGroup({
        name: targetGroup.name,
        is_income: false,
        hidden: false,
      });
      newGroupIds.set(targetGroup.name, id);
      log(`  CREATE Group "${targetGroup.name}" (${id})`);
    }
  }

  // Step 3: Create categories (idempotent)
  section('  Step 3/4 — Creating new categories');

  // Refresh groups to pick up newly created ones
  const refreshedGroups = await api.getCategoryGroups();
  const existingCatsByGroup = new Map<string, Set<string>>();
  for (const g of refreshedGroups) {
    existingCatsByGroup.set(g.name, new Set(g.categories?.map(c => c.name) ?? []));
  }

  for (const targetGroup of TARGET_GROUPS) {
    const groupId = newGroupIds.get(targetGroup.name)!;
    const existingCats = existingCatsByGroup.get(targetGroup.name) ?? new Set();

    for (const catName of targetGroup.categories) {
      if (existingCats.has(catName)) {
        log(`  SKIP   "${targetGroup.name} / ${catName}" already exists`);
      } else {
        const id = await api.createCategory({
          name: catName,
          group_id: groupId,
          is_income: false,
          hidden: false,
        });
        log(`  CREATE "${targetGroup.name} / ${catName}" (${id})`);
      }
    }
  }

  // Step 4: Delete old categories (with transfer)
  section('  Step 4/4 — Deleting old categories (transferring transactions)');

  // Rebuild name→id map scoped ONLY to target groups. This ensures that when
  // old and new categories share the same name (e.g. "Shopping", "Entertainment",
  // "Personal Care"), we always resolve to the new copy, never back to the old
  // one being deleted.
  const targetGroupNames = new Set(TARGET_GROUPS.map(g => g.name));
  const catNameToId = await buildCategoryNameMap(TARGET_GROUPS.map(g => g.name));

  // Refresh groups again to find old categories
  const currentGroups = await api.getCategoryGroups();

  for (const group of currentGroups) {
    if (group.is_income) continue;
    // ⚠ Skip newly-created target groups — only delete from OLD groups.
    //   Without this guard, categories that share a name with a target
    //   (Shopping, Entertainment, Personal Care) would be self-deleted.
    if (targetGroupNames.has(group.name)) continue;

    for (const cat of group.categories ?? []) {
      const transferTargetName = OLD_TO_NEW[cat.name];
      if (!transferTargetName) continue; // not in OLD_TO_NEW → keep it

      // Safety: assert the transfer target exists before deleting
      const transferId = catNameToId.get(transferTargetName);
      if (!transferId) {
        throw new Error(
          `ABORT: Transfer target "${transferTargetName}" for old category "${cat.name}" was not found. ` +
            `Did category creation succeed? Check Step 3 output above.`,
        );
      }

      log(
        `  DELETE "${cat.name}" (${cat.id}) → transfer to "${transferTargetName}" (${transferId})`,
      );
      await api.deleteCategory(cat.id, transferId);
    }
  }

  // Delete old groups (only if now empty)
  const finalGroups = await api.getCategoryGroups();
  const groupNameToId = new Map(finalGroups.map(g => [g.name, g.id]));

  for (const groupName of OLD_GROUPS_TO_DELETE) {
    const groupId = groupNameToId.get(groupName);
    if (!groupId) {
      log(`  SKIP   Group "${groupName}" not found — already gone`);
      continue;
    }
    const group = finalGroups.find(g => g.id === groupId)!;
    const remaining = group.categories?.filter(c => !c.hidden) ?? [];
    if (remaining.length > 0) {
      log(
        `  SKIP   Group "${groupName}" still has ${remaining.length} category(ies): ${remaining.map(c => c.name).join(', ')}`,
      );
      log(
        `         Add these to OLD_TO_NEW mappings and re-run --part=a to clear them.`,
      );
    } else {
      log(`  DELETE Group "${groupName}" (${groupId})`);
      await api.deleteCategoryGroup(groupId);
    }
  }

  // Step 5: Repair broken category_mapping entries (idempotent)
  //
  // During the first --part=a run, a bug caused Shopping/Entertainment/Personal
  // Care to be self-deleted. Actual Budget's deleteCategory does NOT directly
  // update the transactions table; it updates category_mapping so the view
  // (v_transactions_internal) can dereference old IDs to new ones at query time.
  //
  // The self-delete left category_mapping entries pointing to the tombstoned IDs
  // (e.g.  Plaid/Shopping → deleted Fun/Shopping → itself), so those transactions
  // appear uncategorized in the UI.
  //
  // Fix: call deleteCategory again on each tombstoned ID with the CORRECT new
  // category. The handler's SQL to find the record uses no tombstone filter, so
  // it still resolves the row and re-writes the category_mapping entry through
  // the CRDT system (the proper durable path).
  const BROKEN_MAPPING_REPAIR: Record<string, string> = {
    // tombstonedId → correct target category name
    '04b078de-c737-4322-82af-06ae0338ca9d': 'Shopping',       // old Fun/Shopping
    '77f47f04-2309-4417-9ca9-096a44af27eb': 'Entertainment',  // old Fun/Entertainment
    'd798ae29-70c4-4852-9dea-ad781ddd1288': 'Personal Care',  // old Fun/Personal Care
  };

  // Re-read catNameToId — by now the missing categories have been re-created.
  const repairCatMap = await buildCategoryNameMap(TARGET_GROUPS.map(g => g.name));

  section('  Step 5/5 — Repairing broken category_mapping entries');
  let repairCount = 0;
  for (const [tombstonedId, targetName] of Object.entries(BROKEN_MAPPING_REPAIR)) {
    const newCategoryId = repairCatMap.get(targetName);
    if (!newCategoryId) {
      log(`  WARN  Target "${targetName}" not found in repairCatMap — skipping`);
      continue;
    }
    log(
      `  REPAIR mapping: ${tombstonedId} → "${targetName}" (${newCategoryId})`,
    );
    // Re-invoking deleteCategory on an already-tombstoned category is idempotent:
    // it re-tombstones (no-op) and crucially re-writes the category_mapping entry
    // to point to newCategoryId through CRDT messages.
    await api.deleteCategory(tombstonedId, newCategoryId);
    repairCount++;
  }
  log(`  Fixed ${repairCount} broken mapping(s).`);

  log('\nPart A complete.');
}

// ─── Part B: Auto-categorization rules ───────────────────────────────────────

async function partB() {
  section('Part B — Auto-categorization rules');

  // Build category name→id map
  const catNameToId = await buildCategoryNameMap();

  // Get existing rules for idempotency check
  const existingRules = await api.getRules();

  // Build a set of existing imported_payee contains values (lowercased for comparison)
  const existingImportedPayeeContains = new Set<string>();
  for (const rule of existingRules) {
    for (const cond of rule.conditions) {
      if (
        cond.field === 'imported_payee' &&
        cond.op === 'contains' &&
        typeof cond.value === 'string'
      ) {
        existingImportedPayeeContains.add(cond.value.toLowerCase());
      }
    }
  }

  let created = 0;
  let skipped = 0;

  for (const ruleSpec of RULES) {
    const categoryId = catNameToId.get(ruleSpec.categoryName);
    if (!categoryId) {
      log(
        `  WARN  Category "${ruleSpec.categoryName}" not found — skipping rule for ${ruleSpec.importedPayeeContains.join(', ')}`,
      );
      continue;
    }

    for (const payeePattern of ruleSpec.importedPayeeContains) {
      const patternLower = payeePattern.toLowerCase();
      if (existingImportedPayeeContains.has(patternLower)) {
        log(`  SKIP  Rule for "${payeePattern}" already exists`);
        skipped++;
        continue;
      }

      await api.createRule({
        stage: 'pre',
        conditionsOp: 'and',
        conditions: [
          {
            field: 'imported_payee',
            op: 'contains',
            value: payeePattern,
            type: 'string',
          },
        ],
        actions: [
          {
            op: 'set',
            field: 'category',
            value: categoryId,
            type: 'id',
          },
        ],
      });
      log(
        `  CREATE Rule: imported_payee contains "${payeePattern}" → "${ruleSpec.categoryName}"`,
      );
      created++;
      existingImportedPayeeContains.add(patternLower); // prevent duplicates within this run
    }
  }

  log(
    `\nPart B complete. Created: ${created}, Skipped (already exist): ${skipped}`,
  );
  log(
    '\nAdd more rules as new merchants appear via Settings → Rules in the browser.',
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    log('\n[DRY-RUN] No changes will be made.\n');
  }

  await connect();

  if (DRY_RUN || PART_ARG === 'a' || PART_ARG === 'all') {
    if (DRY_RUN) {
      await printCurrentState();
    } else {
      await partA();
    }
  }

  if (RUN_PART_B) {
    await partB();
  }

  if (!DRY_RUN) {
    section('Syncing changes to server');
    await api.sync();
    log(
      '  Done. Reload the browser tab to see the updated categories and rules.',
    );
  }

  await api.shutdown();
  log('\nScript complete.\n');
}

main().catch(err => {
  console.error('\nFATAL:', err.message ?? err);
  process.exit(1);
});
