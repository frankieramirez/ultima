import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { scaffold, serveRegistry, packCli, type Run } from '../consumer-helpers.ts';
import { CONSUMER_CASES, CONSUMER_LAYOUTS, consumerCases, consumerReportProblems, type ConsumerReport } from '../consumer-report.ts';
import { browserErrors, hydrationProblems, nextFault, nextScene, setupNext, type HydrationEvidence } from '../consumer-next.ts';
import { EventEmitter } from 'node:events';
import type { Page } from 'playwright';
import { baseStyleProblems, proofDraft, type BaseStyles } from '../consumer-proof.ts';
import { resolveDraft } from '../../packages/tokens/src/theme/draft.ts';
import { gate } from '../../packages/tokens/src/theme/gate.ts';
import { contextFor, planned, IDENTITY } from './adapter-context.ts';
import { ADAPTERS } from './adapters.ts';
import { manifestOf } from './source.ts';
import { themeProofProblems, themeSnapshot } from '../consumer-theme.ts';
import type { ThemeRow } from '../../packages/cli/src/doctor-theme.ts';

test('installed theme receipt requires complete linked CSS/document proof and retains tree contents', async () => {
  const row: Omit<ThemeRow, 'artifact'> = { family: 'theme', boundary: 'src/main.tsx', state: 'match', paths: { artifact: 'ultima-theme.css', draft: 'ultima-theme.json', imports: [] }, source: null, differences: [], reason: 'fixture', repair: 'fixture', coverage: { contentMatches: true, modes: ['dark', 'light'], groups: [], scopes: [], rendering: 'not-evaluated' } };
  const report: Parameters<typeof themeProofProblems>[0] = { theme: { schemaVersion: 1, rows: [{ ...row, artifact: 'css' }, { ...row, artifact: 'design' }] }, diagnostics: [] };
  assert.deepEqual(themeProofProblems(report), []);
  assert.ok(themeProofProblems({}).length);
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
      assert.equal(extraction.includes('app/**/*'), src);
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
  const errors = browserErrors(page as unknown as Page);
  page.emit('pageerror', new Error('uncaught React error'));
  page.emit('console', { type: () => 'warning', text: () => 'Hydration did not match' });
  page.emit('console', { type: () => 'error', text: () => 'React minified error #418' });
  page.emit('console', { type: () => 'log', text: () => 'ordinary message' });
  page.emit('requestfailed', { resourceType: () => 'script', url: () => '/required.js', failure: () => ({ errorText: 'connection reset' }) });
  page.emit('response', { status: () => 404, request: () => ({ resourceType: () => 'stylesheet' }), url: () => '/required.css' });
  assert.equal(errors.length, 5);
  assert.match(errors.join('\n'), /uncaught React error[\s\S]*Hydration did not match[\s\S]*#418[\s\S]*required asset failed[\s\S]*required asset HTTP 404/);
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
    for (const fault of ['none', 'missing-snapshot', 'unreadable-snapshot', 'false-paint-pass', 'stale-source', 'missing-case'] as const) {
      const changed = structuredClone(fixture);
      if (fault === 'stale-source') changed.source.head = 'c'.repeat(40);
      if (fault === 'missing-case') changed.executed.pop();
      const script = `
        const fs = require('node:fs'), path = require('node:path');
        const output = process.argv.at(-1), report = ${JSON.stringify(changed)};
        fs.mkdirSync(output, { recursive: true });
        const paint = Object.fromEntries(['root', 'control', 'status'].map(part => [part, { backgroundColor: 'fixture-paint', color: 'fixture-text' }]));
        const variables = Object.fromEntries(['surface', 'text', 'accent', 'accent-contrast', 'success', 'success-contrast'].map(name => ['--ult-color-' + name, { expected: 'fixture-value', actual: 'fixture-value' }]));
        for (const row of report.cases) {
          row.snapshot = row.id.split('/').at(-1) + '.json';
          const snapshot = { id: row.id, expected: paint, actual: structuredClone(paint), variables, failures: [] };
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
        const paint = Object.fromEntries(['root', 'control', 'status'].map(part => [part, { backgroundColor: 'paint', color: 'text' }]));
        const variables = Object.fromEntries(['surface', 'text', 'accent', 'accent-contrast', 'success', 'success-contrast'].map(name => ['--ult-color-' + name, { expected: 'value', actual: 'value' }]));
        for (const row of report.cases) {
          const mode = row.id.endsWith('-dark') ? 'dark' : 'light', explicit = row.id.includes('/explicit-');
          const state = { attributes: { 'data-theme': explicit ? mode : null, 'data-proof-mode': explicit ? mode : 'system' }, content: 'Installed scene' };
          row.snapshot = row.id.split('/').at(-1) + '.values.json';
          const snapshot = { id: row.id, expected: paint, actual: paint, variables, failures: [], extraction: { expected: { height: '40px', radius: '4px', display: 'inline-flex' }, actual: { height: '40px', radius: '4px', display: 'inline-flex' } }, hydration: { server: state, hydrated: structuredClone(state), ready: true, errors: [] } };
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
