// The installed-consumer case for `ultima-design init`: docs/spec/consumer-setup.md, Implementation acceptance scenarios.
// The packed CLI runs outside the workspace against the candidate registry, plans and applies a new Vite app with each
// package manager, and Chromium checks the production preview's paint and interaction in both color modes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Browser } from 'playwright';
import { resolveDraft, stockDraft } from '../packages/tokens/src/theme/draft.ts';
import { packCli, repository, run, serveRegistry } from './consumer-helpers.ts';
import { hashSource } from './verification/source.ts';

const MANAGERS = ['npm', 'pnpm'] as const;
// Chromium reports a light preference when the system states none, so the dark fallback has no case of its own here.
const MODES = [
  { id: 'system-dark', scheme: 'dark', mode: 'dark' },
  { id: 'system-light', scheme: 'light', mode: 'light' },
] as const;
type Check = { name: string; passed: boolean; detail?: unknown };

const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

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

async function preview(browser: Browser, url: string, scheme: 'dark' | 'light', mode: 'dark' | 'light'): Promise<Check[]> {
  const table = resolveDraft(stockDraft())[mode];
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 375, height: 800 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const checks: Check[] = [];
  const record = (name: string, passed: boolean, detail?: unknown) => checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
  const heading = page.getByRole('heading', { name: 'Ultima is ready', level: 1 });
  await heading.waitFor();
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
    return { expected, actual: { backgroundColor: css.backgroundColor, color: css.color }, colorScheme: css.colorScheme };
  }, { selector, table: table as Record<string, string> });
  for (const part of ['root', 'control'] as const) {
    const value = await paint(part);
    record(`${part}-paint`, 'expected' in value && JSON.stringify(value.expected) === JSON.stringify(value.actual) && value.colorScheme === mode, value);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record('narrow-fit', overflow <= 0, { overflow, width: 375 });
  const button = page.getByRole('button', { name: 'Confirm setup' });
  await button.click();
  record('button-updates', (await page.getByText('Setup confirmed.').count()) === 1 && (await page.getByRole('button', { name: 'Undo' }).count()) === 1);
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Next steps' });
  await dialog.waitFor();
  record('dialog-keyboard-open', await dialog.isVisible());
  const popup = await paint('popup');
  record('dialog-paint', 'expected' in popup && JSON.stringify(popup.expected) === JSON.stringify(popup.actual) && popup.colorScheme === mode, popup);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  record('dialog-escape-focus-return', await trigger.evaluate((element) => element === document.activeElement));
  record('no-console-errors', errors.length === 0, errors);
  await context.close();
  return checks;
}

const { values } = parseArgs({ options: { manager: { type: 'string', multiple: true }, output: { type: 'string' }, keep: { type: 'boolean' } } });
const managers = (values.manager ?? [...MANAGERS]) as (typeof MANAGERS)[number][];
assert.ok(managers.every((manager) => MANAGERS.includes(manager)), `--manager takes ${MANAGERS.join(' or ')}`);
const output = resolve(values.output ?? join(repository, '.scratch/consumer-proof', `init-${new Date().toISOString().replace(/[:.]/g, '-')}`));
await mkdir(output, { recursive: true });
const source = hashSource(repository);
if (!source.ok) throw new Error(source.reason);
const work = await mkdtemp(join(tmpdir(), 'ultima-init-'));
assert.ok(relative(repository, work).startsWith('..'), 'the consumer must sit outside the workspace');
const report = {
  schemaVersion: 1,
  status: 'incomplete' as 'passed' | 'failed' | 'incomplete',
  source: { head: source.head, manifest: source.manifest.digest, registryManifestHash: '', cliTarballDigest: '' },
  work,
  versions: { node: process.version, chromium: '' },
  runs: [] as { manager: string; plan: number; apply: number; result: unknown; reapply: number; cases: { id: string; checks: Check[] }[] }[],
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
  for (const manager of managers) {
    const app = `${manager}-app`;
    const plan = await cli(work, ['init', app, '--framework', 'vite', '--package-manager', manager, '--registry', `${registry.url}/r/{name}.json`, '--cli-tarball', tarball, '--plan', '--json']);
    await writeFile(join(output, `${manager}-plan.json`), plan.stdout);
    const apply = await cli(work, ['init', '--apply', join(output, `${manager}-plan.json`), '--json']);
    await writeFile(join(output, `${manager}-result.json`), apply.stdout);
    const reapply = await cli(work, ['init', '--apply', join(output, `${manager}-plan.json`)]);
    const row = { manager, plan: plan.code, apply: apply.code, result: apply.code === 0 ? JSON.parse(apply.stdout) : apply.stdout, reapply: reapply.code, cases: [] as { id: string; checks: Check[] }[] };
    report.runs.push(row);
    if (apply.code !== 0) continue;
    const dist = await serveRegistry(join(work, app, 'dist'), true);
    servers.push(dist);
    for (const { id, scheme, mode } of MODES) row.cases.push({ id: `${manager}/${id}`, checks: await preview(browser, dist.url, scheme, mode) });
  }
  const passed = report.runs.length === managers.length && report.runs.every((row) => row.plan === 0 && row.apply === 0 && row.reapply === 1 && row.cases.length === MODES.length && row.cases.every(({ checks }) => checks.every(({ passed }) => passed)));
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
  console.log(`${row.manager}: plan ${row.plan}, apply ${row.apply}, re-apply refused ${row.reapply}`);
  for (const { id, checks } of row.cases) console.log(`  ${id}: ${checks.map(({ name, passed }) => `${name} ${passed ? 'ok' : 'FAILED'}`).join(', ')}`);
}
console.log(`init consumer case ${report.status}; report ${join(output, 'report.json')}`);
process.exitCode = report.status === 'passed' ? 0 : 1;
