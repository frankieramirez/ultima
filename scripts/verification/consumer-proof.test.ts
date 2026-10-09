import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { scaffold, serveRegistry, packCli, type Run } from '../consumer-helpers.ts';
import { CONSUMER_CASES, CONSUMER_LAYOUTS, DELIVERY_PATHS, consumerCases, consumerPrerequisites, consumerReproduction, consumerReportProblems, type ConsumerReport } from '../consumer-report.ts';
import { cliReportProblems, installTheme } from '../consumer-delivery.ts';
import { SCENE_INSTALL, SCENE_ITEMS, sceneFiles, sceneSource } from '../consumer-scene.ts';
import { BROWSER_ASSERTIONS, abortedBrowserProblems, browserEvidenceProblems } from '../consumer-browser.ts';
import { toCss, toRegistryItem } from '../../packages/tokens/src/theme/export.ts';
import { draftFingerprint, serializeDraft } from '../../packages/tokens/src/theme/codec.ts';
import { THEME_PRESETS, stockDraft } from '../../packages/tokens/src/theme/draft.ts';
import { browserErrors, hydrationProblems, nextFault, nextScene, setupNext, type BrowserLog, type HydrationEvidence } from '../consumer-next.ts';
import { EventEmitter } from 'node:events';
import type { Page } from 'playwright';
import { baseStyleProblems, proofDraft, type BaseStyles } from '../consumer-proof.ts';
import { resolveDraft } from '../../packages/tokens/src/theme/draft.ts';
import { gate } from '../../packages/tokens/src/theme/gate.ts';
import { contextFor, planned, IDENTITY } from './adapter-context.ts';
import { ADAPTERS } from './adapters.ts';
import { manifestOf } from './source.ts';
import { CONSUMER_RULES } from '../../packages/analysis/src/consumer.ts';
import { themeProofProblems, themeSnapshot } from '../consumer-theme.ts';
import type { ThemeRow } from '../../packages/cli/src/doctor-theme.ts';
import { setupItems } from '../../registry/items.config.ts';

test('installed theme receipt requires complete linked CSS/document proof and retains tree contents', async () => {
  const row: Omit<ThemeRow, 'artifact'> = { family: 'theme', boundary: 'src/main.tsx', state: 'match', paths: { artifact: 'ultima-theme.css', draft: 'ultima-theme.json', imports: [] }, source: null, differences: [], reason: 'fixture', repair: 'fixture', coverage: { contentMatches: true, modes: ['dark', 'light'], groups: [], scopes: [], rendering: 'not-evaluated' } };
  const report: Parameters<typeof themeProofProblems>[0] = { theme: { schemaVersion: 1, rows: [{ ...row, artifact: 'css' }, { ...row, artifact: 'design' }] }, diagnostics: [] };
  assert.deepEqual(themeProofProblems(report), []);
  assert.ok(themeProofProblems({}).length);
  report.theme!.rows[1] = { ...row, artifact: 'design', state: 'unlinked', paths: { ...row.paths, artifact: null, draft: null } };
  assert.deepEqual(themeProofProblems(report, false), []);
  assert.ok(themeProofProblems(report).length, 'registry-installed document must still match');
  report.theme!.rows[1]!.paths.artifact = 'DESIGN.md';
  assert.ok(themeProofProblems(report, false).length, 'a present document cannot be waived as missing');
  report.theme!.rows.pop();
  assert.ok(themeProofProblems(report, false).length, 'optional document requires an explicit unlinked row');
  report.theme!.rows[0]!.state = 'incomplete';
  assert.ok(themeProofProblems(report).length);
  const work = await mkdtemp(join(tmpdir(), 'ultima-theme-snapshot-'));
  try {
    await writeFile(join(work, 'DESIGN.md'), 'product');
    const before = await themeSnapshot(work);
    await writeFile(join(work, 'DESIGN.md'), 'product edit');
    assert.notDeepEqual(await themeSnapshot(work), before);
  } finally { await rm(work, { recursive: true, force: true }); }
});

const browserFixture = `
  snapshot.browser = { assertions: ${JSON.stringify(BROWSER_ASSERTIONS)}.map(name => ({ name, expected: true, actual: true, status: 'passed' })), axe: Object.fromEntries(['closed', 'open', 'switched-open', 'switched-closed'].map(state => [state, { violations: [], incomplete: [], passes: [{ id: 'synthetic-rule' }] }])), modeSnapshots: ['dark', 'light', 'dark'].map(mode => ({ mode, layout: report.layout, deliveryPath: report.deliveryPath, variables, controlVariables: variables, portalVariables: variables, expected: paint, actual: paint, colorScheme: mode, controlColorScheme: mode, portal: { inContainer: true, documentSurface: 'stock', subtreeSurface: 'draft', colorScheme: mode }, extraction: { expected: { height: '40px', radius: '4px', display: 'inline-flex' }, actual: { height: '40px', radius: '4px', display: 'inline-flex' } }, failures: [] })), failures: [] };
  snapshot.fixture = '.';
  snapshot.reproduceArgv = ['node', '--experimental-strip-types', 'scripts/consumer-proof.ts', '--layout', report.layout, '--delivery-path', report.deliveryPath, '--case', row.id];
  snapshot.reproduce = snapshot.reproduceArgv.join(' ');
  snapshot.source = { head: report.source.head, manifest: report.source.manifest.digest };
  snapshot.artifacts = { build: 'build.log', server: 'server.log', browser: row.id.split('/').at(-1) + '.browser.json', axe: row.id.split('/').at(-1) + '.axe.json', screenshot: 'synthetic.png', reproduce: row.id.split('/').at(-1) + '.reproduce.txt' };
  fs.writeFileSync(path.join(output, 'package.json'), '{}');
  for (const name of ['build.log', 'server.log', 'synthetic.png']) fs.writeFileSync(path.join(output, name), 'synthetic artifact');
  fs.writeFileSync(path.join(output, snapshot.artifacts.browser), JSON.stringify({ console: [], pageErrors: [], failedRequests: [] }));
  fs.writeFileSync(path.join(output, snapshot.artifacts.axe), JSON.stringify(snapshot.browser.axe));
  fs.writeFileSync(path.join(output, snapshot.artifacts.reproduce), snapshot.reproduce + '\\n');
`;

test('migrated base styles preserve stock dimensions, neutral accent/focus and danger assertions', () => {
  const expected: BaseStyles = { height: '40px', display: 'inline-flex', radius: '4px', background: 'rgb(20, 20, 20)', focusColor: 'rgb(30, 30, 30)', focusStyle: 'solid', focusVisible: true, danger: 'rgb(200, 0, 0)' };
  assert.deepEqual(baseStyleProblems(expected, expected), []);
  for (const key of Object.keys(expected) as (keyof BaseStyles)[]) {
    const actual = { ...expected, [key]: key === 'focusVisible' ? false : 'wrong' };
    assert.ok(baseStyleProblems(actual, expected).some((failure) => failure.startsWith(`${key}:`)), key);
  }
  const nonNeutral = { ...expected, background: 'rgb(20, 30, 40)', focusColor: 'rgb(40, 30, 20)' };
  assert.equal(baseStyleProblems(nonNeutral, nonNeutral).length, 2);
});

test('consumer helpers preserve the fresh Vite, Next root/src and vanilla scaffold commands', async () => {
  const calls: unknown[] = [];
  const execute: Run = async (cwd, command, args) => { calls.push([cwd, command, args]); return ''; };
  for (const layout of ['vite', 'next-root', 'next-src', 'vanilla'] as const) await scaffold(layout, `/external/${layout}`, execute);
  assert.deepEqual(calls, [
    ['/external', 'npm', ['create', 'vite@latest', 'vite', '--', '--template', 'react-ts']],
    ['/external/vite', 'npm', ['install']],
    ...(['root', 'src'] as const).map((layout) => ['/external', 'npx', ['-y', 'create-next-app@latest', `next-${layout}`, '--ts', '--app', '--no-tailwind', layout === 'src' ? '--src-dir' : '--no-src-dir', '--no-eslint', '--turbopack', '--import-alias', '@/*', '--use-npm', '--yes']]),
    ['/external', 'npm', ['create', 'vite@latest', 'vanilla', '--', '--template', 'vanilla-ts']],
  ]);
});

test('shared server retains registry 404s, MIME types and SPA fallback; tarball packing fails on ambiguous output', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-helpers-'));
  const server = await serveRegistry(work, true);
  try {
    await mkdir(join(work, 'r'));
    await writeFile(join(work, 'r/registry.json'), '{}');
    await writeFile(join(work, 'index.html'), '<h1>app</h1>');
    const registry = await fetch(`${server.url}/r/registry.json`);
    assert.equal(registry.headers.get('content-type'), 'application/json');
    assert.equal(await registry.text(), '{}');
    for (const path of ['/r/missing.json', '/tokens.css', '/llms.txt', '/%2e%2e%2fsecret']) assert.equal((await fetch(`${server.url}${path}`)).status, 404);
    assert.equal(await (await fetch(`${server.url}/route`)).text(), '<h1>app</h1>');
    assert.equal(await (await fetch(server.url)).text(), '<h1>app</h1>');
    const pack: Run = async (_cwd, command, args) => {
      assert.equal(command, 'pnpm');
      assert.equal(args[0], 'pack');
      await writeFile(join(work, 'pack/ultima-design-1.tgz'), 'tarball');
      return '';
    };
    assert.equal(await readFile(await packCli(work, pack), 'utf8'), 'tarball');
    await writeFile(join(work, 'pack/ultima-design-2.tgz'), 'another tarball');
    await assert.rejects(packCli(work, pack), /expected one CLI tarball/);
  } finally { await server.close(); await rm(work, { recursive: true, force: true }); }
});

test('the non-stock consumer draft passes the two-mode Studio pairing gate', () => {
  assert.ok(gate(resolveDraft(proofDraft())).every((row) => row.dark.pass && row.light.pass));
});

test('the installed scene is the projected Projects bundle, installed by its derived command', () => {
  assert.equal(SCENE_INSTALL, 'npx shadcn add @ultima/button @ultima/card @ultima/dialog @ultima/empty @ultima/field @ultima/input @ultima/select @ultima/sidebar @ultima/table');
  assert.deepEqual(SCENE_ITEMS, ['button', 'card', 'dialog', 'empty', 'field', 'input', 'select', 'sidebar', 'table']);
  const files = sceneFiles();
  assert.deepEqual(files.map(({ path }) => path), ['components/projects/projects.tsx', 'components/projects/projects-data.ts', 'components/projects/screen.stylex.ts']);
  const screen = files[0]!.content;
  assert.doesNotMatch(files.map(({ content }) => content).join('\n'), /from '@ultima\//);
  for (const contract of ["'use client'", "from '@/components/ui/select'", "from './screen.stylex'", 'Project name', 'Enter a project name.', 'Create project', 'type="reset"', 'Sidebar.Link', 'Dialog.Portal container={container}', 'Select.Portal container={container}', 'Table.Caption', 'No projects']) assert.ok(screen.includes(contract), contract);
  for (const subtree of [false, true]) assert.match(sceneSource(subtree), /import Projects from '\.\/components\/projects\/projects';/);
});

test('scene faults mutate the real portal boundary, required error name and focus-return API', () => {
  assert.match(sceneSource(true), /<Projects container=\{container\} \/>/);
  assert.doesNotMatch(sceneSource(true, false, 'portal-theme'), /<Projects container/);
  assert.match(sceneSource(false, false, 'portal-theme'), /data-theme=\{mode === 'dark' \? 'light' : 'dark'\}/);
  assert.match(sceneFiles('required-error-name')[0]!.content, /<Field\.Error match><\/Field\.Error>/);
  assert.match(sceneFiles('focus-return')[0]!.content, /<Dialog\.Popup finalFocus=\{false\}>/);
  assert.deepEqual(sceneFiles('portal-theme'), sceneFiles());
});

test('browser evidence fails closed on missing assertions, dynamic probes, failures and axe states', () => {
  const variables = Object.fromEntries(Object.keys(resolveDraft(stockDraft()).light).map((key) => [key, { expected: 'paint', actual: 'paint' }]));
  const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map((part) => [part, { backgroundColor: 'paint', color: 'text' }]));
  const fixture = {
    assertions: BROWSER_ASSERTIONS.map((name) => ({ name, expected: true, actual: true, status: 'passed' })),
    axe: Object.fromEntries(['closed', 'open', 'switched-open', 'switched-closed'].map((state) => [state, { violations: [] as unknown[], incomplete: [], passes: [{ id: 'synthetic-rule' }] }])),
    modeSnapshots: ['dark', 'light', 'dark'].map((mode) => ({ mode, layout: 'vite', deliveryPath: 'stylex-subtree', colorScheme: mode, controlColorScheme: mode, portal: { inContainer: true, documentSurface: 'stock', subtreeSurface: 'draft', colorScheme: mode }, extraction: { expected: { height: '40px', radius: '4px', display: 'inline-flex' }, actual: { height: '40px', radius: '4px', display: 'inline-flex' } }, expected: paint, actual: paint, variables, controlVariables: variables, portalVariables: variables, failures: [] })), failures: [] as string[],
  };
  assert.deepEqual(browserEvidenceProblems(fixture, true, 'vite', 'stylex-subtree'), []);
  for (const fault of ['omitted', 'repeated', 'false-pass', 'missing-axe', 'axe-violation', 'missing-modes', 'one-mode', 'stale-portal', 'concealed-failure', 'dynamic-extraction', 'dynamic-boundary', 'dynamic-portal-scheme', 'dynamic-control-scheme', 'dynamic-layout', 'dynamic-path'] as const) {
    const changed = structuredClone(fixture);
    if (fault === 'omitted') changed.assertions.pop();
    if (fault === 'repeated') changed.assertions[1] = changed.assertions[0]!;
    if (fault === 'false-pass') changed.assertions[0]!.actual = false;
    if (fault === 'missing-axe') delete changed.axe.open;
    if (fault === 'axe-violation') changed.axe.open!.violations.push({ id: 'color-contrast' });
    if (fault === 'missing-modes') changed.modeSnapshots = [];
    if (fault === 'one-mode') changed.modeSnapshots.forEach((snapshot) => { snapshot.mode = 'dark'; });
    if (fault === 'stale-portal') changed.modeSnapshots[0]!.portalVariables['--ult-color-surface']!.actual = 'stale';
    if (fault === 'concealed-failure') changed.failures.push('mode-switch-portal failed');
    if (fault === 'dynamic-extraction') changed.modeSnapshots[0]!.extraction.actual.height = '0px';
    if (fault === 'dynamic-boundary') changed.modeSnapshots[0]!.portal.inContainer = false;
    if (fault === 'dynamic-portal-scheme') changed.modeSnapshots[0]!.portal.colorScheme = 'light';
    if (fault === 'dynamic-control-scheme') changed.modeSnapshots[0]!.controlColorScheme = 'light';
    if (fault === 'dynamic-layout') changed.modeSnapshots[0]!.layout = 'next-src';
    if (fault === 'dynamic-path') changed.modeSnapshots[0]!.deliveryPath = 'css';
    assert.ok(browserEvidenceProblems(changed, true, 'vite', 'stylex-subtree').length, fault);
  }
  for (const part of ['variables', 'controlVariables', 'portalVariables'] as const) {
    const changed = structuredClone(fixture);
    changed.modeSnapshots[0]!.variables = structuredClone(variables);
    changed.modeSnapshots[0]!.controlVariables = structuredClone(variables);
    changed.modeSnapshots[0]!.portalVariables = structuredClone(variables);
    changed.modeSnapshots[0]!.portalVariables['--ult-color-surface']!.actual = 'concealed mismatch';
    delete changed.modeSnapshots[0]![part]['--ult-color-surface'];
    assert.ok(browserEvidenceProblems(changed, true, 'vite', 'stylex-subtree').length, `${part}: omitted source token`);
  }
  const foreign = structuredClone(fixture);
  foreign.modeSnapshots[0]!.variables['--foreign'] = { expected: 'paint', actual: 'paint' };
  assert.ok(browserEvidenceProblems(foreign, true, 'vite', 'stylex-subtree').length);
});

test('a scene that threw keeps a complete failed inventory instead of missing evidence', () => {
  const aborted = {
    assertions: BROWSER_ASSERTIONS.map((name, index) => index < 3 ? { name, expected: true, actual: true, status: 'passed' } : { name, expected: 'reached', actual: null, status: 'failed', error: 'not reached: Dialog never opened' }),
    axe: { closed: { violations: [], incomplete: [], passes: [] } }, modeSnapshots: [], failures: ['Dialog never opened'],
  };
  assert.deepEqual(abortedBrowserProblems(aborted), []);
  assert.ok(browserEvidenceProblems(aborted, false).length, 'aborted evidence is not complete evidence');
  for (const change of [
    (e: typeof aborted) => { e.assertions.pop(); },
    (e: typeof aborted) => { e.failures = []; },
    (e: typeof aborted) => { (e as { axe?: unknown }).axe = undefined; },
    (e: typeof aborted) => { (e.assertions[4] as { status: string }).status = 'skipped'; },
  ]) { const e = structuredClone(aborted); change(e); assert.ok(abortedBrowserProblems(e).length); }
  assert.ok(abortedBrowserProblems(undefined).length);
});

test('modal-only axe checks require visible exhaustive focus wraps and never resolve other incomplete rules', () => {
  const variables = Object.fromEntries(Object.keys(resolveDraft(stockDraft()).light).map((key) => [key, { expected: 'paint', actual: 'paint' }]));
  const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map((part) => [part, { backgroundColor: 'paint', color: 'text' }]));
  const inventory = [{ role: 'button', name: 'First' }, { role: 'button', name: 'Last' }];
  const rule = { id: 'aria-hidden-focus', nodes: [{ any: [], none: [], all: [{ id: 'focusable-modal-open', relatedNodes: [{ html: '<button hidden>Background</button>', target: ['hidden-background'] }] }] }] };
  const steps = [0, 1, 0, 1, 0, 1].map((position, index) => ({ key: index < 3 ? 'Tab' : 'Shift+Tab', inside: true, accessible: true, position, item: inventory[position] }));
  const fixture = {
    assertions: BROWSER_ASSERTIONS.map((name) => ({ name, expected: true, actual: true, status: 'passed' })),
    axe: Object.fromEntries(['closed', 'open', 'switched-open', 'switched-closed'].map((state) => [state, { violations: [], incomplete: state.includes('open') ? [structuredClone(rule)] : [], passes: [{ id: 'synthetic-rule' }], focusCycle: { relatedNodes: 1, inventory, steps } }])),
    modeSnapshots: ['dark', 'light', 'dark'].map((mode) => ({ mode, colorScheme: mode, controlColorScheme: mode, portal: { inContainer: true, documentSurface: 'stock', subtreeSurface: 'draft', colorScheme: mode }, extraction: { expected: { height: '40px', radius: '4px', display: 'inline-flex' }, actual: { height: '40px', radius: '4px', display: 'inline-flex' } }, expected: paint, actual: paint, variables, controlVariables: variables, portalVariables: variables, failures: [] })), failures: [],
  };
  assert.deepEqual(browserEvidenceProblems(fixture, true), []);
  const hiddenBackground = structuredClone(fixture);
  for (const state of ['open', 'switched-open'] as const) {
    hiddenBackground.axe[state]!.incomplete[0]!.nodes[0]!.all[0]!.relatedNodes = Array.from({ length: 11 }, () => ({ html: '<button hidden>Background</button>', target: ['hidden-background'] }));
    hiddenBackground.axe[state]!.focusCycle.relatedNodes = 11;
  }
  assert.deepEqual(browserEvidenceProblems(hiddenBackground, true), []);
  for (const fault of ['unrelated-rule', 'mixed-check', 'empty-node', 'empty-related', 'closed-incomplete', 'missing-cycle', 'wrong-count', 'missing-step', 'wrong-key', 'outside', 'hidden-inside', 'wrong-position', 'wrong-item', 'empty-inventory'] as const) {
    const changed = structuredClone(fixture), axe = changed.axe.open!;
    if (fault === 'unrelated-rule') axe.incomplete[0]!.id = 'color-contrast';
    if (fault === 'mixed-check') axe.incomplete[0]!.nodes[0]!.all.push({ id: 'unresolved-check', relatedNodes: [{} as { html: string; target: string[] }] });
    if (fault === 'empty-node') axe.incomplete[0]!.nodes = [];
    if (fault === 'empty-related') axe.incomplete[0]!.nodes[0]!.all[0]!.relatedNodes = [];
    if (fault === 'closed-incomplete') changed.axe.closed!.incomplete = [structuredClone(rule)];
    if (fault === 'missing-cycle') delete (axe as { focusCycle?: unknown }).focusCycle;
    if (fault === 'wrong-count') axe.focusCycle.relatedNodes = 2;
    if (fault === 'missing-step') axe.focusCycle.steps.pop();
    if (fault === 'wrong-key') axe.focusCycle.steps[0]!.key = 'Space';
    if (fault === 'outside') axe.focusCycle.steps[0]!.inside = false;
    if (fault === 'hidden-inside') axe.focusCycle.steps[0]!.accessible = false;
    if (fault === 'wrong-position') axe.focusCycle.steps[0]!.position = 1;
    if (fault === 'wrong-item') axe.focusCycle.steps[0]!.item = { role: 'button', name: 'Hidden' };
    if (fault === 'empty-inventory') axe.focusCycle.inventory = [];
    assert.ok(browserEvidenceProblems(changed, true).length, fault);
  }
  for (const container of ['any', 'none', 'all'] as const) for (const malformed of ['', {}, null, 0]) {
    const changed = structuredClone(fixture);
    Object.assign(changed.axe.open!.incomplete[0]!.nodes[0]!, { [container]: malformed });
    assert.ok(browserEvidenceProblems(changed, true).length, `${container}: malformed check container`);
  }
  for (const related of [null, {}, { target: [] }, { target: [''] }, { html: '', target: ['hidden'] }, { html: '<button />', target: [null] }]) {
    const changed = structuredClone(fixture);
    Object.assign(changed.axe.open!.incomplete[0]!.nodes[0]!.all[0]!, { relatedNodes: [related] });
    assert.ok(browserEvidenceProblems(changed, true).length, `malformed related node: ${JSON.stringify(related)}`);
  }
});

test('every delivery path has its own coverage; registry reuses the scaffold for every shipped preset', () => {
  for (const layout of CONSUMER_LAYOUTS) for (const path of DELIVERY_PATHS) {
    const cases = consumerCases(layout, path);
    assert.equal(cases.length, path === 'registry' ? 4 * (THEME_PRESETS.length + 2) : 4);
    assert.equal(new Set(cases).size, cases.length);
    assert.ok(cases.every((id) => id.startsWith(`${layout}/${path}/chromium/`)));
  }
  assert.match(sceneSource(true), /\.\.\.ultimaTheme\[mode\], colorScheme\[mode\]/);
  assert.match(sceneSource(true), /<Projects container=\{container\} \/>/);
  assert.match(sceneSource(true, true), /ultimaTheme\[mode\]\[0\]/);
});

test('theme delivery requires an actual shadcn command and verifies both files and fingerprint', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-delivery-'));
  const draft = proofDraft();
  await mkdir(join(work, 'r'));
  try {
    await assert.rejects(installTheme(work, work, 'http://127.0.0.1:4321', draft, 'vite', 'registry', async () => ''), /ENOENT/);
    let calls = 0;
    const execute: Run = async (cwd, command, args) => {
      calls++;
      assert.equal(cwd, work);
      assert.equal(command, 'npx');
      assert.deepEqual(args, ['-y', 'shadcn@latest', 'add', 'http://127.0.0.1:4321/r/proof-theme.json', '--yes', '--overwrite']);
      assert.equal(await readFile(join(work, 'r/proof-theme.json'), 'utf8'), toRegistryItem(draft));
      await writeFile(join(work, 'ultima-theme.json'), serializeDraft(draft));
      await writeFile(join(work, 'ultima-theme.css'), toCss(draft));
      return '';
    };
    assert.equal(await installTheme(work, work, 'http://127.0.0.1:4321', draft, 'vite', 'registry', execute), serializeDraft(draft));
    assert.equal(calls, 1);
    await assert.rejects(installTheme(work, work, 'http://127.0.0.1:4321', draft, 'vite', 'registry', async (...args) => { await execute(...args); await writeFile(join(work, 'ultima-theme.css'), 'corrupt'); return ''; }), /AssertionError/);
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('packed CLI evidence rejects success exits with missing scope, incomplete diagnostics or unsupported doctor steps', () => {
  const unsupported = setupItems['setup-vite'].handSteps.filter((step) => step.unverifiable)
    .map((step) => ({ step: step.prose, reason: step.unverifiable }));
  const doctor = { command: 'doctor', target: 'vite', diagnostics: [], unsupported };
  const check = { command: 'check', status: 'clean', counts: { errors: 0, incomplete: 0 }, scopes: [{ kind: 'app', files: 3 }], rules: CONSUMER_RULES.map((id) => ({ id, status: 'blocking' })), diagnostics: [], unsupported: [] };
  assert.deepEqual(cliReportProblems(doctor, 'doctor', 'vite'), []);
  assert.deepEqual(cliReportProblems(check, 'check', 'vite'), []);
  assert.ok(cliReportProblems(doctor, 'doctor', 'next-app').length);
  assert.ok(cliReportProblems({ ...doctor, unsupported: [{ step: 'missing' }] }, 'doctor', 'vite').length);
  for (const change of [{ scopes: [] }, { rules: [] }, { rules: check.rules.slice(1) }, { rules: check.rules.map((row) => ({ ...row, status: 'skipped' })) }, { status: 'incomplete' }, { diagnostics: [{}] }, { diagnostics: [{ severity: 'incomplete' }] }, { counts: { errors: 0, incomplete: 1 } }]) assert.ok(cliReportProblems({ ...check, ...change }, 'check', 'vite').length);
});

test('doctor consumer proof requires exactly the source-bound manual inventory for each layout', () => {
  for (const layout of CONSUMER_LAYOUTS) {
    const target = layout === 'vite' ? 'vite' : 'next';
    const steps = setupItems[`setup-${target}`].handSteps;
    const unsupported = steps.filter((step) => step.unverifiable)
      .map((step) => ({ step: step.prose, reason: step.unverifiable }));
    const doctor = { command: 'doctor', target, diagnostics: [], unsupported };
    assert.deepEqual(cliReportProblems(doctor, 'doctor', layout), []);
    const checked = steps.find((step) => step.assertion)!;
    for (const changed of [
      [], unsupported.slice(1), [...unsupported, unsupported[0]], [...unsupported].reverse(),
      [{ ...unsupported[0], reason: 'unknown reason' }, ...unsupported.slice(1)],
      [...unsupported, { step: 'unknown step', reason: 'unsupported' }],
      [...unsupported, { step: checked.prose, reason: 'skip a real setup assertion' }],
    ]) assert.ok(cliReportProblems({ ...doctor, unsupported: changed }, 'doctor', layout).length);
    for (const diagnostics of [[{ severity: 'blocking' }], [{ severity: 'incomplete' }]]) {
      assert.ok(cliReportProblems({ ...doctor, diagnostics }, 'doctor', layout).length);
    }
  }
});

function report(): ConsumerReport {
  const hash = 'a'.repeat(64);
  return {
    schemaVersion: 1, layout: 'vite', deliveryPath: 'css', status: 'passed',
    source: { head: 'b'.repeat(40), manifest: manifestOf([]), registryManifestHash: hash, cliTarballDigest: hash, draftDigest: hash, draftFingerprint: 'fixture', recipeVersion: 1 },
    command: [], work: '/external', versions: {}, installedItems: [], expected: [...CONSUMER_CASES], executed: [...CONSUMER_CASES], cases: CONSUMER_CASES.map((id) => ({ id, status: 'passed', snapshot: 'values.json', failures: [] })), errors: [],
  };
}

test('consumer reports fail closed on missing identity, coverage, repeated cases and concealed failures', () => {
  assert.deepEqual(consumerReportProblems(report()), []);
  assert.ok(consumerReportProblems(null).length);
  for (const change of [
    (r: ConsumerReport) => { r.source.cliTarballDigest = null; },
    (r: ConsumerReport) => { r.source.draftDigest = null; },
    (r: ConsumerReport) => { r.executed.pop(); },
    (r: ConsumerReport) => { r.cases[1] = r.cases[0]!; },
    (r: ConsumerReport) => { r.cases[0]!.failures.push('paint mismatch'); },
    (r: ConsumerReport) => { r.errors.push('crashed'); },
  ]) { const changed = report(); change(changed); assert.ok(consumerReportProblems(changed).length); }
});

test('one-cell registry selection retains exact CSS and stock prerequisites outside requested coverage', () => {
  const path = 'registry', layout = 'vite', prefix = `${layout}/${path}/chromium/`, mode = 'explicit-dark';
  for (const selected of [`${prefix}css-reference-${mode}`, `${prefix}${mode}`, `${prefix}${THEME_PRESETS[0]!.id}-${mode}`]) {
    const fixture = report();
    fixture.deliveryPath = path;
    fixture.selectedCase = selected;
    fixture.expected = [selected];
    fixture.executed = [selected];
    fixture.cases = [{ id: selected, status: 'passed', snapshot: 'selected.values.json', failures: [] }];
    fixture.prerequisites = consumerPrerequisites(layout, path, selected).map((id) => ({ id, status: 'passed', snapshot: `${id.split('/').at(-1)}.values.json`, failures: [] }));
    const selectedName = selected.split('/').at(-1)!.replace(/(?:system|explicit)-(?:dark|light)$/, '').replace(/-$/, '') || 'non-stock';
    fixture.drafts = { [selectedName]: { digest: fixture.source.draftDigest!, fingerprint: fixture.source.draftFingerprint, recipeVersion: fixture.source.recipeVersion } };
    const needs = selected.includes('/css-reference-') ? 0 : selected === `${prefix}${mode}` ? 1 : 2;
    assert.equal(fixture.prerequisites.length, needs);
    assert.deepEqual(consumerReportProblems(fixture, layout, path), []);
    const argv = consumerReproduction(layout, path, selected, { preset: 'ultima', fault: 'focus-return' });
    assert.deepEqual(argv.slice(-2), ['--case', selected]);
    assert.deepEqual(argv.slice(3, -2), ['--layout', layout, '--delivery-path', path, '--preset', 'ultima', '--fault', 'focus-return']);
    for (const fault of ['missing', 'duplicate', 'foreign', 'failed', 'null-digest', 'wrong-preset', 'full-gate'] as const) {
      const altered = structuredClone(fixture);
      if (fault === 'missing') altered.prerequisites?.pop();
      if (fault === 'duplicate') altered.prerequisites?.push(altered.prerequisites[0]!);
      if (fault === 'foreign') altered.prerequisites?.push({ id: `${prefix}other-${mode}`, status: 'passed', snapshot: 'foreign.json', failures: [] });
      if (fault === 'failed') { if (altered.prerequisites?.length) altered.prerequisites[0]!.status = 'failed'; else altered.cases[0]!.status = 'failed'; }
      if (fault === 'null-digest') altered.source.draftDigest = null;
      if (fault === 'wrong-preset') altered.drafts![selectedName]!.digest = 'b'.repeat(64);
      if (fault === 'full-gate') altered.selectedCase = undefined;
      if (!needs && fault === 'missing') continue;
      assert.ok(consumerReportProblems(altered, layout, path).length, `${selected}: ${fault}`);
    }
  }
});

test('each layout requires its own complete case set and cannot satisfy another layout', () => {
  for (const layout of CONSUMER_LAYOUTS) {
    const r = report();
    r.layout = layout;
    assert.equal(consumerReportProblems(r).length === 0, layout === 'vite');
    r.expected = consumerCases(layout);
    r.executed = consumerCases(layout);
    r.cases = r.expected.map((id) => ({ id, status: 'passed', snapshot: 'values.json', failures: [] }));
    assert.deepEqual(consumerReportProblems(r, layout), []);
    assert.ok(consumerReportProblems(r, layout === 'vite' ? 'next-src' : 'vite').length);
  }
});

test('Next hand steps move the src marker, preserve alias-based server pages and order the theme after extraction', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-next-setup-'));
  try {
    for (const src of [false, true]) {
      const app = join(work, src ? 'src-app' : 'root-app');
      const folder = join(app, src ? 'src/app' : 'app');
      await mkdir(join(app, 'app'), { recursive: true });
      if (src) await mkdir(folder, { recursive: true });
      await writeFile(join(app, 'app/ultima.css'), '@stylex;');
      await assert.rejects(setupNext(app, src, ''), /setup no longer prints/);
      await setupNext(app, src, "Import './ultima.css' from app/layout.tsx. Wrap any global CSS reset in an @layer");
      assert.equal(await readFile(join(folder, 'ultima.css'), 'utf8'), '@stylex;');
      if (src) await assert.rejects(readFile(join(app, 'app/ultima.css')));
      await nextScene(app, src);
      const layout = await readFile(join(folder, 'layout.tsx'), 'utf8');
      assert.ok(layout.indexOf("import './ultima.css'") < layout.indexOf("ultima-theme.css'"));
      assert.ok(layout.includes(src ? "import '../../ultima-theme.css'" : "import '../ultima-theme.css'"));
      assert.match(await readFile(join(folder, 'page.tsx'), 'utf8'), /@\/components\/ui\/button/);
      assert.doesNotMatch(await readFile(join(folder, 'page.tsx'), 'utf8'), /use client|packages\//);
      await nextFault(app, src, 'hydration-mismatch');
      assert.match(await readFile(join(folder, 'hydration-probe.tsx'), 'utf8'), /typeof window/);
      await writeFile(join(app, 'postcss.config.js'), "include: ['**/*.{js,jsx,ts,tsx}']");
      await nextFault(app, src, 'stylex-extraction');
      const extraction = await readFile(join(app, 'postcss.config.js'), 'utf8');
      assert.doesNotMatch(extraction, /include: \['\*\*/);
      assert.doesNotMatch(extraction, /postcss-plugin|app\/\*\*\/*/);
      assert.match(extraction, /plugins: \{\}/);
      await writeFile(join(app, 'postcss.config.js'), "include: ['**/*.{js,jsx,ts,tsx}']");
      await nextFault(app, true, 'src-extraction');
      assert.match(await readFile(join(app, 'postcss.config.js'), 'utf8'), /include: \['app\/\*\*/);
    }
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('hydration fails closed on missing completion, content/mode drift, console and required asset failures', () => {
  const evidence: HydrationEvidence = { server: { attributes: { 'data-theme': 'dark', 'data-proof-mode': 'dark' }, content: 'Installed scene' }, hydrated: { attributes: { 'data-theme': 'dark', 'data-proof-mode': 'dark' }, content: 'Installed scene' }, ready: true, errors: [] };
  assert.deepEqual(hydrationProblems(evidence), []);
  for (const change of [
    (e: HydrationEvidence) => { e.ready = false; },
    (e: HydrationEvidence) => { e.hydrated.content = 'mismatch'; },
    (e: HydrationEvidence) => { e.server.content = null; e.hydrated.content = null; },
    (e: HydrationEvidence) => { e.hydrated.attributes['data-theme'] = 'light'; },
    (e: HydrationEvidence) => { e.server.attributes = {}; e.hydrated.attributes = {}; },
    (e: HydrationEvidence) => { e.errors.push('hydration warning'); },
  ]) { const e = structuredClone(evidence); change(e); assert.ok(hydrationProblems(e).length); }
  const page = new EventEmitter();
  const log: BrowserLog = { console: [], pageErrors: [], failedRequests: [] };
  const errors = browserErrors(page as unknown as Page, log);
  page.emit('pageerror', new Error('uncaught React error'));
  page.emit('console', { type: () => 'warning', text: () => 'Hydration did not match' });
  page.emit('console', { type: () => 'error', text: () => 'React minified error #418' });
  page.emit('console', { type: () => 'log', text: () => 'ordinary message' });
  page.emit('requestfailed', { resourceType: () => 'script', url: () => '/required.js', failure: () => ({ errorText: 'connection reset' }) });
  page.emit('response', { status: () => 404, request: () => ({ resourceType: () => 'stylesheet' }), url: () => '/required.css' });
  assert.equal(errors.length, 5);
  assert.match(errors.join('\n'), /uncaught React error[\s\S]*Hydration did not match[\s\S]*#418[\s\S]*required asset failed[\s\S]*required asset HTTP 404/);
  page.emit('requestfailed', { resourceType: () => 'image', url: () => '/optional.png', failure: () => ({ errorText: 'aborted' }) });
  assert.equal(errors.length, 5, 'an optional asset is retained in the log, not as a required-asset error');
  assert.deepEqual([log.pageErrors.length, log.console.length, log.failedRequests.map((entry) => entry.required)], [1, 3, [true, true, false]]);
});

test('the verifier refuses an exit-zero consumer command that writes no report', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-proof-adapter-'));
  try {
    const context = contextFor(work, process.cwd(), planned('consumer-proof', { argv: ['node', '-e', 'process.exit(0)', '--'] }));
    const result = await ADAPTERS['consumer-proof']!.run(context);
    assert.equal(result.verdict, 'incomplete');
    assert.match(result.reason ?? '', /no readable report/);
    assert.deepEqual(result.executed, []);
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('consumer adapter requires source-bound, readable values snapshots as well as a complete report', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-proof-adapter-'));
  try {
    const fixture = report();
    const identity = { ...IDENTITY, head: fixture.source.head, manifest: fixture.source.manifest };
    for (const fault of ['none', 'missing-snapshot', 'unreadable-snapshot', 'false-paint-pass', 'stale-source', 'missing-case', 'missing-browser', 'missing-build', 'missing-server', 'missing-browser-log', 'missing-axe', 'missing-screenshot', 'missing-fixture', 'wrong-reproduce', 'concealed-console', 'concealed-request', 'one-cell-waiver'] as const) {
      const changed = structuredClone(fixture);
      if (fault === 'stale-source') changed.source.head = 'c'.repeat(40);
      if (fault === 'missing-case') changed.executed.pop();
      if (fault === 'one-cell-waiver') { changed.selectedCase = changed.expected[0]; changed.expected = [changed.selectedCase!]; changed.executed = [...changed.expected]; changed.cases = changed.cases.slice(0, 1); }
      const script = `
        const fs = require('node:fs'), path = require('node:path');
        const output = process.argv.at(-1), report = ${JSON.stringify(changed)};
        fs.mkdirSync(output, { recursive: true });
        const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map(part => [part, { backgroundColor: 'fixture-paint', color: 'fixture-text' }]));
        const variables = Object.fromEntries(${JSON.stringify(Object.keys(resolveDraft(stockDraft()).light))}.map(name => [name, { expected: 'fixture-value', actual: 'fixture-value' }]));
        for (const row of report.cases) {
          row.snapshot = row.id.split('/').at(-1) + '.json';
          const snapshot = { id: row.id, expected: paint, actual: structuredClone(paint), variables, failures: [] };
          ${browserFixture}
          const fault = ${JSON.stringify(fault)};
          if (fault === 'missing-browser') delete snapshot.browser;
          if (fault === 'missing-fixture') snapshot.fixture = 'missing-fixture';
          if (fault === 'wrong-reproduce') snapshot.reproduce = 'node scripts/consumer-proof.ts';
          for (const kind of ['build', 'server', 'browser', 'axe', 'screenshot']) if (fault === 'missing-' + (kind === 'browser' ? 'browser-log' : kind)) snapshot.artifacts[kind] = 'missing-file';
          if (fault === 'concealed-console') fs.writeFileSync(path.join(output, snapshot.artifacts.browser), JSON.stringify({ console: [{type: 'error', text: 'React failure'}], pageErrors: [], failedRequests: [] }));
          if (fault === 'concealed-request') fs.writeFileSync(path.join(output, snapshot.artifacts.browser), JSON.stringify({ console: [], pageErrors: [], failedRequests: [{status: 500}] }));
          if (${JSON.stringify(fault)} === 'false-paint-pass') snapshot.actual.control.color = 'losing-paint';
          if (${JSON.stringify(fault)} !== 'missing-snapshot') fs.writeFileSync(path.join(output, row.snapshot), ${JSON.stringify(fault)} === 'unreadable-snapshot' ? 'not json' : JSON.stringify(snapshot));
        }
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report));
      `;
      const context = contextFor(work, process.cwd(), planned('consumer-proof', { argv: ['node', '-e', script, '--'] }), { identity });
      const result = await ADAPTERS['consumer-proof']!.run(context);
      assert.equal(result.verdict, fault === 'none' ? 'passed' : 'incomplete', result.reason ?? 'no reason');
      if (fault === 'none') assert.equal(result.executed.length, CONSUMER_CASES.length);
      if (fault === 'stale-source') assert.match(result.reason ?? '', /captured source identity/);
    }
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('consumer adapter reports a cell whose scene threw as a validation failure, not missing evidence', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-proof-adapter-'));
  try {
    const fixture = report();
    fixture.status = 'failed';
    fixture.cases[0] = { ...fixture.cases[0]!, status: 'failed', failures: ['locator.waitFor: Timeout 5000ms exceeded'] };
    const identity = { ...IDENTITY, head: fixture.source.head, manifest: fixture.source.manifest };
    for (const fault of ['none', 'before-scene', 'partial-inventory'] as const) {
      const script = `
        const fs = require('node:fs'), path = require('node:path');
        const output = process.argv.at(-1), report = ${JSON.stringify(fixture)};
        fs.mkdirSync(output, { recursive: true });
        const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map(part => [part, { backgroundColor: 'fixture-paint', color: 'fixture-text' }]));
        const variables = Object.fromEntries(${JSON.stringify(Object.keys(resolveDraft(stockDraft()).light))}.map(name => [name, { expected: 'fixture-value', actual: 'fixture-value' }]));
        for (const row of report.cases) {
          row.snapshot = row.id.split('/').at(-1) + '.json';
          const snapshot = { id: row.id, expected: paint, actual: structuredClone(paint), variables, failures: [] };
          ${browserFixture}
          if (row.status === 'failed') {
            Object.assign(snapshot, { actual: null, incomplete: true, failures: row.failures });
            snapshot.browser = { assertions: ${JSON.stringify(BROWSER_ASSERTIONS)}.map((name, index) => index < 3 ? { name, expected: true, actual: true, status: 'passed' } : { name, expected: 'reached', actual: null, status: 'failed', error: 'not reached' }), axe: {}, modeSnapshots: [], failures: row.failures };
            if (${JSON.stringify(fault)} === 'partial-inventory') snapshot.browser.assertions = snapshot.browser.assertions.slice(0, 3);
            fs.writeFileSync(path.join(output, snapshot.artifacts.axe), JSON.stringify(snapshot.browser.axe));
            if (${JSON.stringify(fault)} === 'before-scene') delete snapshot.browser;
          }
          fs.writeFileSync(path.join(output, row.snapshot), JSON.stringify(snapshot));
        }
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report));
        process.exitCode = 1;
      `;
      const context = contextFor(work, process.cwd(), planned('consumer-proof', { argv: ['node', '-e', script, '--'] }), { identity });
      const result = await ADAPTERS['consumer-proof']!.run(context);
      assert.equal(result.verdict, fault === 'none' ? 'validation-failure' : 'incomplete', `${fault}: ${result.reason ?? 'no reason'}`);
      if (fault === 'none') assert.ok(result.failures?.some((failure) => failure.includes('Timeout 5000ms exceeded')));
    }
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('Next adapters require SSR HTML, completed hydration and token-derived extraction in every mode', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-next-adapter-'));
  try {
    for (const layout of ['next-app', 'next-src'] as const) for (const fault of ['none', 'missing-html', 'missing-hydration', 'hydration-drift', 'missing-extraction', 'false-extraction-pass', 'wrong-layout'] as const) {
      const fixture = report();
      fixture.layout = fault === 'wrong-layout' ? 'vite' : layout;
      fixture.expected = consumerCases(fixture.layout);
      fixture.executed = [...fixture.expected];
      fixture.cases = fixture.expected.map((id) => ({ id, status: 'passed', snapshot: 'values.json', failures: [] }));
      const script = `
        const fs = require('node:fs'), path = require('node:path');
        const output = process.argv.at(-1), report = ${JSON.stringify(fixture)}, fault = ${JSON.stringify(fault)};
        fs.mkdirSync(output, { recursive: true });
        const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map(part => [part, { backgroundColor: 'paint', color: 'text' }]));
        const variables = Object.fromEntries(${JSON.stringify(Object.keys(resolveDraft(stockDraft()).light))}.map(name => [name, { expected: 'value', actual: 'value' }]));
        for (const row of report.cases) {
          const mode = row.id.endsWith('-dark') ? 'dark' : 'light', explicit = row.id.includes('/explicit-');
          const state = { attributes: { 'data-theme': explicit ? mode : null, 'data-proof-mode': explicit ? mode : 'system' }, content: 'Installed scene' };
          row.snapshot = row.id.split('/').at(-1) + '.values.json';
          const snapshot = { id: row.id, expected: paint, actual: paint, variables, failures: [], extraction: { expected: { height: '40px', radius: '4px', display: 'inline-flex' }, actual: { height: '40px', radius: '4px', display: 'inline-flex' } }, hydration: { server: state, hydrated: structuredClone(state), ready: true, errors: [] } };
          ${browserFixture}
          if (fault === 'missing-hydration') delete snapshot.hydration;
          if (fault === 'hydration-drift') snapshot.hydration.hydrated.attributes['data-theme'] = 'wrong';
          if (fault === 'missing-extraction') delete snapshot.extraction;
          if (fault === 'false-extraction-pass') snapshot.extraction.actual.height = '0px';
          if (fault !== 'missing-html') fs.writeFileSync(path.join(output, row.id.split('/').at(-1) + '.server.html'), '<html><main>Installed scene</main></html>');
          fs.writeFileSync(path.join(output, row.snapshot), JSON.stringify(snapshot));
        }
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report));
      `;
      const id = layout === 'next-app' ? 'consumer-proof-next-app' : 'consumer-proof-next-src';
      const context = contextFor(work, process.cwd(), planned(id, { argv: ['node', '-e', script, '--', '--layout', layout] }), { identity: { ...IDENTITY, head: fixture.source.head, manifest: fixture.source.manifest } });
      const result = await ADAPTERS[id]!.run(context);
      assert.equal(result.verdict, fault === 'none' ? 'passed' : 'incomplete', `${layout} ${fault}: ${result.reason}`);
      if (fault === 'none') assert.equal(result.executed.length, 4);
    }
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('delivery adapters reject missing group, portal and CLI evidence rather than accepting an exit-zero summary', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-delivery-adapter-'));
  const unsupported = setupItems['setup-vite'].handSteps.filter((step) => step.unverifiable)
    .map((step) => ({ step: step.prose, reason: step.unverifiable }));
  try {
    for (const path of ['stylex-subtree', 'registry', 'cli'] as const) for (const fault of ['none', 'missing-group', 'missing-portal', 'missing-extraction', 'wrong-path', 'missing-cli-report', 'css-drift'] as const) {
      if (fault === 'missing-cli-report' && path !== 'cli') continue;
      if (fault === 'css-drift' && path !== 'registry') continue;
      const fixture = report();
      fixture.deliveryPath = path;
      fixture.expected = consumerCases('vite', path);
      fixture.executed = [...fixture.expected];
      fixture.cases = fixture.expected.map((id) => ({ id, status: 'passed', snapshot: `${id.split('/').at(-1)}.values.json`, failures: [] }));
      fixture.drafts = Object.fromEntries(THEME_PRESETS.map((preset) => [preset.id, { digest: 'b'.repeat(64), fingerprint: 'fixture', recipeVersion: 2 }]));
      fixture.cliReports = { doctor: 'doctor.json', check: 'check.json' };
      const draft = proofDraft();
      const script = `
        const fs = require('node:fs'), path = require('node:path');
        const output = process.argv.at(-1), report = ${JSON.stringify(fixture)}, fault = ${JSON.stringify(fault)};
        fs.mkdirSync(output, { recursive: true });
        const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map(part => [part, { backgroundColor: 'paint', color: 'text' }]));
        const variables = Object.fromEntries(${JSON.stringify(Object.keys(resolveDraft(draft).dark))}.map(name => [name, { expected: 'value', actual: 'value' }]));
        for (const row of report.cases) {
          const name = row.id.split('/').at(-1).replace(/(?:system|explicit)-(?:dark|light)$/, '').replace(/-$/, '');
          fs.mkdirSync(path.join(output, name), { recursive: true });
          fs.writeFileSync(path.join(output, name, 'ultima-theme.json'), ${JSON.stringify(serializeDraft(draft))});
          const extracted = { height: '40px', radius: '4px', display: 'inline-flex' };
          const snapshot = { id: row.id, deliveryPath: report.deliveryPath, expected: paint, actual: structuredClone(paint), variables, controlVariables: structuredClone(variables), portalVariables: structuredClone(variables), portal: { inContainer: true, documentSurface: 'stock', subtreeSurface: 'draft' }, extraction: { tokens: { height: '2.5rem', radius: '4px' }, expected: extracted, actual: extracted }, failures: [] };
          ${browserFixture}
          if (fault === 'missing-group') delete snapshot.controlVariables['--ult-font-weight-medium'];
          if (fault === 'missing-portal') delete snapshot.portalVariables;
          if (fault === 'missing-extraction') delete snapshot.extraction;
          if (fault === 'css-drift' && name === '') snapshot.controlVariables['--ult-font-weight-medium'] = { expected: 'drift', actual: 'drift' };
          fs.writeFileSync(path.join(output, row.snapshot), JSON.stringify(snapshot));
        }
        fs.writeFileSync(path.join(output, 'doctor.json'), JSON.stringify({ command: 'doctor', target: 'vite', diagnostics: [], unsupported: ${JSON.stringify(unsupported)} }));
        if (fault !== 'missing-cli-report') fs.writeFileSync(path.join(output, 'check.json'), JSON.stringify({ command: 'check', status: 'clean', counts: { errors: 0, incomplete: 0 }, scopes: [{kind: 'app', files: 3}], rules: ${JSON.stringify(CONSUMER_RULES.map((id) => ({ id, status: 'blocking' })))}, diagnostics: [], unsupported: [] }));
        if (fault === 'wrong-path') report.deliveryPath = 'css';
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report));
      `;
      const context = contextFor(work, process.cwd(), planned(`consumer-proof-${path}`, { argv: ['node', '-e', script, '--', '--delivery-path', path] }), { identity: { ...IDENTITY, head: fixture.source.head, manifest: fixture.source.manifest } });
      const result = await ADAPTERS[`consumer-proof-${path}`]!.run(context);
      assert.equal(result.verdict, fault === 'none' ? 'passed' : 'incomplete', `${path} ${fault}: ${result.reason}`);
    }
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('selected registry adapter validates CSS and stock prerequisites, provenance and exact reproduction', async () => {
  const work = await mkdtemp(join(tmpdir(), 'ultima-selected-registry-'));
  try {
    const draft = proofDraft(), installed = serializeDraft(draft);
    const selected = `vite/registry/chromium/${THEME_PRESETS[0]!.id}-explicit-dark`;
    for (const fault of ['none', 'missing-reference', 'reference-drift', 'missing-stock', 'missing-selected-draft', 'wrong-selected-digest', 'hidden-warning', 'wrong-layout', 'wrong-path', 'missing-argv', 'wrong-fault', 'omitted-dynamic-token', 'malformed-modal-check'] as const) {
      const fixture = report();
      fixture.deliveryPath = 'registry';
      fixture.selectedCase = selected;
      fixture.expected = [selected];
      fixture.executed = [selected];
      fixture.cases = [{ id: selected, status: 'passed', snapshot: `${selected.split('/').at(-1)}.values.json`, failures: [] }];
      fixture.prerequisites = consumerPrerequisites('vite', 'registry', selected).map((id) => ({ id, status: 'passed', snapshot: `${id.split('/').at(-1)}.values.json`, failures: [] }));
      fixture.source.draftDigest = createHash('sha256').update(installed).digest('hex');
      fixture.source.draftFingerprint = draftFingerprint(draft);
      fixture.source.recipeVersion = draft.recipeVersion;
      fixture.drafts = Object.fromEntries(['css-reference', 'non-stock', THEME_PRESETS[0]!.id].map((name) => [name, { digest: fixture.source.draftDigest!, fingerprint: fixture.source.draftFingerprint, recipeVersion: draft.recipeVersion }]));
      const script = `
        const fs = require('node:fs'), path = require('node:path');
        const output = process.argv.at(-1), report = ${JSON.stringify(fixture)}, fault = ${JSON.stringify(fault)};
        fs.mkdirSync(output, { recursive: true });
        const paint = Object.fromEntries(['root', 'control', 'status', 'portal'].map(part => [part, { backgroundColor: 'paint', color: 'text' }]));
        const variables = Object.fromEntries(${JSON.stringify(Object.keys(resolveDraft(draft).dark))}.map(name => [name, { expected: 'value', actual: 'value' }]));
        for (const row of [...report.prerequisites, ...report.cases]) {
          const name = row.id.split('/').at(-1).replace(/(?:system|explicit)-(?:dark|light)$/, '').replace(/-$/, '');
          fs.mkdirSync(path.join(output, name), { recursive: true });
          if (fault !== 'missing-selected-draft' || row.id !== report.selectedCase) fs.writeFileSync(path.join(output, name, 'ultima-theme.json'), ${JSON.stringify(installed)});
          const extracted = { height: '40px', radius: '4px', display: 'inline-flex' };
          const snapshot = { id: row.id, deliveryPath: report.deliveryPath, expected: paint, actual: structuredClone(paint), variables: structuredClone(variables), controlVariables: structuredClone(variables), portalVariables: structuredClone(variables), portal: { inContainer: true, documentSurface: 'stock', subtreeSurface: 'draft' }, extraction: { tokens: { height: '2.5rem', radius: '4px' }, expected: extracted, actual: extracted }, failures: [] };
          ${browserFixture}
          if (fault === 'omitted-dynamic-token') {
            const dynamic = snapshot.browser.modeSnapshots[0];
            dynamic.variables = structuredClone(dynamic.variables);
            dynamic.portalVariables = structuredClone(dynamic.portalVariables);
            dynamic.portalVariables['--ult-color-surface'].actual = 'concealed mismatch';
            delete dynamic.variables['--ult-color-surface'];
          }
          if (fault === 'malformed-modal-check') {
            snapshot.browser.axe.open.incomplete = [{ id: 'aria-hidden-focus', nodes: [{ any: '', none: '', all: [{ id: 'focusable-modal-open', relatedNodes: [{ html: '<button hidden />', target: ['background'] }] }] }] }];
            const inventory = [{ role: 'button', name: 'Confirm theme' }];
            snapshot.browser.axe.open.focusCycle = { relatedNodes: 1, inventory, steps: ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab'].map(key => ({ key, inside: true, accessible: true, position: 0, item: inventory[0] })) };
          }
          fs.writeFileSync(path.join(output, snapshot.artifacts.axe), JSON.stringify(snapshot.browser.axe));
          if (fault === 'reference-drift' && name === 'css-reference') snapshot.variables['--ult-color-text'] = { expected: 'drift', actual: 'drift' };
          if (fault === 'hidden-warning' && row.id === report.selectedCase) fs.writeFileSync(path.join(output, snapshot.artifacts.browser), JSON.stringify({ console: [{ type: 'warning', text: 'Hydration did not match' }], pageErrors: [], failedRequests: [] }));
          if (fault === 'wrong-layout') snapshot.reproduceArgv[4] = 'next-app';
          if (fault === 'wrong-path') snapshot.reproduceArgv[6] = 'css';
          if (fault === 'wrong-fault') snapshot.reproduceArgv.splice(-2, 0, '--fault', 'focus-return');
          if (fault === 'missing-argv') delete snapshot.reproduceArgv;
          if (fault === 'wrong-layout' || fault === 'wrong-path' || fault === 'wrong-fault') snapshot.reproduce = snapshot.reproduceArgv.join(' ');
          fs.writeFileSync(path.join(output, snapshot.artifacts.reproduce), snapshot.reproduce + '\\n');
          fs.writeFileSync(path.join(output, row.snapshot), JSON.stringify(snapshot));
        }
        if (fault === 'missing-reference') report.prerequisites.shift();
        if (fault === 'missing-stock') report.prerequisites.pop();
        if (fault === 'wrong-selected-digest') report.source.draftDigest = 'b'.repeat(64);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report));
      `;
      const context = contextFor(work, process.cwd(), planned('consumer-proof-registry', { argv: ['node', '-e', script, '--', '--layout', 'vite', '--delivery-path', 'registry', '--case', selected] }), { identity: { ...IDENTITY, head: fixture.source.head, manifest: fixture.source.manifest } });
      const result = await ADAPTERS['consumer-proof-registry']!.run(context);
      assert.equal(result.verdict, fault === 'none' ? 'passed' : 'incomplete', `${fault}: ${result.reason}`);
      if (fault === 'none') assert.deepEqual(result.executed, [selected]);
    }
  } finally { await rm(work, { recursive: true, force: true }); }
});
