import fs from 'node:fs';
import path from 'node:path';

type Allowlist = {
  files: Array<{
    path: string;
    patterns: Array<
      | string
      | {
          pattern: string;
          count: number;
        }
    >;
  }>;
};

type Finding = {
  path: string;
  line: number;
  pattern: string;
  text: string;
};

const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(ROOT, 'tools', 'typography-allowlist.json');
const SCAN_ROOTS = [
  'packages/component-library/src',
  'packages/desktop-client/src',
].map(relativePath => path.join(ROOT, relativePath));
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.scss']);
const TYPOGRAPHY_DECLARATION =
  /\b(fontSize|font-size|fontWeight|font-weight|letterSpacing|letter-spacing)\s*[:=]\s*([^,;}\n]+)/g;

function toRelative(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizeProp(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function normalizeValue(value: string): string {
  return value
    .trim()
    .replace(/\s+as\s+const$/, '')
    .replace(/^['"]/, '')
    .replace(/['"]$/, '')
    .trim();
}

function isRawLiteral(value: string): boolean {
  return (
    /^-?\d+(\.\d+)?(px|em|rem)?$/.test(value) ||
    value === 'bold' ||
    value === 'normal'
  );
}

function shouldSkipFile(filePath: string): boolean {
  return (
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.test.tsx') ||
    filePath.endsWith('.stories.ts') ||
    filePath.endsWith('.stories.tsx')
  );
}

function findRawTypography(): Finding[] {
  const findings: Finding[] = [];

  for (const root of SCAN_ROOTS) {
    for (const filePath of walk(root)) {
      if (shouldSkipFile(filePath)) continue;

      const relativePath = toRelative(filePath);
      const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

      lines.forEach((line, index) => {
        let match: RegExpExecArray | null;
        TYPOGRAPHY_DECLARATION.lastIndex = 0;

        while ((match = TYPOGRAPHY_DECLARATION.exec(line))) {
          const prop = normalizeProp(match[1]);
          const value = normalizeValue(match[2]);

          if (!isRawLiteral(value)) continue;

          findings.push({
            path: relativePath,
            line: index + 1,
            pattern: `${prop}: ${value}`,
            text: line.trim(),
          });
        }
      });
    }
  }

  return findings;
}

function groupFindingCounts(
  findings: Finding[],
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const finding of findings) {
    const fileCounts = counts.get(finding.path) ?? new Map<string, number>();
    fileCounts.set(finding.pattern, (fileCounts.get(finding.pattern) ?? 0) + 1);
    counts.set(finding.path, fileCounts);
  }

  return counts;
}

function loadAllowlist(): Map<string, Map<string, number>> {
  if (!fs.existsSync(ALLOWLIST_PATH)) return new Map();

  const allowlist = JSON.parse(
    fs.readFileSync(ALLOWLIST_PATH, 'utf8'),
  ) as Allowlist;
  return new Map(
    allowlist.files.map(file => [
      file.path,
      new Map(
        file.patterns.map(patternEntry => {
          if (typeof patternEntry === 'string') {
            return [patternEntry, Number.POSITIVE_INFINITY];
          }

          return [patternEntry.pattern, patternEntry.count];
        }),
      ),
    ]),
  );
}

function createAllowlist(findings: Finding[]): Allowlist {
  const byFile = groupFindingCounts(findings);

  return {
    files: [...byFile.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([filePath, patternCounts]) => ({
        path: filePath,
        patterns: [...patternCounts.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([pattern, count]) => ({ pattern, count })),
      })),
  };
}

function printReport(findings: Finding[]): void {
  const byPattern = new Map<string, Finding[]>();
  for (const finding of findings) {
    const group = byPattern.get(finding.pattern) ?? [];
    group.push(finding);
    byPattern.set(finding.pattern, group);
  }

  console.log(`Raw typography findings: ${findings.length}`);
  for (const [pattern, group] of [...byPattern.entries()].sort((a, b) => {
    return b[1].length - a[1].length || a[0].localeCompare(b[0]);
  })) {
    const examples = group
      .slice(0, 5)
      .map(finding => `${finding.path}:${finding.line}`)
      .join(', ');
    console.log(`${pattern} | count=${group.length} | examples=${examples}`);
  }
}

function printFailures(failures: Finding[]): void {
  console.error(
    `Found ${failures.length} unallowlisted raw typography declaration(s).`,
  );
  for (const failure of failures) {
    console.error(
      `${failure.path}:${failure.line} ${failure.pattern} :: ${failure.text}`,
    );
  }
  console.error(
    'Use shared typography tokens, or add a temporary per-file allowlist entry with a removal plan.',
  );
}

function flattenCountFailures(
  findings: Finding[],
  allowlist: Map<string, Map<string, number>>,
): Finding[] {
  const findingsByKey = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = `${finding.path}\0${finding.pattern}`;
    const group = findingsByKey.get(key) ?? [];
    group.push(finding);
    findingsByKey.set(key, group);
  }

  const failures: Finding[] = [];
  for (const [key, group] of findingsByKey) {
    const [filePath, pattern] = key.split('\0');
    const allowedCount = allowlist.get(filePath)?.get(pattern) ?? 0;
    if (group.length > allowedCount) {
      failures.push(...group.slice(allowedCount));
    }
  }

  return failures;
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const findings = findRawTypography();

  if (args.has('--update-allowlist')) {
    fs.mkdirSync(path.dirname(ALLOWLIST_PATH), { recursive: true });
    fs.writeFileSync(
      ALLOWLIST_PATH,
      JSON.stringify(createAllowlist(findings), null, 2) + '\n',
    );
    console.log(`Wrote ${toRelative(ALLOWLIST_PATH)}`);
    printReport(findings);
    return;
  }

  if (args.has('--report') || !args.has('--gate')) {
    printReport(findings);
  }

  if (args.has('--gate')) {
    const allowlist = loadAllowlist();
    const failures = flattenCountFailures(findings, allowlist);

    if (failures.length > 0) {
      printFailures(failures);
      process.exitCode = 1;
    }
  }
}

main();
