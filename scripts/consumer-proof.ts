import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { draftFingerprint, parseDraft, serializeDraft } from '../packages/tokens/src/theme/codec.ts';
import { presetDraft, resolveDraft, stockDraft, type ThemeDraft } from '../packages/tokens/src/theme/draft.ts';
import { toCss, toRegistryItem } from '../packages/tokens/src/theme/export.ts';
import { gate } from '../packages/tokens/src/theme/gate.ts';
import { shuffleDraft } from '../packages/tokens/src/theme/shuffle.ts';
import { packCli, repository, run, scaffold, serveRegistry, type Run } from './consumer-helpers.ts';
import { CONSUMER_CASES, type ConsumerReport } from './consumer-report.ts';
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

export type ProofOptions = { layout: 'vite'; deliveryPath: 'css'; output?: string; fault?: 'theme-import' | 'stylex-extraction' };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

export async function consumerProof(options: ProofOptions): Promise<ConsumerReport> {
  if (options.layout !== 'vite' || options.deliveryPath !== 'css') throw new Error('only layout=vite deliveryPath=css is implemented');
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
    command: process.argv.slice(1), work: null, versions: { node: process.version }, installedItems: ['setup-vite', 'button', 'badge', 'tokens', 'lib', 'ultima-theme'],
    expected: [...CONSUMER_CASES], executed: [], cases: [], errors: [],
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
    const app = join(work, 'vite-app');
    await scaffold('vite', app, execute);
    const setup = await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', `${registry.url}/r/setup-vite.json`, '--yes']);
    for (const step of ['"paths": { "@/*": ["./src/*"] }', "import { ultimaStylex } from './ultima.vite.ts'", 'before the React plugin', 'Wrap any global CSS reset in an @layer']) assert.ok(setup.includes(step), `setup no longer prints: ${step}`);
    for (const name of ['tsconfig.json', 'tsconfig.app.json']) {
      const path = join(app, name);
      const json = JSON.parse((await readFile(path, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));
      json.compilerOptions = { ...json.compilerOptions, paths: { '@/*': ['./src/*'] } };
      await writeFile(path, `${JSON.stringify(json, null, 2)}\n`);
    }
    const configPath = join(app, 'vite.config.ts');
    const config = await readFile(configPath, 'utf8');
    assert.ok(config.includes('plugins: [') && config.includes("import { defineConfig } from 'vite'"));
    await writeFile(configPath, config.replace('plugins: [', 'plugins: [ultimaStylex(), ').replace("import { defineConfig } from 'vite'", "import { defineConfig } from 'vite'\nimport { ultimaStylex } from './ultima.vite.ts'"));
    const componentsPath = join(app, 'components.json');
    const components = JSON.parse(await readFile(componentsPath, 'utf8'));
    components.registries['@ultima'] = `${registry.url}/r/{name}.json`;
    await writeFile(componentsPath, `${JSON.stringify(components, null, 2)}\n`);
    await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', '@ultima/button', '@ultima/badge', '--yes']);
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
    await writeFile(join(app, 'src/App.tsx'), `import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export default function App() {
  return <main><h1>Installed consumer proof</h1><Button tone="accent">Theme control</Button><Badge tone="success" variant="solid" role="status">Ready</Badge></main>;
}
`);
    await writeFile(join(app, 'src/index.css'), '@layer reset { body { margin: 0; } }\n:root { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans); }\n');
    const mainPath = join(app, 'src/main.tsx');
    const main = await readFile(mainPath, 'utf8');
    assert.ok(main.includes("import './index.css'"));
    await writeFile(mainPath, main.replace("import './index.css'", "import './index.css'\nimport '../ultima-theme.css'"));
    await execute(app, 'npm', ['install', '-D', tarball]);
    for (const command of ['doctor', 'check']) await execute(app, 'npx', ['--no-install', 'ultima-design', command]);
    if (options.fault === 'theme-import') await writeFile(mainPath, (await readFile(mainPath, 'utf8')).replace("import '../ultima-theme.css'", ''));
    if (options.fault === 'stylex-extraction') await writeFile(configPath, (await readFile(configPath, 'utf8')).replace("import { ultimaStylex } from './ultima.vite.ts'", '').replace('ultimaStylex(), ', "{ name: 'consumer:alias', config: () => ({ resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } } }) }, "));
    for (const name of ['package.json', 'package-lock.json', 'vite.config.ts', 'ultima.vite.ts', 'components.json', 'ultima-theme.css']) await cp(join(app, name), join(output, name));
    await cp(join(app, 'src'), join(output, 'src'), { recursive: true });
    for (const name of ['vite', 'react', '@stylexjs/stylex', '@stylexjs/unplugin', 'ultima-design']) report.versions[name] = JSON.parse(await readFile(join(app, 'node_modules', name, 'package.json'), 'utf8')).version;
    report.versions.npm = (await execute(app, 'npm', ['--version'])).trim();
    await execute(app, 'npm', ['run', 'build']);
    const production = await serveRegistry(join(app, 'dist'), true);
    servers.push(production);
    browser = await chromium.launch({ headless: true });
    report.versions.chromium = browser.version();
    const page = await browser.newPage({ reducedMotion: 'no-preference' });
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const tables = resolveDraft(draft);
    for (const id of CONSUMER_CASES) {
      const mode = id.endsWith('-dark') ? 'dark' : 'light';
      const explicit = id.includes('/explicit-');
      await page.emulateMedia({ colorScheme: explicit ? (mode === 'dark' ? 'light' : 'dark') : mode });
      pageErrors.length = 0;
      await page.goto(production.url, { waitUntil: 'networkidle' });
      await page.evaluate((mode) => { if (mode) document.documentElement.dataset.theme = mode; else document.documentElement.removeAttribute('data-theme'); }, explicit ? mode : null);
      await page.mouse.move(0, 0);
      await page.evaluate(async () => {
        getComputedStyle(document.querySelector('button') ?? document.documentElement).backgroundColor;
        await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})));
      });
      const snapshot = await page.evaluate(({ table, mode, id }) => {
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
        return { id, mode, engine: 'chromium', layout: 'vite', deliveryPath: 'css', variables, expected, actual, colorScheme: root.colorScheme, failures };
      }, { table: tables[mode], mode, id });
      snapshot.failures.push(...pageErrors);
      const name = id.split('/').at(-1)!;
      await writeFile(join(output, `${name}.values.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
      await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
      report.executed.push(id);
      report.cases.push({ id, status: snapshot.failures.length ? 'failed' : 'passed', snapshot: `${name}.values.json`, failures: snapshot.failures });
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
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (flag === '--layout' && value === 'vite') options.layout = value;
    else if (flag === '--delivery-path' && value === 'css') options.deliveryPath = value;
    else if (flag === '--output' && value) options.output = value;
    else if (flag === '--fault' && (value === 'theme-import' || value === 'stylex-extraction')) options.fault = value;
    else throw new Error(`unsupported argument ${flag} ${value ?? ''}`);
  }
  const report = await consumerProof(options);
  process.exitCode = report.status === 'passed' ? 0 : report.status === 'failed' ? 1 : 2;
}
