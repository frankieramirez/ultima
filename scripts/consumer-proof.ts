import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';
import { draftFingerprint } from '../packages/tokens/src/theme/codec.ts';
import { presetDraft, resolveDraft, stockDraft, type ThemeDraft } from '../packages/tokens/src/theme/draft.ts';
import { gate } from '../packages/tokens/src/theme/gate.ts';
import { shuffleDraft } from '../packages/tokens/src/theme/shuffle.ts';
import { packCli, repository, run, scaffold, serveRegistry, type Run } from './consumer-helpers.ts';
import { CONSUMER_LAYOUTS, DELIVERY_PATHS, consumerCases, consumerCell, consumerPrerequisites, consumerReproduction, type ConsumerLayout, type ConsumerReport, type DeliveryPath } from './consumer-report.ts';
import { THEME_PRESETS } from '../packages/tokens/src/theme/draft.ts';
import { installScene, isSceneFault, SCENE_FAULTS, SCENE_ITEMS } from './consumer-scene.ts';
import { browserConditions } from './consumer-browser.ts';
import { consumerValues } from './consumer-values.ts';
import { cliProof, installTheme } from './consumer-delivery.ts';
import { browserErrors, hydrationProblems, type BrowserLog, hydrationState, nextFault, nextScene, serveNext, setupNext, type HydrationEvidence } from './consumer-next.ts';
import { hashSource } from './verification/source.ts';
import { ultimaPresetUrl } from '../apps/docs/src/ultima-preset.ts';
import { themeRegistry } from '../apps/docs/server/theme-registry.ts';
import { contentHash, stampLine, withStamp } from '../packages/cli/src/stamp.ts';
import { BASE_THEME_MARKER } from '../packages/cli/src/base-theme.ts';
import { toCss } from '../packages/tokens/src/theme/export.ts';

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

export const PROOF_FAULTS = ['theme-import', 'stylex-extraction', 'src-extraction', 'hydration-mismatch', 'partial-group', ...SCENE_FAULTS] as const;
export type ProofOptions = { layout: ConsumerLayout; deliveryPath: DeliveryPath; output?: string; case?: string; preset?: 'ultima'; fault?: typeof PROOF_FAULTS[number] };
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
  if (!CONSUMER_LAYOUTS.includes(options.layout) || !DELIVERY_PATHS.includes(options.deliveryPath)) throw new Error('unsupported consumer proof parameters');
  if (options.fault === 'partial-group' && options.deliveryPath !== 'stylex-subtree') throw new Error('partial-group requires stylex-subtree');
  if (options.fault === 'src-extraction' && options.layout !== 'next-src') throw new Error('src-extraction requires next-src');
  if (options.fault === 'hydration-mismatch' && options.layout === 'vite') throw new Error('hydration-mismatch requires Next');
  if (options.case && !consumerCases(options.layout, options.deliveryPath).includes(options.case)) throw new Error(`unknown consumer cell: ${options.case}`);
  const isNext = options.layout !== 'vite';
  const src = options.layout === 'next-src';
  const setupItem = isNext ? 'setup-next' : 'setup-vite';
  const base = join(repository, '.scratch/consumer-proof');
  await mkdir(base, { recursive: true });
  const output = options.output ? resolve(options.output) : await mkdtemp(join(base, 'run-'));
  await mkdir(output, { recursive: true });
  const source = hashSource(repository);
  if (!source.ok) throw new Error(source.reason);
  const draft = options.preset === 'ultima' ? presetDraft({ id: 'ultima', revision: 2 }) : proofDraft();
  const frozen = options.preset === 'ultima'
    ? JSON.parse(await readFile(join(repository, 'packages/tokens/src/__tests__/fixtures/pre-base-theme-drafts.json'), 'utf8')).cases.find(({ name }: { name: string }) => name === 'preset-ultima-revision-2').resolved
    : resolveDraft(draft);
  assert.deepEqual(resolveDraft(draft), frozen, 'Ultima must preserve every pre-rollout default');
  const report: ConsumerReport = {
    schemaVersion: 1, status: 'incomplete', layout: options.layout, deliveryPath: options.deliveryPath,
    source: { head: source.head, manifest: source.manifest, registryManifestHash: null, cliTarballDigest: null, draftDigest: null, draftFingerprint: draftFingerprint(draft), recipeVersion: draft.recipeVersion },
    command: process.argv.slice(1), work: null, versions: { node: process.version }, installedItems: [setupItem, ...SCENE_ITEMS, 'tokens', 'lib', 'ultima-theme'],
    expected: options.case ? [options.case] : consumerCases(options.layout, options.deliveryPath), executed: [], cases: [], errors: [], drafts: {}, ...(options.case ? { selectedCase: options.case } : {}),
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
    await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', ...SCENE_ITEMS.map((item) => `@ultima/${item}`), '--yes']);
    let themeUrl = `${registry.url}/r/proof-theme.json`;
    if (options.preset === 'ultima') {
      const publicUrl = await ultimaPresetUrl();
      assert.ok(!publicUrl.tooLong, 'documented command must fit the registry URL');
      const response = await themeRegistry(new Request(publicUrl.url));
      assert.equal(response.status, 200, 'documented theme command must resolve');
      await writeFile(join(work, 'registry/r/theme.json'), await response.text());
      await writeFile(join(output, 'documented-command.txt'), `npx shadcn add "${publicUrl.url}"\n`);
      const url = new URL(publicUrl.url);
      themeUrl = `${registry.url}${url.pathname}${url.search}`;
    }
    const mainPath = join(app, isNext ? (src ? 'src/app/layout.tsx' : 'app/layout.tsx') : 'src/main.tsx');
    if (isNext) await nextScene(app, src);
    else {
      await writeFile(join(app, 'src/index.css'), '@layer reset { body { margin: 0; } }\n:root { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans); }\n');
      const main = await readFile(mainPath, 'utf8');
      assert.ok(main.includes("import './index.css'"));
      await writeFile(mainPath, main.replace("import './index.css'", "import './index.css'\nimport '../ultima-theme.css'"));
    }
    const subtree = options.deliveryPath === 'stylex-subtree';
    if (subtree) await writeFile(mainPath, (await readFile(mainPath, 'utf8')).replace(/import ['"]\.\.\/+(?:\.\.\/)?ultima-theme\.css['"];?/, ''));
    await installScene(app, options.layout, subtree, options.fault === 'partial-group', isSceneFault(options.fault) ? options.fault : undefined);
    await execute(app, 'npm', ['install', '-D', tarball]);
    const fixtures = [...(options.deliveryPath === 'registry' ? [{ name: 'css-reference', draft }] : []), { name: '', draft }, ...(options.deliveryPath === 'registry' ? THEME_PRESETS.map((preset) => ({ name: preset.id, draft: presetDraft(preset.id) })) : [])];
    const cssReference = new Map<string, Awaited<ReturnType<typeof consumerValues>>>();
    const prerequisites = consumerPrerequisites(options.layout, options.deliveryPath, options.case);
    browser = await chromium.launch({ headless: true });
    report.versions.chromium = browser.version();
    const selectedFixture = options.case ? consumerCell(options.case).fixture : undefined;
    for (const fixture of fixtures) {
      if (options.case && fixture.name !== selectedFixture && !prerequisites.some((id) => consumerCell(id).fixture === fixture.name)) continue;
      const draft = fixture.draft;
      assert.ok(gate(resolveDraft(draft)).every((row) => row.dark.pass && row.light.pass), `${fixture.name || 'non-stock'} pairing gate`);
      const fixtureOutput = fixture.name ? join(output, fixture.name) : output;
      await mkdir(fixtureOutput, { recursive: true });
      const documented = options.preset === 'ultima' && !fixture.name;
      const themeExecute: Run = (cwd, command, args) => execute(cwd, command, documented ? args.map((arg) => arg === `${registry.url}/r/proof-theme.json` ? themeUrl : arg) : args);
      const installed = await installTheme(app, join(work, 'registry'), registry.url, draft, options.layout, options.deliveryPath, themeExecute, fixture.name === 'css-reference');
      const draftDigest = digest(installed);
      report.drafts![fixture.name || 'non-stock'] = { digest: draftDigest, fingerprint: draftFingerprint(draft), recipeVersion: draft.recipeVersion };
      if (!fixture.name || (options.case && fixture.name === selectedFixture)) Object.assign(report.source, { draftDigest, draftFingerprint: draftFingerprint(draft), recipeVersion: draft.recipeVersion });
      await writeFile(join(fixtureOutput, 'ultima-theme.json'), installed);
      if (options.deliveryPath === 'cli' || documented) report.cliReports = await cliProof(app, fixtureOutput, options.layout, execute);
      if (documented) {
        await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', '@ultima/tokens-css', '--yes']);
        const lib = isNext && !src ? 'lib' : 'src/lib';
        const tokenFiles = [`${lib}/palette.ts`, `${lib}/themes.ts`, `${lib}/tokens-json.ts`, `${lib}/tokens.stylex.ts`, 'ultima-tokens.css'];
        const owned = [...tokenFiles, 'ultima-theme.css', 'ultima-theme.json', 'DESIGN.md'];
        const before = await Promise.all(owned.map((name) => readFile(join(app, name), 'utf8')));
        assert.ok(before.slice(0, tokenFiles.length).every((text) => text.includes(BASE_THEME_MARKER)), 'base marker must survive real shadcn copies');
        const after = await execute(app, 'npx', ['--no-install', 'ultima-design', 'status', '--json']);
        assert.deepEqual(JSON.parse(after).notices, [], 'post-rollout consumer must not receive an update notice');
        assert.deepEqual(await Promise.all(owned.map((name) => readFile(join(app, name), 'utf8'))), before, 'status is read-only');
        await writeFile(join(fixtureOutput, 'status-after-rollout.json'), after);
        const css = join(app, 'ultima-tokens.css');
        const legacy = toCss(draft);
        const old = withStamp(legacy, stampLine('tokens-css', 'pre-neutral', await contentHash(legacy, 'b1'), 'css'));
        await writeFile(css, old);
        try {
          const json = await execute(app, 'npx', ['--no-install', 'ultima-design', 'status', '--json']);
          const text = await execute(app, 'npx', ['--no-install', 'ultima-design', 'status']);
          assert.equal(JSON.parse(json).notices[0]?.link, 'https://ultima.systems/install/update');
          assert.deepEqual(JSON.parse(json).notices[0]?.files, ['ultima-tokens.css']);
          assert.ok(text.includes('Neutral with Tight radius') && text.includes('https://ultima.systems/install/update'));
          assert.equal(await readFile(css, 'utf8'), old, 'status must not replace a legacy token file');
          assert.deepEqual(await Promise.all(owned.filter((name) => name !== 'ultima-tokens.css').map((name) => readFile(join(app, name), 'utf8'))), before.filter((_, index) => owned[index] !== 'ultima-tokens.css'), 'status must not rewrite sources or install a theme');
          await writeFile(join(fixtureOutput, 'status-before-rollout.json'), json);
          await writeFile(join(fixtureOutput, 'status-before-rollout.txt'), text);
        } finally { await writeFile(css, before[tokenFiles.length - 1]!); }
      }
      if (options.fault === 'theme-import') await writeFile(mainPath, (await readFile(mainPath, 'utf8')).replace(/import ['"]\.\.\/+(?:\.\.\/)?ultima-theme\.css['"];?/, ''));
      if (isNext && options.fault === 'hydration-mismatch') {
        const scene = join(app, src ? 'src/ThemeConsumer.tsx' : 'ThemeConsumer.tsx');
        await writeFile(scene, (await readFile(scene, 'utf8')).replace('Hydration probe</span>', "{typeof window === 'undefined' ? 'Server content' : 'Client content'}</span>"));
      } else if (isNext) await nextFault(app, src, options.fault);
      else if (options.fault === 'stylex-extraction') {
        const config = await readFile(configPath, 'utf8');
        await writeFile(configPath, `import type { Plugin } from 'vite';\n${config.replace('plugins: [', "plugins: [({ name: 'proof:missing-extraction', enforce: 'post', generateBundle(_options, bundle) { for (const file of Object.values(bundle)) if (file.type === 'asset' && file.fileName.endsWith('.css')) file.source = ''; } } satisfies Plugin), ")}`);
      }
      for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'components.json', 'ultima-theme.css', ...(isNext ? ['babel.config.js', 'postcss.config.js', ...(!src ? ['ThemeConsumer.tsx'] : [])] : ['vite.config.ts', 'ultima.vite.ts'])]) await cp(join(app, name), join(fixtureOutput, name));
      for (const name of isNext && !src ? ['app', 'components', 'lib'] : ['src']) await cp(join(app, name), join(fixtureOutput, name), { recursive: true });
      for (const name of ['react', 'react-dom', '@stylexjs/stylex', 'ultima-design', ...(isNext ? ['next', '@stylexjs/babel-plugin', '@stylexjs/postcss-plugin'] : ['vite', '@stylexjs/unplugin'])]) report.versions[name] = JSON.parse(await readFile(join(app, 'node_modules', name, 'package.json'), 'utf8')).version;
      report.versions.npm = (await execute(app, 'npm', ['--version'])).trim();
      try { await writeFile(join(fixtureOutput, 'build.log'), await execute(app, 'npm', ['run', 'build'])); }
      catch (error) { await writeFile(join(fixtureOutput, 'build.log'), String(error)); throw error; }
      const production = isNext ? await serveNext(app, join(fixtureOutput, 'server.log')) : await serveRegistry(join(app, 'dist'), true, join(fixtureOutput, 'server.log'));
      servers.push(production);
      const tables = options.preset === 'ultima' && (!fixture.name || fixture.name === 'css-reference' || fixture.name === 'ultima') ? frozen : resolveDraft(draft);
      const ids = ['system-dark', 'system-light', 'explicit-dark', 'explicit-light'].map((mode) => `${options.layout}/${options.deliveryPath}/chromium/${fixture.name ? `${fixture.name}-` : ''}${mode}`);
      for (const id of ids) {
        if (options.case && id !== options.case && !prerequisites.includes(id)) continue;
        const mode = id.endsWith('-dark') ? 'dark' : 'light';
        const explicit = id.includes('explicit-');
        const contextOptions = { reducedMotion: 'no-preference' as const, colorScheme: explicit ? (mode === 'dark' ? 'light' as const : 'dark' as const) : mode as 'dark' | 'light' };
        const context = await browser.newContext(contextOptions);
        if (isNext && explicit) await context.addCookies([{ name: 'proof-mode', value: mode, url: production.url }]);
        const page = await context.newPage();
        const browserLog: BrowserLog = { console: [], pageErrors: [], failedRequests: [] };
        const pageErrors = browserErrors(page, browserLog);
        let hydration: HydrationEvidence | undefined;
        const name = id.split('/').at(-1)!;
        const reproduceArgv = consumerReproduction(options.layout, options.deliveryPath, id, options);
        const reproduce = reproduceArgv.join(' ');
        let values: Record<string, unknown>;
        let failures: string[];
        let axeReport: unknown;
        try {
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
        const { snapshot, browser: conditions } = await browserConditions(page, tables, mode, explicit, id, options.layout, options.deliveryPath);
        const referenceKey = `${explicit ? 'explicit' : 'system'}-${mode}`;
        if (fixture.name === 'css-reference') cssReference.set(referenceKey, snapshot);
        else if (!fixture.name && options.deliveryPath === 'registry') {
          const reference = cssReference.get(referenceKey)!;
          for (const part of ['variables', 'controlVariables', 'portalVariables'] as const) {
            for (const [token, value] of Object.entries(snapshot[part])) if (value.actual !== reference[part][token]?.actual) snapshot.failures.push(`registry differs from generated CSS: ${part} ${token}`);
          }
          if (JSON.stringify(snapshot.actual) !== JSON.stringify(reference.actual)) snapshot.failures.push('registry paint differs from generated CSS');
        }
        snapshot.failures.push(...(hydration ? hydrationProblems(hydration) : pageErrors));
        snapshot.failures.push(...browserLog.failedRequests.filter((entry) => !entry.required).map((entry) => `request failed: ${JSON.stringify(entry)}`));
        values = { ...snapshot, hydration, browser: conditions };
        failures = snapshot.failures;
        axeReport = conditions.axe;
        } catch (error) {
          failures = [String(error)];
          const partial = (error as { browser?: { axe: unknown } }).browser;
          values = { id, mode, engine: 'chromium', layout: options.layout, deliveryPath: options.deliveryPath, expected: tables[mode], actual: null, failures, browser: partial, incomplete: true };
          axeReport = partial?.axe ?? { error: String(error), incomplete: true };
        }
        await page.screenshot({ path: join(output, `${name}.png`), fullPage: true }).catch((error) => failures.push(`screenshot unavailable: ${error}`));
        await writeFile(join(output, `${name}.browser.json`), `${JSON.stringify(browserLog, null, 2)}\n`);
        await writeFile(join(output, `${name}.axe.json`), `${JSON.stringify(axeReport, null, 2)}\n`);
        await writeFile(join(output, `${name}.reproduce.txt`), `${reproduce}\nSource: ${source.head}\nManifest: ${source.manifest.digest}\n`);
        await writeFile(join(output, `${name}.values.json`), `${JSON.stringify({ ...values, source: { head: source.head, manifest: source.manifest.digest }, reproduceArgv, reproduce, fixture: relative(output, fixtureOutput) || '.', artifacts: { build: relative(output, join(fixtureOutput, 'build.log')), server: relative(output, join(fixtureOutput, 'server.log')), browser: `${name}.browser.json`, axe: `${name}.axe.json`, screenshot: `${name}.png`, reproduce: `${name}.reproduce.txt` } }, null, 2)}\n`);
        const row = { id, status: failures.length ? 'failed' as const : 'passed' as const, snapshot: `${name}.values.json`, failures };
        if (prerequisites.includes(id)) (report.prerequisites ??= []).push(row);
        else {
          report.executed.push(id);
          report.cases.push(row);
        }
        await context.close();
      }
      await production.close();
      servers.pop();
    }
    report.status = [...(report.prerequisites ?? []), ...report.cases].some((row) => row.status === 'failed') ? 'failed' : 'passed';
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
    else if (flag === '--delivery-path' && DELIVERY_PATHS.includes(value as DeliveryPath)) options.deliveryPath = value as DeliveryPath;
    else if (flag === '--output' && value) options.output = value;
    else if (flag === '--case' && value) options.case = value;
    else if (flag === '--preset' && value === 'ultima') options.preset = value;
    else if (flag === '--base-styles' && value) baseApp = resolve(value);
    else if (flag === '--fault' && PROOF_FAULTS.includes(value as typeof PROOF_FAULTS[number])) options.fault = value as typeof PROOF_FAULTS[number];
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
