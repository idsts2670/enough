// overview:
// 1. Identify the migrations in packages/loot-core/migrations/* on the base ref and HEAD
// 2. Make sure that any new migrations on HEAD are dated after the latest migration on the base ref.

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'packages',
  'loot-core',
  'migrations',
);

function readMigrations(ref: string) {
  const { stdout, status, stderr } = spawnSync('git', [
    'ls-tree',
    '--name-only',
    ref,
    migrationsDir + '/',
  ]);
  if (status !== 0) {
    console.error(
      `Unable to read migrations from ${ref}:\n${stderr.toString()}`,
    );
    process.exit(1);
  }

  const files = stdout.toString().split('\n').filter(Boolean);
  console.log(`Found ${files.length} migrations on ${ref}.`);
  return files
    .map(file => path.basename(file))
    .filter(file => !file.startsWith('.'))
    .map(name => ({
      date: parseInt(name.split('_')[0]),
      name: name.match(/^\d+_(.+?)(\.sql)?$/)?.[1] ?? '***' + name,
    }));
}

function hasRef(ref: string) {
  const { status } = spawnSync('git', [
    'rev-parse',
    '--verify',
    '--quiet',
    ref,
  ]);
  return status === 0;
}

const baseBranch = process.env.GITHUB_BASE_REF;
const baseRef = baseBranch ? `origin/${baseBranch}` : 'origin/HEAD';

if (baseBranch && !hasRef(baseRef)) {
  const { status, stderr } = spawnSync('git', ['fetch', 'origin', baseBranch]);

  if (status !== 0) {
    console.error(
      `Unable to fetch pull request base branch ${baseBranch}:\n${stderr.toString()}`,
    );
    process.exit(1);
  }
}

const baseMigrations = readMigrations(baseRef);
const headMigrations = readMigrations('HEAD');

const latestBaseMigration = baseMigrations[baseMigrations.length - 1]?.date;
if (latestBaseMigration == null) {
  console.error(`No migrations found on ${baseRef}.`);
  process.exit(1);
}

const newMigrations = headMigrations.filter(
  migration => !baseMigrations.find(m => m.name === migration.name),
);
const badMigrations = newMigrations.filter(
  migration => migration.date <= latestBaseMigration,
);

if (badMigrations.length) {
  console.error(
    `The following migrations are dated before the latest migration on ${baseRef}:`,
  );
  badMigrations.forEach(migration => {
    console.error(`  ${migration.name}`);
  });
  process.exit(1);
} else {
  console.log(
    `All migrations are dated after the latest migration on ${baseRef}.`,
  );
}
