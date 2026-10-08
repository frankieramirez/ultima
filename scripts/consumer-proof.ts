import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';
import { draftFingerprint, parseDraft, serializeDraft } from '../packages/tokens/src/theme/codec.ts';
import { presetDraft, resolveDraft, stockDraft, type ThemeDraft } from '../packages/tokens/src/theme/draft.ts';
import { toCss, toRegistryItem } from '../packages/tokens/src/theme/export.ts';
import { gate } from '../packages/tokens/src/theme/gate.ts';
import { shuffleDraft } from '../packages/tokens/src/theme/shuffle.ts';
import { packCli, repository, run, scaffold, serveRegistry, type Run } from './consumer-helpers.ts';
import { CONSUMER_LAYOUTS, consumerCases, modeCases, type ConsumerLayout, type ConsumerReport } from './consumer-report.ts';
import { modeProof, modeScene } from './consumer-mode.ts';
import { browserErrors, hydrationProblems, hydrationState, nextFault, nextScene, serveNext, setupNext, type HydrationEvidence } from './consumer-next.ts';
import { hashSource } from './verification/source.ts';

export function proofDraft(): ThemeDraft {
  const shuffled = shuffleDraft(stockDraft(), 'global', 'broad', 20260920);
  assert.equal(shuffled.kind, 'applied', 'proof draft shuffle must pass');
  if (shuffled.kind !== 'applied') throw new Error('no proof draft');
  const draft = shuffled.draft;
  const tables = resolveDraft(draft);
  assert.ok(gate(tables).every((row) => row.dark.pass && row.light.pass), 'proof draft must pass the Studio pairing gate');
  for (const preset of ['neutral', 'ultima'] as const) for (const mode of ['dark', 'light'] as const) {
    const stock = resolveDraft(presetDraft(preset))[mode];
    for (const name of ['surface', 'accent', 'success']) assert.notEqual(tables[mode][`--ult-color-${name}`], stock[`--ult-color-${name}`], `${mode} ${name} must differ from ${preset}`);
  }
  return draft;
}

export type ProofOptions = { layout: ConsumerLayout; deliveryPath: 'css'; output?: string; exercise?: 'theme-mode'; fault?: 'theme-import' | 'stylex-extraction' | 'src-extraction' | 'hydration-mismatch' | 'mode-script' };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

export type BaseStyles = { height: string; display: string; radius: string; background: string; focusColor: string; focusStyle: string; focusVisible: boolean; danger: string };
export function baseStyleProblems(actual: BaseStyles, expected: BaseStyles): string[] {
  const failures: string[] = [];
  for (const key of Object.keys(expected) as (keyof BaseStyles)[]) if (actual[key] !== expected[key]) failures.push(`${key}: expected ${expected[key]}, got ${actual[key]}`);
  for (const key of ['background', 'focusColor'] as const) {
    const channels = actual[key].match(/\d+/g);
    if (!channels || channels[0] !== channels[1] || channels[1] !== channels[2]) failures.push(`${key} is not neutral`);
  }
  return failures;
}

export async function baseStyleProof(app: string, layout: ConsumerLayout): Promise<void> {
  const production = layout === 'vite' ? await serveRegistry(join(app, 'dist'), true) : await serveNext(app, join(app, 'production.log'));
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const tables = resolveDraft(stockDraft());
    for (const mode of ['dark', 'light'] as const) {
      const page: Page = await browser.newPage({ colorScheme: mode });
      const errors = browserErrors(page);
      await page.goto(production.url, { waitUntil: 'networkidle' });
      const button = page.getByRole('button', { name: 'StyleX smoke', exact: true });
      const danger = page.getByRole('button', { name: 'StyleX danger smoke', exact: true });
      await button.waitFor();
      const expected = await page.evaluate((table) => {
        const probe = document.createElement('span');
        document.body.append(probe);
        const color = (name: string) => { probe.style.color = table[name]!; return getComputedStyle(probe).color; };
        const expected = { height: `${Number.parseFloat(table['--ult-space-10']!) * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)}px`, display: 'inline-flex', radius: table['--ult-radius-md']!, background: color('--ult-color-accent'), focusColor: color('--ult-color-border-focus'), focusStyle: 'solid', focusVisible: true, danger: color('--ult-color-danger') };
        probe.remove();
        return expected;
      }, tables[mode]);
      const styles = await button.evaluate((element) => {
        const css = getComputedStyle(element);
        return { height: css.height, display: css.display, radius: css.borderRadius, background: css.backgroundColor };
      });
      await page.keyboard.press('Tab');
      const focus = await button.evaluate((element) => ({ focusColor: getComputedStyle(element).outlineColor, focusStyle: getComputedStyle(element).outlineStyle, focusVisible: element.matches(':focus-visible') }));
      const actual = { ...styles, ...focus, danger: await danger.evaluate((element) => getComputedStyle(element).backgroundColor) };
      const failures = [...baseStyleProblems(actual, expected), ...errors];
      await writeFile(join(app, `production-styles-${mode}.values.json`), `${JSON.stringify({ layout, mode, expected, actual, failures }, null, 2)}\n`);
      await page.screenshot({ path: join(app, `production-styles-${mode}.png`) });
      assert.deepEqual(failures, [], `Production ${layout} ${mode} base styles`);
      console.log(`Production ${layout} ${mode} Button styles: ${JSON.stringify(actual)}`);
      await page.close();
    }
  } finally { await browser?.close(); await production.close(); }
}

export async function consumerProof(options: ProofOptions): Promise<ConsumerReport> {
  if (!CONSUMER_LAYOUTS.includes(options.layout) || options.deliveryPath !== 'css') throw new Error('unsupported consumer proof parameters');
  if (options.fault === 'src-extraction' && options.layout !== 'next-src') throw new Error('src-extraction requires next-src');
  if (options.fault === 'hydration-mismatch' && options.layout === 'vite') throw new Error('hydration-mismatch requires Next');
  const isNext = options.layout !== 'vite';
  const src = options.layout === 'next-src';
  const setupItem = isNext ? 'setup-next' : 'setup-vite';
  const base = join(repository, '.scratch/consumer-proof');
  await mkdir(base, { recursive: true });
  const output = options.output ? resolve(options.output) : await mkdtemp(join(base, 'run-'));
  await mkdir(output, { recursive: true });
  const source = hashSource(repository);
  if (!source.ok) throw new Error(source.reason);
  const draft = proofDraft();
  const report: ConsumerReport = {
    schemaVersion: 1, status: 'incomplete', layout: options.layout, deliveryPath: options.deliveryPath,
    source: { head: source.head, manifest: source.manifest, registryManifestHash: null, cliTarballDigest: null, draftDigest: null, draftFingerprint: draftFingerprint(draft), recipeVersion: draft.recipeVersion },
    command: process.argv.slice(1), work: null, versions: { node: process.version }, installedItems: [setupItem, 'button', 'badge', 'tokens', 'lib', 'ultima-theme'],
    ...(options.exercise && { exercise: options.exercise }),
    expected: options.exercise === 'theme-mode' ? modeCases(options.layout) : consumerCases(options.layout), executed: [], cases: [], errors: [],
  };
  const execute: Run = async (cwd, command, args) => {
    await appendFile(join(output, 'commands.log'), `${JSON.stringify({ cwd, command, args })}\n`);
    try {
      const result = await run(cwd, command, args);
      await appendFile(join(output, 'commands.log'), result);
      return result;
    } catch (error) {
      await appendFile(join(output, 'commands.log'), `${String(error)}\n`);
      throw error;
    }
  };
  const servers: Awaited<ReturnType<typeof serveRegistry>>[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const work = await mkdtemp(join(tmpdir(), 'ultima-consumer-'));
    assert.ok(relative(repository, work).startsWith('..'), 'consumer must be outside the workspace');
    report.work = work;
    await execute(repository, 'pnpm', ['registry:build']);
    await cp(join(repository, 'apps/docs/public/r'), join(work, 'registry/r'), { recursive: true });
    report.source.registryManifestHash = digest(await readFile(join(work, 'registry/r/registry.json')));
    await cp(join(work, 'registry/r/registry.json'), join(output, 'registry.json'));
    await execute(repository, 'pnpm', ['--filter', 'ultima-design', 'build']);
    const tarball = await packCli(work, execute);
    report.source.cliTarballDigest = digest(await readFile(tarball));
    const registry = await serveRegistry(join(work, 'registry'));
    servers.push(registry);
    const app = join(work, options.layout);
    await scaffold(isNext ? (src ? 'next-src' : 'next-root') : 'vite', app, execute);
    const setup = await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', `${registry.url}/r/${setupItem}.json`, '--yes']);
    const configPath = join(app, isNext ? 'postcss.config.js' : 'vite.config.ts');
    if (isNext) await setupNext(app, src, setup);
    else {
      for (const step of ['"paths": { "@/*": ["./src/*"] }', "import { ultimaStylex } from './ultima.vite.ts'", 'before the React plugin', 'Wrap any global CSS reset in an @layer']) assert.ok(setup.includes(step), `setup no longer prints: ${step}`);
      for (const name of ['tsconfig.json', 'tsconfig.app.json']) {
        const path = join(app, name);
        const json = JSON.parse((await readFile(path, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));
        json.compilerOptions = { ...json.compilerOptions, paths: { '@/*': ['./src/*'] } };
        await writeFile(path, `${JSON.stringify(json, null, 2)}\n`);
      }
      const config = await readFile(configPath, 'utf8');
      assert.ok(config.includes('plugins: [') && config.includes("import { defineConfig } from 'vite'"));
      await writeFile(configPath, config.replace('plugins: [', 'plugins: [ultimaStylex(), ').replace("import { defineConfig } from 'vite'", "import { defineConfig } from 'vite'\nimport { ultimaStylex } from './ultima.vite.ts'"));
    }
    const componentsPath = join(app, 'components.json');
    const components = JSON.parse(await readFile(componentsPath, 'utf8'));
    components.registries['@ultima'] = `${registry.url}/r/{name}.json`;
    await writeFile(componentsPath, `${JSON.stringify(components, null, 2)}\n`);
    await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', '@ultima/button', '@ultima/badge', '--yes']);
    if (options.exercise === 'theme-mode') {
      await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', '@ultima/theme-mode', '@ultima/popover', '--yes']);
      report.installedItems.push('theme-mode', 'popover');
      const installedMode = join(app, src || !isNext ? 'src/components/ui/theme-mode.tsx' : 'components/ui/theme-mode.tsx');
      const registeredMode = JSON.parse(await readFile(join(work, 'registry/r/theme-mode.json'), 'utf8'));
      assert.equal(await readFile(installedMode, 'utf8'), registeredMode.files[0].content, 'installed theme-mode must be the exact registry payload, including its version marker');
    }
    const item = join(work, 'registry/r/proof-theme.json');
    await writeFile(item, toRegistryItem(draft));
    await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', `${registry.url}/r/proof-theme.json`, '--yes']);
    const installed = await readFile(join(app, 'ultima-theme.json'), 'utf8');
    const parsed = parseDraft(installed);
    assert.ok(parsed.ok, 'installed draft must decode');
    assert.equal(serializeDraft(parsed.draft), serializeDraft(draft));
    assert.equal(await readFile(join(app, 'ultima-theme.css'), 'utf8'), toCss(draft));
    report.source.draftDigest = digest(installed);
    await writeFile(join(output, 'ultima-theme.json'), installed);
    const mainPath = join(app, isNext ? (src ? 'src/app/layout.tsx' : 'app/layout.tsx') : 'src/main.tsx');
    if (isNext) await nextScene(app, src);
    else {
      await writeFile(join(app, 'src/App.tsx'), `import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export default function App() {
  return <main><h1>Installed consumer proof</h1><Button tone="accent">Theme control</Button><Badge tone="success" variant="solid" role="status">Ready</Badge></main>;
}
`);
      await writeFile(join(app, 'src/index.css'), '@layer reset { body { margin: 0; } }\n:root { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans); }\n');
      const main = await readFile(mainPath, 'utf8');
      assert.ok(main.includes("import './index.css'"));
      await writeFile(mainPath, main.replace("import './index.css'", "import './index.css'\nimport '../ultima-theme.css'"));
    }
    if (options.exercise === 'theme-mode') await modeScene(app, options.layout, execute, options.fault);
    await execute(app, 'npm', ['install', '-D', tarball]);
    for (const command of ['doctor', 'check']) await execute(app, 'npx', ['--no-install', 'ultima-design', command]);
    if (options.fault === 'theme-import') await writeFile(mainPath, (await readFile(mainPath, 'utf8')).replace(/import ['"]\.\.\/+(?:\.\.\/)?ultima-theme\.css['"];?/, ''));
    if (isNext) await nextFault(app, src, options.fault);
    else if (options.fault === 'stylex-extraction') await writeFile(configPath, (await readFile(configPath, 'utf8')).replace("import { ultimaStylex } from './ultima.vite.ts'", '').replace('ultimaStylex(), ', "{ name: 'consumer:alias', config: () => ({ resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } } }) }, "));
    for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'components.json', 'ultima-theme.css', ...(isNext ? ['babel.config.js', 'postcss.config.js'] : ['vite.config.ts', 'ultima.vite.ts'])]) await cp(join(app, name), join(output, name));
    for (const name of isNext && !src ? ['app', 'components', 'lib'] : ['src']) await cp(join(app, name), join(output, name), { recursive: true });
    for (const name of ['react', 'react-dom', '@stylexjs/stylex', 'ultima-design', ...(isNext ? ['next', '@stylexjs/babel-plugin', '@stylexjs/postcss-plugin'] : ['vite', '@stylexjs/unplugin'])]) report.versions[name] = JSON.parse(await readFile(join(app, 'node_modules', name, 'package.json'), 'utf8')).version;
    report.versions.npm = (await execute(app, 'npm', ['--version'])).trim();
    await execute(app, 'npm', ['run', 'build']);
    const production = isNext ? await serveNext(app, join(output, 'production.log')) : await serveRegistry(join(app, 'dist'), true);
    servers.push(production);
    browser = await chromium.launch({ headless: true });
    report.versions.chromium = browser.version();
    const tables = resolveDraft(draft);
    if (options.exercise === 'theme-mode') await modeProof(browser, production.url, report, output, tables);
    for (const id of options.exercise === 'theme-mode' ? [] : report.expected) {
      const mode = id.endsWith('-dark') ? 'dark' : 'light';
      const explicit = id.includes('/explicit-');
      const contextOptions = { reducedMotion: 'no-preference' as const, colorScheme: explicit ? (mode === 'dark' ? 'light' as const : 'dark' as const) : mode as 'dark' | 'light' };
      const context = await browser.newContext(contextOptions);
      if (isNext && explicit) await context.addCookies([{ name: 'proof-mode', value: mode, url: production.url }]);
      const page = await context.newPage();
      const pageErrors = browserErrors(page);
      let hydration: HydrationEvidence | undefined;
      const name = id.split('/').at(-1)!;
      if (isNext) {
        const serverContext = await browser.newContext({ ...contextOptions, javaScriptEnabled: false });
        await serverContext.addCookies(await context.cookies());
        const serverPage = await serverContext.newPage();
        const response = await serverPage.goto(production.url, { waitUntil: 'networkidle' });
        assert.ok(response && response.ok(), 'server HTML must load');
        await writeFile(join(output, `${name}.server.html`), await response.text());
        hydration = { server: await hydrationState(serverPage), hydrated: { attributes: {}, content: null }, ready: false, errors: pageErrors };
        await serverContext.close();
      }
      await page.goto(production.url, { waitUntil: 'networkidle' });
      if (hydration) {
        hydration.ready = await page.locator('body[data-hydrated="true"]').waitFor({ timeout: 10000 }).then(() => true, () => false);
        hydration.hydrated = await hydrationState(page);
        if (hydration.server.attributes['data-theme'] !== (explicit ? mode : null) || hydration.server.attributes['data-proof-mode'] !== (explicit ? mode : 'system')) pageErrors.push('server HTML initial mode differs from requested mode');
      } else await page.evaluate((mode) => { if (mode) document.documentElement.dataset.theme = mode; else document.documentElement.removeAttribute('data-theme'); }, explicit ? mode : null);
      await page.mouse.move(0, 0);
      await page.evaluate(async () => {
        getComputedStyle(document.querySelector('button') ?? document.documentElement).backgroundColor;
        await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})));
      });
      const snapshot = await page.evaluate(({ table, mode, id, layout }) => {
        const names = ['surface', 'text', 'accent', 'accent-contrast', 'success', 'success-contrast'];
        const root = getComputedStyle(document.documentElement);
        const normalize = (value: string) => {
          const probe = document.createElement('span');
          probe.style.color = value;
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const expected = {
          root: { backgroundColor: normalize(table['--ult-color-surface']!), color: normalize(table['--ult-color-text']!) },
          control: { backgroundColor: normalize(table['--ult-color-accent']!), color: normalize(table['--ult-color-accent-contrast']!) },
          status: { backgroundColor: normalize(table['--ult-color-success']!), color: normalize(table['--ult-color-success-contrast']!) },
        };
        const paint = (element: Element | null) => element ? { backgroundColor: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color } : null;
        const actual = { root: paint(document.documentElement), control: paint(document.querySelector('button')), status: paint(document.querySelector('[role="status"]')) };
        const variables = Object.fromEntries(names.map((name) => { const token = `--ult-color-${name}`; return [token, { expected: table[token], actual: root.getPropertyValue(token).trim() }]; }));
        const failures: string[] = [];
        for (const [token, value] of Object.entries(variables)) if (value.actual !== value.expected) failures.push(`${token}: expected ${value.expected}, got ${value.actual}`);
        for (const part of ['root', 'control', 'status'] as const) for (const property of ['backgroundColor', 'color'] as const) if (actual[part]?.[property] !== expected[part][property]) failures.push(`${part}.${property}: expected ${expected[part][property]}, got ${actual[part]?.[property] ?? 'missing element'}`);
        if (root.colorScheme !== mode) failures.push(`color-scheme: expected ${mode}, got ${root.colorScheme}`);
        const control = document.querySelector('button');
        const css = control && getComputedStyle(control);
        const length = (value: string, property: 'height' | 'borderRadius') => {
          const probe = document.createElement('div');
          probe.style.position = 'absolute';
          probe.style[property] = value;
          document.body.append(probe);
          const normalized = getComputedStyle(probe)[property];
          probe.remove();
          return normalized;
        };
        const extraction = { tokens: { height: table['--ult-space-10'], radius: table['--ult-radius-md'] }, expected: { height: length(table['--ult-space-10']!, 'height'), radius: length(table['--ult-radius-md']!, 'borderRadius'), display: 'inline-flex' }, actual: { height: css?.height, radius: css?.borderRadius, display: css?.display } };
        for (const property of ['height', 'radius', 'display'] as const) if (extraction.actual[property] !== extraction.expected[property]) failures.push(`control.${property}: expected ${extraction.expected[property]}, got ${extraction.actual[property]}`);
        return { id, mode, engine: 'chromium', layout, deliveryPath: 'css', variables, expected, actual, extraction, colorScheme: root.colorScheme, failures };
      }, { table: tables[mode], mode, id, layout: options.layout });
      snapshot.failures.push(...(hydration ? hydrationProblems(hydration) : pageErrors));
      await writeFile(join(output, `${name}.values.json`), `${JSON.stringify({ ...snapshot, hydration }, null, 2)}\n`);
      await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
      report.executed.push(id);
      report.cases.push({ id, status: snapshot.failures.length ? 'failed' : 'passed', snapshot: `${name}.values.json`, failures: snapshot.failures });
      await context.close();
    }
    report.status = report.cases.some((row) => row.status === 'failed') ? 'failed' : 'passed';
    const after = hashSource(repository);
    assert.ok(after.ok && after.manifest.digest === source.manifest.digest, 'source changed while consumer proof ran');
  } catch (error) { report.errors.push(String(error)); report.status = 'incomplete'; }
  finally {
    await browser?.close();
    for (const server of servers.reverse()) await server.close();
    await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`consumer-proof: ${report.status}; report ${join(output, 'report.json')}`);
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options: ProofOptions = { layout: 'vite', deliveryPath: 'css' };
  let baseApp: string | undefined;
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (flag === '--layout' && CONSUMER_LAYOUTS.includes(value as ConsumerLayout)) options.layout = value as ConsumerLayout;
    else if (flag === '--delivery-path' && value === 'css') options.deliveryPath = value;
    else if (flag === '--output' && value) options.output = value;
    else if (flag === '--exercise' && value === 'theme-mode') options.exercise = value;
    else if (flag === '--base-styles' && value) baseApp = resolve(value);
    else if (flag === '--fault' && (value === 'theme-import' || value === 'stylex-extraction' || value === 'src-extraction' || value === 'hydration-mismatch' || value === 'mode-script')) options.fault = value;
    else throw new Error(`unsupported argument ${flag} ${value ?? ''}`);
  }
  if (baseApp) {
    assert.ok(!options.fault && !options.output, 'base styles run against an existing smoke build');
    await baseStyleProof(baseApp, options.layout);
  } else {
    const report = await consumerProof(options);
    process.exitCode = report.status === 'passed' ? 0 : report.status === 'failed' ? 1 : 2;
  }
}
