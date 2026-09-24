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

/** CSI sequences (colour, cursor, erase) and OSC sequences (hyperlinks, titles) a terminal would interpret. */
const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/**
 * What a tool printed, as a terminal would show it. `FORCE_COLOR`, set to any value, `0` included,
 * turns picocolors on in the child, so every text parser reads through this rather than trusting the
 * child's environment to keep escape codes out.
 */
export function plain(text: string): string {
  return text.replace(ANSI, '');
}

const incomplete = (reason: string, extra: Partial<Parsed> = {}): Parsed => ({ verdict: 'incomplete', executed: [], reason, ...extra });

/** The JSON document a tool printed, after any banner its package manager wrote first. */
export function jsonDocument(text: string): unknown {
  const clean = plain(text);
  const start = clean.search(/^\{/m);
  if (start < 0) throw new Error('no JSON document in the output');
  return JSON.parse(clean.slice(start));
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
  for (const line of plain(log).split('\n')) {
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
  for (const line of plain(log).split('\n')) {
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

const firstLine = (text: string) => plain(text).split('\n').find((line) => line.trim() !== '')?.trim() ?? '';

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
      if (record.event === 'fail') unloaded.push(`${path}: ${plain(record.message ?? 'the file failed')}`);
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

/**
 * The lines the registry pipeline prints: the token build, each element bundle with its gzip budget,
 * and the registry build, whose stamp verification runs before its closing line. Its own failures (a
 * contrast or token error, a bundle over budget, compiled source that kept an export, a thrown
 * build-registry error) are validation failures. A `npx shadcn` that could not run is not one.
 */
export function registryLog(log: string): { executed: string[]; failures: string[] } {
  const executed: string[] = [];
  const failures: string[] = [];
  const lines = plain(log).split('\n');
  lines.forEach((line, index) => {
    if (/^@ultima\/tokens: wrote dist\/tokens\.css and dist\/tokens\.json /.test(line)) executed.push('build:tokens');
    const bundle = /^@ultima\/elements: wrote dist\/(\S+)\.js \(.*?(, budget [\d.]+ KB)?\)$/.exec(line);
    if (bundle) {
      executed.push(`bundle:${bundle[1]}`);
      if (bundle[2]) executed.push(`budget:${bundle[1]}`);
    }
    if (/^registry: built \d+ items into apps\/docs\/public\/r$/.test(line)) executed.push('registry:items and stamps');
    if (/^@ultima\/tokens build: /.test(line) || /^@ultima\/elements build: /.test(line)) failures.push(line);
    if (/^@ultima\/elements: dist\/\S+ is .*, over the recorded [\d.]+ KB budget$/.test(line)) failures.push(line);
    if (/: compiled source still has exports or runtime stylex:/.test(line)) failures.push(line);
    const thrown = /^Error: (.+)$/.exec(line);
    if (thrown && !/^Command failed/.test(thrown[1] as string) && lines.slice(index + 1, index + 4).some((frame) => /scripts\/build-registry\.ts/.test(frame))) {
      failures.push(`scripts/build-registry.ts: ${thrown[1]}`);
    }
  });
  return { executed, failures };
}

/** `pnpm registry:build`: the token build, each family bundle and the aggregate, and the registry. */
export function registryBuild(log: string, exitCode: number | null, families: string[]): Parsed {
  const expected = ['build:tokens', ...families.map((family) => `bundle:${family}`), 'bundle:ultima', 'registry:items and stamps'];
  const { executed, failures } = registryLog(log);
  if (failures.length > 0) return { verdict: 'validation-failure', expected, executed, failures, reason: `${failures.length} registry build failure(s)` };
  if (exitCode !== 0) return incomplete(`registry:build exited ${exitCode} without a failure the build names, such as npx shadcn failing to run`, { expected, executed });
  return { verdict: 'passed', expected, executed };
}

/**
 * `pnpm --filter @ultima/docs build`: the registry pipeline its script runs, then `vite build`. Vite
 * names the mode it built for; an `error during build:` is a compile failure in the checked source.
 */
export function docsBuild(log: string, exitCode: number | null, families: string[]): Parsed & { mode: string | null; builder: string | null } {
  const registry = registryBuild(log, 0, families);
  const expected = [...(registry.expected ?? []), 'build:vite'];
  const executed = [...registry.executed];
  const failures = [...(registry.failures ?? [])];
  let mode: string | null = null;
  let builder: string | null = null;
  const lines = plain(log).split('\n');
  lines.forEach((line, index) => {
    const building = /^(vite v\S+) building (?:client environment )?for (\w+)/.exec(line);
    if (building) {
      builder = building[1] as string;
      mode = building[2] as string;
    }
    if (/^✓ built in /.test(line)) executed.push('build:vite');
    if (/error during build:/.test(line)) failures.push(`vite build: ${lines.slice(index + 1).find((next) => next.trim() !== '')?.trim() ?? 'failed'}`);
  });
  if (failures.length > 0) return { verdict: 'validation-failure', expected, executed, failures, reason: `${failures.length} docs build failure(s)`, mode, builder };
  if (exitCode !== 0) return { ...incomplete(`the docs build exited ${exitCode} without a failure the build names`, { expected, executed }), mode, builder };
  if (mode !== 'production') return { ...incomplete(`vite reported building for ${mode ?? 'no mode'}, not production`, { expected, executed }), mode, builder };
  return { verdict: 'passed', expected, executed, mode, builder };
}

/** What `scripts/smoke-install.sh` prints about its own progress rather than a failed assertion. */
const SMOKE_PROGRESS = [
  /^serving /,
  /^kept /,
  /^packed /,
  /^the catalogue is \d+ components$/,
  /^\d+ installed files carry their item stamp$/,
  /^status reports all \d+ installed files current$/,
  /^diff button shows only the edit$/,
  /^the installed Claude Code hook returns the palette finding$/,
  /^every target passed against /,
  /^FAILED in the \S+ target$/,
  // The script's own server failing to start is infrastructure, not a product failure.
  /^the static server did not start$/,
];

/** Output of a consumer's own compiler: the installed source did not build. */
const CONSUMER_COMPILE = /error TS\d+:|Failed to compile|Type error:|error during build:|Build error occurred/;
const NETWORK = /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENETUNREACH|getaddrinfo|network request|fetch failed/i;

/** The targets the smoke script runs, in order: the `<name>_target` calls at its top level. */
export function smokeTargets(script: string): string[] {
  return [...script.matchAll(/^([a-z]+)_target$/gm)].map((match) => match[1] as string);
}

/**
 * `scripts/smoke-install.sh --keep` on its local path. Coverage is the local registry build, the packed
 * CLI, the served catalogue and each target that finished; a target finishes when the next one starts
 * or the script reports every target passed. The server URL must be the loopback one the script
 * started itself: a `--host` run proves nothing about the snapshot. A failed assertion the script
 * prints, or a consumer's compiler rejecting installed source, is a validation failure; a network or
 * scaffolding failure short of one is incomplete.
 */
export function smoke(log: string, exitCode: number | null, targets: string[]): Parsed & { url: string | null; work: string | null } {
  const expected = ['smoke:local registry build', 'smoke:cli packed', 'smoke:catalogue served', ...targets.map((target) => `smoke:target:${target}`)];
  const lines = plain(log).split('\n');
  const served = lines.map((line) => /^smoke-install: serving (\S+)$/.exec(line)?.[1]).filter((url): url is string => url !== undefined);
  const url = served.length === 1 ? (served[0] as string) : null;
  const work = lines.map((line) => /^smoke-install: kept (.+)$/.exec(line)?.[1]).find((path) => path !== undefined) ?? null;
  const at = (text: string) => (url ? text.split(url).join('$HOST') : text);
  const executed: string[] = [];
  const started: string[] = [];
  let step: string | null = null;
  const passedAgainst = lines.map((line) => /^smoke-install: every target passed against (\S+)$/.exec(line)?.[1]).find((host) => host !== undefined) ?? null;
  for (const line of lines) {
    const heading = /^── (.+)$/.exec(line);
    if (heading) {
      step = at(heading[1] as string);
      executed.push(`smoke:step:${step}`);
      if (step === 'building the registry') executed.push('smoke:local registry build');
      const target = /^([a-z]+): /.exec(step)?.[1];
      if (target && targets.includes(target) && !started.includes(target)) {
        const previous = started.at(-1);
        if (previous) executed.push(`smoke:target:${previous}`);
        started.push(target);
      }
    }
    if (/^smoke-install: packed ultima-systems-cli-.+\.tgz$/.test(line)) executed.push('smoke:cli packed');
    if (/^smoke-install: the catalogue is \d+ components$/.test(line)) executed.push('smoke:catalogue served');
  }
  if (passedAgainst !== null && exitCode === 0) {
    const last = started.at(-1);
    if (last) executed.push(`smoke:target:${last}`);
  }
  const failedTarget = lines.map((line) => /^smoke-install: FAILED in the (\S+) target$/.exec(line)?.[1]).find((target) => target !== undefined) ?? null;
  const assertions = lines
    .map((line) => /^smoke-install: (.+)$/.exec(line)?.[1])
    .filter((message): message is string => message !== undefined && !SMOKE_PROGRESS.some((pattern) => pattern.test(message)))
    .map((message) => `${failedTarget ?? 'smoke'}: ${at(message)}`);
  const extra = { url, work };
  if (url === null) {
    return { ...incomplete(served.length > 1 ? 'the smoke script reported more than one server' : 'the smoke script started no local server of its own, so it did not test this snapshot'), expected, executed, ...extra };
  }
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) return { ...incomplete(`the smoke script served ${url}, not a loopback address it owns`), expected, executed, ...extra };
  if (exitCode === 0) {
    if (passedAgainst !== url) return { ...incomplete(`the smoke script exited 0 without reporting every target passed against ${url}`), expected, executed, ...extra };
    return { verdict: 'passed', expected, executed, ...extra };
  }
  if (assertions.length > 0) return { verdict: 'validation-failure', expected, executed, failures: assertions, reason: `the ${failedTarget ?? 'smoke'} target failed an assertion`, ...extra };
  const built = step === 'building the registry' ? registryLog(log).failures : [];
  if (built.length > 0) return { verdict: 'validation-failure', expected, executed, failures: built, reason: 'the local registry build failed', ...extra };
  const compile = step && /: npm run build$/.test(step) ? lines.find((line) => CONSUMER_COMPILE.test(line)) : undefined;
  if (compile) {
    return { verdict: 'validation-failure', expected, executed, failures: [`${failedTarget ?? 'smoke'}: the consumer build rejected installed source: ${compile.trim()}`], reason: `the ${failedTarget} consumer did not compile`, ...extra };
  }
  const network = lines.find((line) => NETWORK.test(line));
  return {
    ...incomplete(
      `the smoke script exited ${exitCode}${failedTarget ? ` in the ${failedTarget} target` : ''}${step ? ` during "${step}"` : ''} without a failed assertion${network ? `; the network failed: ${network.trim()}` : ''}`,
    ),
    expected,
    executed,
    ...extra,
  };
}
