/**
 * Reading each existing tool's own report into verification evidence, per Check composition and
 * Evidence and exits under Verification CLI in docs/spec/agent-infrastructure.md. Every parser is pure:
 * it takes what the tool wrote and its exit code and returns a verdict, the coverage it executed and the
 * structured failures it named. The tools keep their logic; nothing here recomputes a contrast ratio, a
 * type or a freshness comparison.
 *
 * A validation failure is one the tool itself attributes to the checked source: an assertion, a
 * compiler diagnostic, a violated rule, a stale projection, a failing pairing. Anything else short of a
 * pass (an unreadable report, a crash, a file that never loaded, an exit the report does not explain) is
 * incomplete, because it proves nothing about the source.
 */
import type { NodeTestRecord } from './node-test-reporter.ts';
import type { AdapterReport } from './run.ts';

export type Parsed = Omit<AdapterReport, 'process'>;

const incomplete = (reason: string, extra: Partial<Parsed> = {}): Parsed => ({ verdict: 'incomplete', executed: [], reason, ...extra });

/** The JSON document a tool printed, after any banner its package manager wrote first. */
export function jsonDocument(text: string): unknown {
  const start = text.search(/^\{/m);
  if (start < 0) throw new Error('no JSON document in the output');
  return JSON.parse(text.slice(start));
}

type ArchitectureReport = {
  schemaVersion: number;
  command: string;
  status: 'clean' | 'violations' | 'incomplete';
  scopes: { kind: string; files: number }[];
  rules: { id: string; status: 'blocking' | 'advisory' | 'pending' }[];
  counts: { blocking: number; advisory: number; incomplete: number; excepted: number };
  diagnostics: { ruleId: string; severity: 'blocking' | 'advisory' | 'incomplete'; file: string; start: { line: number; column: number }; message: string }[];
};

/** `pnpm check:architecture --format json`: every active rule is coverage; blocking findings fail. */
export function architecture(stdout: string, exitCode: number | null): Parsed {
  let report: ArchitectureReport;
  try {
    report = jsonDocument(stdout) as ArchitectureReport;
  } catch (error) {
    return incomplete(`the architecture report is unreadable: ${(error as Error).message}`);
  }
  if (report.schemaVersion !== 1 || report.command !== 'check:architecture') return incomplete(`an unknown architecture report (schema ${report.schemaVersion})`);
  const active = report.rules.filter((rule) => rule.status !== 'pending');
  const expected = report.rules.filter((rule) => rule.status === 'blocking').map((rule) => `rule:${rule.id}`);
  const executed = active.map((rule) => `rule:${rule.id}`);
  const files = report.scopes.reduce((sum, scope) => sum + scope.files, 0);
  const line = (d: ArchitectureReport['diagnostics'][number]) => `${d.ruleId} ${d.file}:${d.start.line}:${d.start.column} ${d.message}`;
  const blocking = report.diagnostics.filter((d) => d.severity === 'blocking').map(line);
  const unfinished = report.diagnostics.filter((d) => d.severity === 'incomplete').map((d) => `incomplete: ${line(d)}`);
  const expectedExit = report.status === 'clean' ? 0 : report.status === 'violations' ? 1 : 2;
  if (exitCode !== expectedExit) return incomplete(`check:architecture reported ${report.status} but exited ${exitCode}`, { expected, executed });
  if (report.status === 'violations') {
    return { verdict: 'validation-failure', expected, executed, failures: [...blocking, ...unfinished], reason: `${blocking.length} blocking architecture violation(s)` };
  }
  if (report.status === 'incomplete') return incomplete(`the architecture analysis was incomplete: ${unfinished.join('; ')}`, { expected, executed, failures: unfinished });
  if (files === 0) return incomplete('the architecture check classified no source files', { expected, executed });
  return { verdict: 'passed', expected, executed, reason: `${executed.length} rule(s) over ${files} file(s), ${report.counts.excepted} excepted` };
}

type FreshnessReport = {
  schemaVersion: number;
  command: string;
  status: 'fresh' | 'stale' | 'invalid';
  outputs: { path: string; state: 'fresh' | 'added' | 'changed' }[];
  stale: string[];
  catalogue: string[];
  featureMap: string[];
};

/** `pnpm catalogue:check --json`: each generated file compared, and the feature map, are coverage. */
export function freshness(stdout: string, exitCode: number | null): Parsed {
  let report: FreshnessReport;
  try {
    report = jsonDocument(stdout) as FreshnessReport;
  } catch (error) {
    return incomplete(`the freshness report is unreadable: ${(error as Error).message}`);
  }
  if (report.schemaVersion !== 1 || report.command !== 'catalogue:check') return incomplete(`an unknown freshness report (schema ${report.schemaVersion})`);
  const executed = [...report.outputs.map((output) => `generated:${output.path}`), 'feature-map'];
  if (exitCode !== (report.status === 'fresh' ? 0 : 1)) return incomplete(`catalogue:check reported ${report.status} but exited ${exitCode}`, { executed });
  if (report.status === 'fresh') {
    if (report.outputs.length === 0) return incomplete('catalogue:check compared no generated files', { executed });
    return { verdict: 'passed', executed, reason: `${report.outputs.length} generated file(s) fresh; the feature map is valid` };
  }
  const failures = [
    ...report.outputs.filter((output) => output.state !== 'fresh').map((output) => `${output.state}: ${output.path}; run \`pnpm catalogue:generate\``),
    ...report.stale.map((path) => `stale (no longer generated): ${path}; remove it by hand`),
    ...report.catalogue.map((diagnostic) => `catalogue: ${diagnostic}`),
    ...report.featureMap.map((diagnostic) => `feature map: ${diagnostic}`),
  ];
  return { verdict: 'validation-failure', executed, failures, reason: `the catalogue is ${report.status}: ${failures.length} finding(s)` };
}

/**
 * `pnpm typecheck`: the root project, then `pnpm -r typecheck`, which prefixes each package's lines with
 * its directory. A project counts as executed once the compiler finished it, clean or with diagnostics.
 */
export function typecheck(log: string, exitCode: number | null, packages: string[]): Parsed {
  const expected = ['tsc:.', ...packages.map((directory) => `tsc:${directory}`)];
  const executed = new Set<string>();
  const failures: string[] = [];
  let recursive = false;
  for (const line of log.split('\n')) {
    if (/^Scope: /.test(line)) recursive = true;
    const finished = /^(\S+) typecheck: (Done|Failed)$/.exec(line);
    if (finished) {
      executed.add(`tsc:${finished[1]}`);
      continue;
    }
    const diagnostic = /^(?:(\S+) typecheck: )?((?:.+\(\d+,\d+\): )?error TS\d+: .*)$/.exec(line);
    if (diagnostic) {
      const directory = diagnostic[1] ?? '.';
      failures.push(`${directory === '.' ? '' : `${directory}/`}${diagnostic[2]}`);
      executed.add(`tsc:${directory}`);
    }
  }
  // `tsc -p tsconfig.json && pnpm -r typecheck`: the recursive run starts only after the root passed.
  if (recursive) executed.add('tsc:.');
  const done = [...executed].sort();
  if (failures.length > 0) return { verdict: 'validation-failure', expected, executed: done, failures, reason: `${failures.length} compiler error(s)` };
  if (exitCode !== 0) return incomplete(`pnpm typecheck exited ${exitCode} without a compiler diagnostic`, { expected, executed: done });
  return { verdict: 'passed', expected, executed: done };
}

/**
 * `python3 packages/tokens/scripts/palette.py --check -v`: the generator prints every gated pairing
 * it computed, both modes' contrast tokens, the verdict and the freshness comparison.
 */
export function palette(log: string, exitCode: number | null): Parsed {
  const executed: string[] = [];
  const failures: string[] = [];
  let verdict: 'pass' | 'fail' | null = null;
  let freshness: 'fresh' | 'differs' | null = null;
  for (const line of log.split('\n')) {
    const mode = /^(dark|light) contrast tokens: /.exec(line);
    if (mode) executed.push(`contrast:${mode[1]}`);
    const row = /^\s+\('(dark|light)', '([^']+)', '([^']+)', ([\d.]+), ([\d.]+)\)$/.exec(line);
    if (row) executed.push(`pairing:${row[1]}:${row[2]}/${row[3]}`);
    if (line === 'ALL PAIRINGS PASS') verdict = 'pass';
    if (line === 'FAILS:') verdict = 'fail';
    const failing = /^\s+(dark|light): (\S+) on (\S+) is ([\d.]+):1, minimum ([\d.]+):1$/.exec(line);
    if (failing) failures.push(`${failing[1]}: ${failing[2]} on ${failing[3]} is ${failing[4]}:1, below ${failing[5]}:1`);
    if (line === 'palette.json matches a fresh run') freshness = 'fresh';
    if (line === 'palette.json differs from a fresh run:') {
      freshness = 'differs';
      failures.push('palette.json differs from a fresh run of the generator; regenerate it, never hand-edit it');
    }
  }
  if (freshness !== null) executed.push('palette.json freshness');
  const expected = ['contrast:dark', 'contrast:light', 'palette.json freshness'];
  if (failures.length > 0 && (verdict === 'fail' || freshness === 'differs')) {
    return { verdict: 'validation-failure', expected, executed, failures, reason: `${failures.length} palette failure(s)` };
  }
  if (exitCode !== 0 || verdict !== 'pass' || freshness !== 'fresh') {
    return incomplete(`palette.py exited ${exitCode} without a verdict it explains (contrast ${verdict ?? 'not reported'}, freshness ${freshness ?? 'not reported'})`, { expected, executed });
  }
  if (!executed.some((id) => id.startsWith('pairing:'))) return incomplete('palette.py reported no gated pairing', { expected, executed });
  return { verdict: 'passed', expected, executed };
}

/** Vitest's JSON reporter, as far as the adapter reads it. */
export type VitestReport = {
  success: boolean;
  numTotalTests: number;
  testResults: {
    name: string;
    status: 'passed' | 'failed';
    message: string;
    assertionResults: { fullName: string; status: string; failureMessages: string[] | null; meta?: { scenario?: { case?: string } } }[];
  }[];
};

const firstLine = (text: string) => text.split('\n').find((line) => line.trim() !== '')?.trim() ?? '';

/**
 * A Vitest run. Coverage is each test file that ran tests, each test and each registered scenario
 * case. A skipped test is expected and skipped, so it can never pass. A file that failed without a
 * failing test never loaded, which is incomplete rather than a proven failure.
 */
export function vitest(report: VitestReport, relative: (path: string) => string): Parsed {
  const executed: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];
  const unloaded: string[] = [];
  for (const file of report.testResults) {
    const path = relative(file.name);
    let ran = 0;
    for (const test of file.assertionResults) {
      const id = `${path} > ${test.fullName}`;
      if (test.status === 'passed') {
        executed.push(id);
        ran += 1;
        const scenario = test.meta?.scenario?.case;
        if (scenario) executed.push(scenario);
      } else if (test.status === 'failed') {
        executed.push(id);
        ran += 1;
        failures.push(`${id}: ${firstLine((test.failureMessages ?? []).join('\n')) || 'failed'}`);
      } else skipped.push(id);
    }
    if (ran > 0) executed.push(path);
    if (file.status === 'failed' && !file.assertionResults.some((test) => test.status === 'failed')) {
      unloaded.push(`${path}: ${firstLine(file.message) || 'failed without a failing test'}`);
    }
  }
  const expected = [...skipped];
  if (failures.length > 0) {
    return { verdict: 'validation-failure', expected, executed, skipped, failures: [...failures, ...unloaded], reason: `${failures.length} failing test(s)` };
  }
  if (unloaded.length > 0) return incomplete(`test file(s) did not run: ${unloaded.join('; ')}`, { expected, executed, skipped });
  if (!report.success) return incomplete('Vitest reported the run unsuccessful without a failing test, such as an unhandled error', { expected, executed, skipped });
  return { verdict: 'passed', expected, executed, skipped };
}

/**
 * A `node --test` run through node-test-reporter.ts. Node finishes children before their parent, so
 * each record claims the pending records one level deeper as its descendants and prefixes their names.
 * A failure Node names after the whole file is a file that never loaded or exited early: incomplete. A
 * pass named after the file ran no test, which leaves the file without coverage.
 */
export function nodeTest(lines: string, relative: (path: string) => string): Parsed {
  type Node = { record: NodeTestRecord; names: string[]; descendants: Node[] };
  const pending = new Map<string, Node[]>();
  const all: Node[] = [];
  for (const text of lines.split('\n')) {
    if (text.trim() === '') continue;
    const record = JSON.parse(text) as NodeTestRecord;
    const file = record.file ?? '';
    const queue = pending.get(file) ?? [];
    const node: Node = { record, names: [record.name], descendants: [] };
    const children = queue.filter((entry) => entry.record.nesting === record.nesting + 1);
    for (const child of children) {
      for (const descendant of [child, ...child.descendants]) descendant.names.unshift(record.name);
      node.descendants.push(child, ...child.descendants);
    }
    pending.set(file, [...queue.filter((entry) => !children.includes(entry)), node]);
    all.push(node);
  }
  const executed = new Set<string>();
  const skipped: string[] = [];
  const failures: string[] = [];
  const unloaded: string[] = [];
  const VALIDATION = new Set(['testCodeFailure', 'hookFailure']);
  for (const { record, names } of all) {
    const path = record.file ? relative(record.file) : '(no file)';
    const whole = record.nesting === 0 && record.file !== null && (record.file === record.name || record.file.endsWith(`/${record.name}`));
    // Node names a file as a whole only when it failed, or ran no test at all: neither is coverage.
    if (whole) {
      if (record.event === 'fail') unloaded.push(`${path}: ${record.message ?? 'the file failed'}`);
      continue;
    }
    if (record.kind === 'suite') continue;
    const id = `${path} > ${names.join(' > ')}`;
    if (record.skip || record.todo) {
      skipped.push(id);
      continue;
    }
    executed.add(id);
    executed.add(path);
    if (record.event === 'fail') {
      if (VALIDATION.has(record.failureType ?? '')) failures.push(`${id}: ${firstLine(record.message ?? '') || 'failed'}`);
      else unloaded.push(`${id}: ${record.failureType ?? 'failed'}${record.message ? ` (${firstLine(record.message)})` : ''}`);
    }
  }
  const done = [...executed].sort();
  const expected = [...skipped];
  if (failures.length > 0) return { verdict: 'validation-failure', expected, executed: done, skipped, failures: [...failures, ...unloaded], reason: `${failures.length} failing test(s)` };
  if (unloaded.length > 0) return incomplete(`test(s) did not finish: ${unloaded.join('; ')}`, { expected, executed: done, skipped });
  return { verdict: 'passed', expected, executed: done, skipped };
}
