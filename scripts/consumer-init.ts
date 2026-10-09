// The installed-consumer case for `ultima-design init`: docs/spec/consumer-setup.md, Implementation acceptance scenarios.
// The packed CLI runs outside the workspace against the candidate registry, plans and applies a new Vite, Next root and
// Next src app with each package manager, and Chromium checks the production preview's paint and interaction in both
// color modes. Seeded faults in the first manager's app of each layout must each fail observably.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Browser } from 'playwright';
import { resolveDraft, stockDraft } from '../packages/tokens/src/theme/draft.ts';
import { packCli, repository, run, serveRegistry } from './consumer-helpers.ts';
import { browserErrors, serveNext } from './consumer-next.ts';
import { hashSource } from './verification/source.ts';

const MANAGERS = ['npm', 'pnpm'] as const;
const CASES = {
  vite: { args: ['--framework', 'vite'], next: false, root: 'src/' },
  'next-root': { args: ['--framework', 'next'], next: true, root: '' },
  'next-src': { args: ['--framework', 'next', '--layout', 'src'], next: true, root: 'src/' },
} as const;
type CaseId = keyof typeof CASES;
// Chromium reports a light preference when the system states none, so the dark fallback has no case of its own here.
const MODES = [
  { id: 'system-dark', scheme: 'dark', mode: 'dark' },
  { id: 'system-light', scheme: 'light', mode: 'light' },
] as const;
type Check = { name: string; passed: boolean; detail?: unknown };
type Fault = { id: string; files: Record<string, (text: string | null) => string | null> };

const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

/** Each fault rewrites files, keyed by path, from their current text; null deletes the file. */
function faults(id: CaseId): Fault[] {
  const { next, root } = CASES[id];
  const css = next ? `${root}app/globals.css` : 'src/index.css';
  const replace = (from: string, to: string) => (text: string | null) => {
    if (!text?.includes(from)) throw new Error(`the fault expects ${JSON.stringify(from)}`);
    return text.replace(from, to);
  };
  const list: Fault[] = [
    next
      ? { id: 'missing-css', files: { [`${root}app/layout.tsx`]: replace('import "./ultima.css";\n', '') } }
      : { id: 'missing-css', files: { 'src/main.tsx': replace("import './index.css'\n", '') } },
    { id: 'unlayered-reset', files: { [css]: (text) => `${text}\n* {\n  padding: 0;\n  margin: 0;\n}\n` } },
    { id: 'missing-transitive-source', files: { [`${root}lib/component.ts`]: (text) => { assert.ok(text !== null, 'the fault expects lib/component.ts'); return null; } } },
  ];
  if (next) {
    const other = root ? "['app/**/*.{js,jsx,ts,tsx}', 'components/**/*.{js,jsx,ts,tsx}', 'lib/**/*.{js,jsx,ts,tsx}']" : "['src/**/*.{js,jsx,ts,tsx}']";
    list.push({ id: 'wrong-src-extraction', files: { 'postcss.config.js': replace("include: ['**/*.{js,jsx,ts,tsx}']", `include: ${other}`) } });
  }
  return list;
}

async function cli(work: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const { spawn } = await import('node:child_process');
  return new Promise((done) => {
    const child = spawn(join(work, 'cli/node_modules/.bin/ultima'), args, { cwd: work, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); process.stderr.write(data); });
    child.on('close', (code) => done({ code: code ?? 1, stdout, stderr }));
  });
}

async function serve(app: string, next: boolean, log: string) {
  return next ? serveNext(app, log) : serveRegistry(join(app, 'dist'), true);
}

async function preview(browser: Browser, url: string, scheme: 'dark' | 'light', mode: 'dark' | 'light'): Promise<Check[]> {
  const table = resolveDraft(stockDraft())[mode];
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 375, height: 800 } });
  const page = await context.newPage();
  // Console errors, page errors, hydration warnings and failed required assets.
  const errors = browserErrors(page);
  const checks: Check[] = [];
  const record = (name: string, passed: boolean, detail?: unknown) => checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
  try {
    await page.goto(url);
    const heading = page.getByRole('heading', { name: 'Ultima is ready', level: 1 });
    await heading.waitFor({ timeout: 15_000 });
    const paint = (selector: 'root' | 'control' | 'popup') => page.evaluate(({ selector, table }) => {
      const element = selector === 'root' ? document.documentElement : selector === 'control' ? [...document.querySelectorAll('button')].find((button) => /Confirm setup|Undo/.test(button.textContent ?? '')) : document.querySelector('[role="dialog"]');
      if (!element) return { missing: selector };
      const probe = document.createElement('div');
      document.body.append(probe);
      const normalize = (value: string) => { probe.style.color = value; return getComputedStyle(probe).color; };
      const css = getComputedStyle(element);
      const expected = selector === 'root'
        ? { backgroundColor: normalize(table['--ult-color-surface']!), color: normalize(table['--ult-color-text']!) }
        : selector === 'control'
          ? { backgroundColor: normalize(table['--ult-color-accent']!), color: normalize(table['--ult-color-accent-contrast']!) }
          : { backgroundColor: normalize(table['--ult-color-surface-raised']!), color: normalize(table['--ult-color-text']!) };
      probe.remove();
      return { expected, actual: { backgroundColor: css.backgroundColor, color: css.color }, colorScheme: css.colorScheme, paddingInlineStart: css.paddingInlineStart };
    }, { selector, table: table as Record<string, string> });
    for (const part of ['root', 'control'] as const) {
      const value = await paint(part);
      record(`${part}-paint`, 'expected' in value && JSON.stringify(value.expected) === JSON.stringify(value.actual) && value.colorScheme === mode, value);
      // An unlayered reset beats every layered StyleX rule, so the control loses its token padding.
      if (part === 'control') record('control-spacing', 'paddingInlineStart' in value && Number.parseFloat(value.paddingInlineStart ?? '0') > 0, value);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    record('narrow-fit', overflow <= 0, { overflow, width: 375 });
    const button = page.getByRole('button', { name: 'Confirm setup' });
    await button.click();
    // The update needs hydrated client code, so on Next it also proves hydration finished.
    record('button-updates', (await page.getByText('Setup confirmed.').count()) === 1 && (await page.getByRole('button', { name: 'Undo' }).count()) === 1);
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Next steps' });
    await dialog.waitFor({ timeout: 5_000 });
    record('dialog-keyboard-open', await dialog.isVisible());
    const popup = await paint('popup');
    record('dialog-paint', 'expected' in popup && JSON.stringify(popup.expected) === JSON.stringify(popup.actual) && popup.colorScheme === mode, popup);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 });
    record('dialog-escape-focus-return', await trigger.evaluate((element) => element === document.activeElement));
  } catch (error) {
    record('scene-reachable', false, String(error));
  }
  record('no-console-errors', errors.length === 0, errors);
  await context.close();
  return checks;
}

/** Seeds one fault, rebuilds and loads the preview, then restores every file it touched. */
async function seeded(browser: Browser, app: string, manager: string, id: CaseId, fault: Fault, output: string) {
  const original = new Map<string, string | null>();
  for (const [path, change] of Object.entries(fault.files)) {
    const text = await readFile(join(app, path), 'utf8').catch(() => null);
    original.set(path, text);
    const next = change(text);
    if (next === null) await rm(join(app, path));
    else await writeFile(join(app, path), next);
  }
  try {
    try {
      await run(app, manager, ['run', 'build']);
    } catch (error) {
      return { id: fault.id, failed: true, observed: 'build failed', detail: String(error).split('\n').slice(0, 3).join('\n') };
    }
    const server = await serve(app, CASES[id].next, join(output, `${id}-${manager}-${fault.id}-server.log`));
    try {
      const checks = await preview(browser, server.url, 'dark', 'dark');
      const failed = checks.filter(({ passed }) => !passed).map(({ name }) => name);
      return { id: fault.id, failed: failed.length > 0, observed: failed.length > 0 ? `browser checks failed: ${failed.join(', ')}` : 'every check passed', checks };
    } finally {
      await server.close();
    }
  } finally {
    for (const [path, text] of original) if (text !== null) await writeFile(join(app, path), text);
  }
}

const { values } = parseArgs({
  allowNegative: true,
  options: { case: { type: 'string', multiple: true }, manager: { type: 'string', multiple: true }, faults: { type: 'boolean', default: true }, output: { type: 'string' }, keep: { type: 'boolean' } },
});
const cases = (values.case ?? Object.keys(CASES)) as CaseId[];
assert.ok(cases.every((id) => id in CASES), `--case takes ${Object.keys(CASES).join(', ')}`);
const managers = (values.manager ?? [...MANAGERS]) as (typeof MANAGERS)[number][];
assert.ok(managers.every((manager) => MANAGERS.includes(manager)), `--manager takes ${MANAGERS.join(' or ')}`);
const output = resolve(values.output ?? join(repository, '.scratch/consumer-proof', `init-${new Date().toISOString().replace(/[:.]/g, '-')}`));
await mkdir(output, { recursive: true });
const source = hashSource(repository);
if (!source.ok) throw new Error(source.reason);
const work = await mkdtemp(join(tmpdir(), 'ultima-init-'));
assert.ok(relative(repository, work).startsWith('..'), 'the consumer must sit outside the workspace');
type Row = {
  case: CaseId;
  manager: string;
  plan: number;
  apply: number;
  result: unknown;
  reapply: number;
  rebuild: number;
  cases: { id: string; checks: Check[] }[];
  faults: Awaited<ReturnType<typeof seeded>>[];
};
const report = {
  schemaVersion: 2,
  status: 'incomplete' as 'passed' | 'failed' | 'incomplete',
  source: { head: source.head, manifest: source.manifest.digest, registryManifestHash: '', cliTarballDigest: '' },
  work,
  versions: { node: process.version, chromium: '' },
  runs: [] as Row[],
  error: undefined as string | undefined,
};
const servers: { close(): Promise<void> }[] = [];
let browser: Browser | undefined;
try {
  await run(repository, 'pnpm', ['registry:build']);
  await cp(join(repository, 'apps/docs/public/r'), join(work, 'registry/r'), { recursive: true });
  report.source.registryManifestHash = digest(await readFile(join(work, 'registry/r/registry.json')));
  await run(repository, 'pnpm', ['--filter', 'ultima-design', 'build']);
  const tarball = await packCli(work);
  report.source.cliTarballDigest = digest(await readFile(tarball));
  await mkdir(join(work, 'cli'));
  await writeFile(join(work, 'cli/package.json'), '{ "private": true }\n');
  await run(join(work, 'cli'), 'npm', ['install', tarball]);
  const registry = await serveRegistry(join(work, 'registry'));
  servers.push(registry);
  browser = await chromium.launch({ headless: true });
  report.versions.chromium = browser.version();
  for (const id of cases) {
    for (const manager of managers) {
      const name = `${id}-${manager}`;
      const app = join(work, name);
      const plan = await cli(work, ['init', name, ...CASES[id].args, '--package-manager', manager, '--registry', `${registry.url}/r/{name}.json`, '--cli-tarball', tarball, '--plan', '--json']);
      await mkdir(join(output, name), { recursive: true });
      await writeFile(join(output, `${name}-plan.json`), plan.stdout);
      const apply = await cli(work, ['init', '--apply', join(output, `${name}-plan.json`), '--json']);
      await writeFile(join(output, `${name}-result.json`), apply.stdout);
      const reapply = await cli(work, ['init', '--apply', join(output, `${name}-plan.json`)]);
      const row: Row = { case: id, manager, plan: plan.code, apply: apply.code, result: apply.code === 0 ? JSON.parse(apply.stdout) : apply.stdout, reapply: reapply.code, rebuild: 1, cases: [], faults: [] };
      report.runs.push(row);
      if (apply.code !== 0) continue;
      // init publishes no build output that records its staging path, so the app must build where it now lives.
      try {
        await run(app, manager, ['run', 'build']);
        row.rebuild = 0;
      } catch {
        continue;
      }
      // The lockfile and the production build, without Next's compiler cache, stay with the report.
      const lockfile = manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml';
      const build = CASES[id].next ? '.next' : 'dist';
      await cp(join(app, lockfile), join(output, name, lockfile));
      await cp(join(app, build), join(output, name, build), { recursive: true, filter: (path) => !path.startsWith(join(app, '.next/cache')) });
      const server = await serve(app, CASES[id].next, join(output, `${name}-server.log`));
      try {
        for (const { id: mode, scheme, mode: expected } of MODES) row.cases.push({ id: `${name}/${mode}`, checks: await preview(browser, server.url, scheme, expected) });
      } finally {
        await server.close();
      }
      if (values.faults && manager === managers[0]) for (const fault of faults(id)) row.faults.push(await seeded(browser, app, manager, id, fault, output));
    }
  }
  const passed = report.runs.length === cases.length * managers.length && report.runs.every((row) =>
    row.plan === 0 && row.apply === 0 && row.reapply === 1 && row.rebuild === 0 &&
    row.cases.length === MODES.length && row.cases.every(({ checks }) => checks.every(({ passed }) => passed)) &&
    row.faults.every(({ failed }) => failed) && (!values.faults || row.manager !== managers[0] || row.faults.length === faults(row.case).length));
  report.status = passed ? 'passed' : 'failed';
} catch (error) {
  report.error = String(error);
} finally {
  await browser?.close();
  for (const server of servers) await server.close();
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!values.keep) await rm(work, { recursive: true, force: true });
}
for (const row of report.runs) {
  console.log(`${row.case} ${row.manager}: plan ${row.plan}, apply ${row.apply}, re-apply refused ${row.reapply}, rebuild in place ${row.rebuild}`);
  for (const { id, checks } of row.cases) console.log(`  ${id}: ${checks.map(({ name, passed }) => `${name} ${passed ? 'ok' : 'FAILED'}`).join(', ')}`);
  for (const fault of row.faults) console.log(`  fault ${fault.id}: ${fault.failed ? 'failed as seeded' : 'NOT DETECTED'} (${fault.observed})`);
}
if (report.error) console.log(report.error);
console.log(`init consumer case ${report.status}; report ${join(output, 'report.json')}`);
process.exitCode = report.status === 'passed' ? 0 : 1;
