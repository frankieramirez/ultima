// The installed-consumer case for `ultima-design init` on existing applications: docs/spec/consumer-setup.md,
// Implementation acceptance scenarios. Each layout is scaffolded outside the workspace with its framework's own
// generator, given consumer content init must keep (a foreign Vite plugin, a Next provider, root documents), then
// planned and applied by the packed CLI against the candidate registry. A rerun must write nothing, and Chromium
// checks the production preview and the consumer's own page.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Browser } from 'playwright';
import { resolveDraft, stockDraft } from '../packages/tokens/src/theme/draft.ts';
import { packCli, repository, run, scaffold, serveRegistry } from './consumer-helpers.ts';
import { serveNext } from './consumer-next.ts';
import { hashSource } from './verification/source.ts';

const LAYOUTS = ['vite', 'next-root', 'next-src'] as const;
type Layout = (typeof LAYOUTS)[number];
type Check = { name: string; passed: boolean; detail?: unknown };
const MODES = [
  { id: 'system-dark', scheme: 'dark', mode: 'dark' },
  { id: 'system-light', scheme: 'light', mode: 'light' },
] as const;
// Files the framework or the package manager rewrites on its own: install, and next build's tsconfig and next-env.d.ts.
const OWNED_ELSEWHERE = new Set(['package-lock.json', 'next-env.d.ts', 'tsconfig.json']);
const SKIP = new Set(['node_modules', '.next', 'dist', '.git']);

const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

async function hashes(root: string, prefix = ''): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, await hashes(root, path));
    else if (entry.isFile()) result[path] = digest(await readFile(join(root, path)));
  }
  return result;
}

async function cli(work: string, cwd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const { spawn } = await import('node:child_process');
  return new Promise((done) => {
    const child = spawn(join(work, 'cli/node_modules/.bin/ultima'), args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); process.stderr.write(data); });
    child.on('close', (code) => done({ code: code ?? 1, stdout, stderr }));
  });
}

/** Consumer content init must keep: a foreign Vite plugin, or a Next provider; and root documents in both. */
async function seed(layout: Layout, app: string): Promise<void> {
  await writeFile(join(app, 'AGENTS.md'), '# Agents\n\nKeep this file.\n');
  await writeFile(join(app, 'DESIGN.md'), '# Design\n\nThe consumer owns this.\n');
  if (layout === 'vite') {
    await writeFile(join(app, 'foreign-plugin.ts'), "export default function foreign() {\n  return { name: 'foreign', transformIndexHtml: (html: string) => html.replace('</head>', '<meta name=\"foreign-plugin\" content=\"kept\" /></head>') }\n}\n");
    const config = await readFile(join(app, 'vite.config.ts'), 'utf8');
    const seeded = config.replace("import { defineConfig } from 'vite'\n", "import { defineConfig } from 'vite'\nimport foreign from './foreign-plugin.ts'\n").replace('plugins: [react()]', 'plugins: [react(), foreign()]');
    assert.notEqual(seeded, config, 'the scaffold vite.config.ts no longer has the expected plugins line');
    await writeFile(join(app, 'vite.config.ts'), seeded);
    return;
  }
  const folder = join(app, layout === 'next-src' ? 'src/app' : 'app');
  await writeFile(join(folder, 'providers.tsx'), "'use client';\n\nexport function Providers({ children }: { children: React.ReactNode }) {\n  return <div data-provider=\"kept\">{children}</div>;\n}\n");
  const layoutFile = await readFile(join(folder, 'layout.tsx'), 'utf8');
  const seeded = layoutFile.replace('import "./globals.css";\n', 'import "./globals.css";\nimport { Providers } from "./providers";\n').replace(/\{children\}/, '<Providers>{children}</Providers>');
  assert.notEqual(seeded, layoutFile, 'the scaffold layout.tsx no longer has the expected shape');
  await writeFile(join(folder, 'layout.tsx'), seeded);
}

/** The Vite preview is the consumer's to mount: this is the printed step, done the way a consumer would. */
async function mount(app: string): Promise<void> {
  const main = await readFile(join(app, 'src/main.tsx'), 'utf8');
  const mounted = main.replace("import App from './App.tsx'\n", "import App from './App.tsx'\nimport UltimaPreview from './ultima-preview'\n").replace('<App />', '<App />\n    <UltimaPreview />');
  assert.notEqual(mounted, main, 'the scaffold main.tsx no longer has the expected shape');
  await writeFile(join(app, 'src/main.tsx'), mounted);
}

async function preview(browser: Browser, url: string, layout: Layout, scheme: 'dark' | 'light', mode: 'dark' | 'light'): Promise<Check[]> {
  const table = resolveDraft(stockDraft())[mode] as Record<string, string>;
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 375, height: 800 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error' || /hydrat/i.test(message.text())) errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  const checks: Check[] = [];
  const record = (name: string, passed: boolean, detail?: unknown) => checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
  if (layout !== 'vite') {
    await page.goto(url);
    record('consumer-page-kept', (await page.title()) === 'Create Next App' && (await page.locator('[data-provider="kept"]').count()) === 1, await page.title());
  }
  await page.goto(layout === 'vite' ? url : `${url}/ultima-preview`);
  await page.getByRole('heading', { name: 'Ultima is ready', level: 1 }).waitFor();
  if (layout === 'vite') {
    record('foreign-plugin-kept', (await page.locator('meta[name="foreign-plugin"]').count()) === 1);
    record('consumer-app-kept', (await page.locator('#root > *').count()) > 1);
  } else {
    record('provider-wraps-preview', (await page.locator('[data-provider="kept"] main').count()) === 1);
    record('font-loading-kept', await page.evaluate(() => [document.documentElement, document.body].some((element) => getComputedStyle(element).getPropertyValue('--font-geist-sans').trim() !== '')));
  }
  const paint = (selector: 'control' | 'popup') => page.evaluate(({ selector, table }) => {
    const element = selector === 'control' ? [...document.querySelectorAll('button')].find((button) => /Confirm setup|Undo/.test(button.textContent ?? '')) : document.querySelector('[role="dialog"]');
    if (!element) return { missing: selector };
    const probe = document.createElement('div');
    document.body.append(probe);
    const normalize = (value: string) => { probe.style.color = value; return getComputedStyle(probe).color; };
    const css = getComputedStyle(element);
    const expected = selector === 'control'
      ? { backgroundColor: normalize(table['--ult-color-accent']!), color: normalize(table['--ult-color-accent-contrast']!) }
      : { backgroundColor: normalize(table['--ult-color-surface-raised']!), color: normalize(table['--ult-color-text']!) };
    probe.remove();
    return { expected, actual: { backgroundColor: css.backgroundColor, color: css.color } };
  }, { selector, table });
  const control = await paint('control');
  record('control-paint', 'expected' in control && JSON.stringify(control.expected) === JSON.stringify(control.actual), control);
  await page.getByRole('button', { name: 'Confirm setup' }).click();
  record('button-updates', (await page.getByText('Setup confirmed.').count()) === 1);
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Next steps' });
  await dialog.waitFor();
  const popup = await paint('popup');
  record('dialog-paint', 'expected' in popup && JSON.stringify(popup.expected) === JSON.stringify(popup.actual), popup);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  record('dialog-escape-focus-return', await trigger.evaluate((element) => element === document.activeElement));
  record('no-console-errors', errors.length === 0, errors);
  await context.close();
  return checks;
}

const { values } = parseArgs({ options: { layout: { type: 'string', multiple: true }, output: { type: 'string' }, keep: { type: 'boolean' } } });
const layouts = (values.layout ?? [...LAYOUTS]) as Layout[];
assert.ok(layouts.every((layout) => LAYOUTS.includes(layout)), `--layout takes ${LAYOUTS.join(', ')}`);
const output = resolve(values.output ?? join(repository, '.scratch/consumer-proof', `init-existing-${new Date().toISOString().replace(/[:.]/g, '-')}`));
await mkdir(output, { recursive: true });
const source = hashSource(repository);
if (!source.ok) throw new Error(source.reason);
const work = await mkdtemp(join(tmpdir(), 'ultima-init-existing-'));
assert.ok(relative(repository, work).startsWith('..'), 'the consumer must sit outside the workspace');
type Row = { layout: Layout; plan: number; apply: number; status?: string; mounted?: { plan: number; apply: number }; rerun: { plan: number; writes: string[]; apply: number; changed: string[] }; untouched: string[]; changedOutsidePlan: string[]; cases: { id: string; checks: Check[] }[] };
const report = {
  schemaVersion: 1,
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
  const flags = ['--registry', `${registry.url}/r/{name}.json`, '--cli-tarball', tarball];
  for (const layout of layouts) {
    const app = join(work, `${layout}-app`);
    await scaffold(layout, app);
    if (layout !== 'vite') await run(app, 'npm', ['install']);
    await seed(layout, app);
    const before = await hashes(app);

    const planned = await cli(work, app, ['init', '.', ...flags, '--plan', '--json']);
    await writeFile(join(output, `${layout}-plan.json`), planned.stdout);
    const applied = await cli(work, app, ['init', '--apply', join(output, `${layout}-plan.json`), '--json']);
    await writeFile(join(output, `${layout}-result.json`), applied.stdout);
    const row: Row = { layout, plan: planned.code, apply: applied.code, rerun: { plan: -1, writes: [], apply: -1, changed: [] }, untouched: [], changedOutsidePlan: [], cases: [] };
    report.runs.push(row);
    if (planned.code !== 0 || applied.code > 3) continue;
    const plan = JSON.parse(planned.stdout) as { operations: { kind: string; path?: string }[]; items: { creates: string[] } };
    row.status = (JSON.parse(applied.stdout) as { status: string }).status;
    const inventory = new Set([...plan.operations.flatMap(({ kind, path }) => (kind === 'write' && path ? [path] : [])), ...plan.items.creates]);
    const after = await hashes(app);
    row.untouched = Object.keys(before).filter((path) => !inventory.has(path) && before[path] === after[path]);
    row.changedOutsidePlan = Object.keys(before).filter((path) => !inventory.has(path) && !OWNED_ELSEWHERE.has(path) && before[path] !== after[path]);

    if (layout === 'vite') {
      await mount(app);
      const mountedPlan = await cli(work, app, ['init', '.', ...flags, '--plan', '--json']);
      await writeFile(join(output, `${layout}-mounted-plan.json`), mountedPlan.stdout);
      const mountedApply = await cli(work, app, ['init', '--apply', join(output, `${layout}-mounted-plan.json`)]);
      row.mounted = { plan: mountedPlan.code, apply: mountedApply.code };
    }
    const settled = await hashes(app);
    const rerunPlan = await cli(work, app, ['init', '.', ...flags, '--plan', '--json']);
    await writeFile(join(output, `${layout}-rerun-plan.json`), rerunPlan.stdout);
    const rerunApply = await cli(work, app, ['init', '--apply', join(output, `${layout}-rerun-plan.json`)]);
    const rerun = await hashes(app);
    row.rerun = {
      plan: rerunPlan.code,
      writes: rerunPlan.code === 0 ? (JSON.parse(rerunPlan.stdout) as { operations: { kind: string; id: string }[] }).operations.filter(({ kind }) => kind !== 'check').map(({ id }) => id) : ['(plan failed)'],
      apply: rerunApply.code,
      changed: [...new Set([...Object.keys(settled), ...Object.keys(rerun)])].filter((path) => !OWNED_ELSEWHERE.has(path) && settled[path] !== rerun[path]),
    };
    if (rerunApply.code !== 0) continue;
    const server = layout === 'vite' ? await serveRegistry(join(app, 'dist'), true) : await serveNext(app, join(output, `${layout}-server.log`));
    servers.push(server);
    for (const { id, scheme, mode } of MODES) row.cases.push({ id: `${layout}/${id}`, checks: await preview(browser, server.url, layout, scheme, mode) });
  }
  const passed = report.runs.length === layouts.length && report.runs.every((row) =>
    row.plan === 0 &&
    row.apply === (row.layout === 'vite' ? 3 : 0) &&
    (row.layout !== 'vite' || (row.mounted?.plan === 0 && row.mounted.apply === 0)) &&
    row.changedOutsidePlan.length === 0 &&
    row.rerun.plan === 0 && row.rerun.writes.length === 0 && row.rerun.apply === 0 && row.rerun.changed.length === 0 &&
    row.cases.length === MODES.length && row.cases.every(({ checks }) => checks.every(({ passed }) => passed)));
  report.status = passed ? 'passed' : 'failed';
} catch (error) {
  report.error = String(error);
} finally {
  await browser?.close();
  for (const server of servers) await server.close().catch(() => {});
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!values.keep) await rm(work, { recursive: true, force: true });
}
for (const row of report.runs) {
  console.log(`${row.layout}: plan ${row.plan}, apply ${row.apply} (${row.status ?? 'no result'})${row.mounted ? `, after mounting plan ${row.mounted.plan} apply ${row.mounted.apply}` : ''}; rerun plan ${row.rerun.plan} with ${row.rerun.writes.length} non-check steps, apply ${row.rerun.apply}, ${row.rerun.changed.length} files changed; ${row.changedOutsidePlan.length} files changed outside the plan`);
  for (const { id, checks } of row.cases) console.log(`  ${id}: ${checks.map(({ name, passed }) => `${name} ${passed ? 'ok' : 'FAILED'}`).join(', ')}`);
}
if (report.error) console.log(report.error);
console.log(`init existing-project consumer case ${report.status}; report ${join(output, 'report.json')}`);
process.exitCode = report.status === 'passed' ? 0 : 1;
