import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, type Locator, type Page } from 'playwright';
import { draftFingerprint, parseDraft } from '../packages/tokens/src/theme/codec.ts';
import { resolveDraft, type ResolvedDraft, type TokenTable } from '../packages/tokens/src/theme/draft.ts';
import { axePath } from './consumer-browser.ts';
import { repository, run, serveRegistry } from './consumer-helpers.ts';
import { browserErrors, serveNext, type BrowserLog } from './consumer-next.ts';
import { hashSource } from './verification/source.ts';

export const EXTERNAL_CASES = ['system-dark', 'system-light', 'explicit-dark', 'explicit-light'] as const;
export const EXTERNAL_ASSERTIONS = [
  'root-values', 'overflow', 'required-error-name', 'axe-closed', 'overlay-keyboard-open', 'overlay-portalled',
  'overlay-focus-in', 'portal-values', 'axe-open', 'overlay-escape', 'overlay-focus-return', 'browser-errors',
] as const;
type Assertion = { name: typeof EXTERNAL_ASSERTIONS[number]; expected: unknown; actual: unknown; status: 'passed' | 'failed'; error?: string };
export type ExternalCase = { id: string; status: 'passed' | 'failed'; snapshot: string; failures: string[] };
export type ExternalReport = {
  schemaVersion: 1;
  status: 'passed' | 'failed' | 'incomplete';
  project: string;
  layout: 'vite' | 'next-app' | 'next-src' | null;
  command: string[];
  source: { head: string | null; manifest: string | null; draftDigest: string | null; draftFingerprint: string | null; recipeVersion: number | null };
  versions: Record<string, string>;
  expected: string[];
  executed: string[];
  cases: ExternalCase[];
  errors: string[];
};

/** The project's layout from its own manifest and folders, or null when it is neither Vite nor Next. */
export function externalLayout(manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }, srcApp: boolean): ExternalReport['layout'] {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  if (dependencies.next) return srcApp ? 'next-src' : 'next-app';
  return dependencies.vite ? 'vite' : null;
}

function tokenProblems(element: Locator, table: TokenTable, mode: 'dark' | 'light'): Promise<string[]> {
  return element.evaluate((target, { table, mode }) => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const canonical = (value: string) => value.replace(/-?\d*\.?\d+/g, (number) => String(Math.round(Number(number) * 1000) / 1000));
    const computed = (property: string, value: string) => {
      probe.style.cssText = 'font-size:16px';
      probe.style.setProperty(property, value);
      return canonical(getComputedStyle(probe).getPropertyValue(property));
    };
    const failures: string[] = [];
    for (const [token, value] of Object.entries(table)) {
      const property = token.startsWith('--ult-color-') ? 'color' : token.startsWith('--ult-space-') ? 'margin-left' : token.startsWith('--ult-text-') ? 'font-size' : token.startsWith('--ult-radius-') ? 'border-radius' : token.startsWith('--ult-shadow-') ? 'box-shadow' : token.startsWith('--ult-filter-') ? 'filter' : token.startsWith('--ult-motion-') ? 'transition-duration' : token.includes('tracking') ? 'letter-spacing' : token.includes('leading') ? 'line-height' : token.includes('weight') ? 'font-weight' : 'font-family';
      const raw = getComputedStyle(target).getPropertyValue(token).trim();
      const expected = computed(property, value);
      const actual = raw ? computed(property, raw) : 'missing';
      if (actual !== expected) failures.push(`${token}: expected ${expected}, got ${actual}`);
    }
    if (getComputedStyle(target).colorScheme !== mode) failures.push(`color-scheme: expected ${mode}, got ${getComputedStyle(target).colorScheme}`);
    probe.remove();
    return failures;
  }, { table, mode });
}

async function externalCase(page: Page, tables: ResolvedDraft, id: typeof EXTERNAL_CASES[number], errors: string[]) {
  const mode = id.endsWith('dark') ? 'dark' : 'light';
  const assertions: Assertion[] = [];
  const axe: Record<string, unknown> = {};
  const check = async (name: Assertion['name'], expected: unknown, action: () => Promise<unknown>) => {
    let actual: unknown = null;
    let error: string | undefined;
    try { actual = await action(); } catch (caught) { error = String(caught); }
    assertions.push({ name, expected, actual, status: !error && JSON.stringify(actual) === JSON.stringify(expected) ? 'passed' : 'failed', ...(error ? { error } : {}) });
  };
  const settle = () => page.evaluate(async () => {
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
  });
  const violations = async (state: string) => {
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(() => (window as unknown as { axe: { run: () => Promise<{ violations: { id: string }[] }> } }).axe.run());
    axe[state] = result;
    return result.violations.map((violation) => violation.id);
  };
  const root = page.locator('html');
  const field = page.locator(':is(input, textarea, select):required, [aria-required="true"]').filter({ visible: true }).first();
  const trigger = page.locator('[aria-haspopup]:not([aria-haspopup="false"]), [role="combobox"]').filter({ visible: true }).first();
  const popup = page.locator('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]').filter({ visible: true }).first();
  const focused = (locator: Locator) => locator.evaluate((element) => element === document.activeElement);

  await settle();
  await check('root-values', [], () => tokenProblems(root, tables[mode], mode));
  await check('overflow', [], async () => {
    const wide: number[] = [];
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await settle();
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) wide.push(width);
    }
    return wide;
  });
  await check('required-error-name', { invalid: true, named: true }, async () => {
    const description = () => field.evaluate((element) => [...(element.getAttribute('aria-describedby') ?? '').split(/\s+/), element.getAttribute('aria-errormessage') ?? '']
      .filter(Boolean).map((name) => document.getElementById(name)?.textContent?.trim() ?? '').filter(Boolean).join(' '));
    if (await field.evaluate((element) => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) await field.fill('');
    const before = await description();
    await field.evaluate((element) => (element as HTMLInputElement).form!.requestSubmit());
    const invalid = await page.waitForFunction((element) => element?.getAttribute('aria-invalid') === 'true', await field.elementHandle(), { timeout: 3000 }).then(() => true, () => false);
    await settle();
    const after = await description();
    return { invalid, named: after !== '' && after !== before };
  });
  await check('axe-closed', [], () => violations('closed'));
  await check('overlay-keyboard-open', true, async () => { await trigger.focus(); await page.keyboard.press('Enter'); await popup.waitFor({ timeout: 3000 }); await settle(); return popup.isVisible(); });
  await check('overlay-portalled', true, async () => popup.evaluate((element, control) => {
    let top: Element = element;
    while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
    return top.parentElement === document.body && !top.contains(control);
  }, await trigger.elementHandle()));
  await check('overlay-focus-in', true, () => popup.evaluate((element) => element.contains(document.activeElement)));
  await check('portal-values', [], () => tokenProblems(popup, tables[mode], mode));
  await check('axe-open', [], () => violations('open'));
  await check('overlay-escape', true, async () => { await page.keyboard.press('Escape'); await popup.waitFor({ state: 'hidden', timeout: 3000 }); return true; });
  await check('overlay-focus-return', true, () => focused(trigger));
  await check('browser-errors', [], async () => errors);
  return { assertions, axe, failures: assertions.filter((row) => row.status === 'failed').map((row) => `${row.name}: expected ${JSON.stringify(row.expected)}, got ${JSON.stringify(row.actual)}${row.error ? ` (${row.error})` : ''}`) };
}

/**
 * The first-screen production assertions against a project this runner did not scaffold: it builds the
 * project, serves the production output and checks the installed draft in both modes through roles,
 * ARIA state and semantic tokens only (docs/spec/adoption-delivery.md, First-screen exercise).
 */
export async function externalProof(project: string, outputPath?: string): Promise<ExternalReport> {
  project = resolve(project);
  const base = join(repository, '.scratch/consumer-proof');
  await mkdir(base, { recursive: true });
  const output = outputPath ? resolve(outputPath) : await mkdtemp(join(base, 'external-'));
  await mkdir(output, { recursive: true });
  const report: ExternalReport = {
    schemaVersion: 1, status: 'incomplete', project, layout: null, command: process.argv.slice(1),
    source: { head: null, manifest: null, draftDigest: null, draftFingerprint: null, recipeVersion: null },
    versions: { node: process.version }, expected: [...EXTERNAL_CASES], executed: [], cases: [], errors: [],
  };
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let production: { url: string; close: () => Promise<void> } | undefined;
  try {
    const source = hashSource(repository);
    if (source.ok) Object.assign(report.source, { head: source.head, manifest: source.manifest.digest });
    const manifest = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    report.layout = externalLayout(manifest, existsSync(join(project, 'src/app')));
    if (!report.layout) throw new Error('the project depends on neither next nor vite');
    const installed = await readFile(join(project, 'ultima-theme.json'), 'utf8').catch(() => { throw new Error('no installed theme draft at ultima-theme.json'); });
    const parsed = parseDraft(installed);
    if (!parsed.ok) throw new Error(`ultima-theme.json: ${parsed.message}`);
    Object.assign(report.source, { draftDigest: createHash('sha256').update(installed).digest('hex'), draftFingerprint: draftFingerprint(parsed.draft), recipeVersion: parsed.draft.recipeVersion });
    const tables = resolveDraft(parsed.draft);
    const isNext = report.layout !== 'vite';
    for (const name of ['react', 'react-dom', '@stylexjs/stylex', 'ultima-design', isNext ? 'next' : 'vite']) {
      const path = join(project, 'node_modules', name, 'package.json');
      if (existsSync(path)) report.versions[name] = JSON.parse(await readFile(path, 'utf8')).version;
    }
    try { await writeFile(join(output, 'build.log'), await run(project, 'npm', ['run', 'build'])); }
    catch (error) { await writeFile(join(output, 'build.log'), String(error)); throw error; }
    production = isNext ? await serveNext(project, join(output, 'server.log')) : await serveRegistry(join(project, 'dist'), true, join(output, 'server.log'));
    browser = await chromium.launch({ headless: true });
    report.versions.chromium = browser.version();
    for (const id of EXTERNAL_CASES) {
      const mode = id.endsWith('dark') ? 'dark' : 'light';
      const explicit = id.startsWith('explicit-');
      const context = await browser.newContext({ colorScheme: explicit ? (mode === 'dark' ? 'light' : 'dark') : mode, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const log: BrowserLog = { console: [], pageErrors: [], failedRequests: [] };
      const errors = browserErrors(page, log);
      let result: Awaited<ReturnType<typeof externalCase>>;
      try {
        await page.goto(production.url, { waitUntil: 'networkidle' });
        if (explicit) await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, mode);
        result = await externalCase(page, tables, id, errors);
      } catch (error) { result = { assertions: [], axe: {}, failures: [String(error)] }; }
      await page.screenshot({ path: join(output, `${id}.png`), fullPage: true }).catch((error) => result.failures.push(`screenshot unavailable: ${error}`));
      await writeFile(join(output, `${id}.browser.json`), `${JSON.stringify(log, null, 2)}\n`);
      await writeFile(join(output, `${id}.axe.json`), `${JSON.stringify(result.axe, null, 2)}\n`);
      await writeFile(join(output, `${id}.values.json`), `${JSON.stringify({ id, mode, explicit, layout: report.layout, expected: tables[mode], assertions: result.assertions, failures: result.failures }, null, 2)}\n`);
      if (result.assertions.length !== EXTERNAL_ASSERTIONS.length) result.failures.push('incomplete assertion inventory');
      report.executed.push(id);
      report.cases.push({ id, status: result.failures.length ? 'failed' : 'passed', snapshot: `${id}.values.json`, failures: result.failures });
      await context.close();
    }
    report.status = report.cases.some((row) => row.status === 'failed') ? 'failed' : 'passed';
  } catch (error) { report.errors.push(String(error)); report.status = 'incomplete'; }
  finally {
    await browser?.close();
    await production?.close();
    await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`consumer-proof external: ${report.status}; report ${join(output, 'report.json')}`);
  }
  return report;
}
