import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { scaffold, serveRegistry, packCli, type Run } from '../consumer-helpers.ts';
import { CONSUMER_CASES, consumerReportProblems, type ConsumerReport } from '../consumer-report.ts';
import { proofDraft } from '../consumer-proof.ts';
import { resolveDraft } from '../../packages/tokens/src/theme/draft.ts';
import { gate } from '../../packages/tokens/src/theme/gate.ts';
import { contextFor, planned, IDENTITY } from './adapter-context.ts';
import { ADAPTERS } from './adapters.ts';
import { manifestOf } from './source.ts';

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
