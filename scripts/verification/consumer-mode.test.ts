import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { modeSnapshotProblems } from '../consumer-mode.ts';
import { consumerReportProblems, modeCases } from '../consumer-report.ts';

test('React server rendering uses the exact neutral snapshot without reading browser globals', async () => {
  const require = createRequire(resolve('packages/ui/package.json'));
  const source = readFileSync(resolve('packages/ui/src/theme-mode.tsx'), 'utf8').replace("from 'react'", `from '${pathToFileURL(require.resolve('react'))}'`);
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { useThemeMode, ThemeModeScript, themeModeScript } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
  const { createElement } = require('react');
  const { renderToString } = require('react-dom/server');
  function Probe() { const { mode, resolved } = useThemeMode(); return createElement('output', null, JSON.stringify({ mode, resolved })); }
  assert.equal(renderToString(createElement(Probe)), '<output>{&quot;mode&quot;:&quot;system&quot;,&quot;resolved&quot;:null}</output>');
  assert.equal(renderToString(createElement(ThemeModeScript, { storageKey: 'custom', nonce: 'n' })), `<script nonce="n">${themeModeScript('custom')}</script>`);
});

test('theme-mode requires eight first-paint cases per layout and cannot satisfy a legacy delivery gate', () => {
  for (const layout of ['vite', 'next-app', 'next-src'] as const) {
    assert.equal(modeCases(layout).length, 8);
    const report = { exercise: 'theme-mode', layout, expected: modeCases(layout), executed: modeCases(layout), cases: modeCases(layout).map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })), installedItems: ['theme-mode', 'popover'] };
    assert.ok(!consumerReportProblems(report).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, exercise: undefined }).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, installedItems: [] }).includes('theme-mode installed source inventory is incomplete'));
  }
});

test('mode snapshots reject fabricated first paint, lost tokens, lifecycle, SSR and hydration errors', () => {
  const state = (mode: string, attribute: string | null) => ({ mode, attribute, resolved: mode, colorScheme: mode, extraction: { display: 'inline-flex' }, variables: Object.fromEntries(['root', 'control', 'popup'].map((part) => [part, Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i, { expected: 'value', actual: 'value' }]))])) });
  const snapshot = { id: modeCases('next-app')[0], expectedMode: 'light', firstPaint: { attribute: 'light', scheme: 'light', hydrated: false }, serverHtml: 'light-dark.server.html', serverSnapshot: { mode: 'system', resolved: 'pending' }, transitions: [state('light', 'light'), state('light', 'light'), state('dark', 'dark'), state('dark', null), state('light', null), state('dark', 'dark')], crossTab: true, errors: [], failures: [] };
  assert.deepEqual(modeSnapshotProblems(snapshot, true), []);
  for (const fault of [
    (s: typeof snapshot) => { s.firstPaint.hydrated = true; },
    (s: typeof snapshot) => { s.firstPaint.attribute = 'dark'; },
    (s: typeof snapshot) => { s.transitions[0]!.variables.popup![0]!.actual = 'wrong'; },
    (s: typeof snapshot) => { s.transitions[3]!.attribute = 'system'; },
    (s: typeof snapshot) => { s.transitions.pop(); },
    (s: typeof snapshot) => { s.crossTab = false; },
    (s: typeof snapshot) => { s.serverSnapshot.resolved = 'dark'; },
    (s: typeof snapshot) => { (s.errors as string[]).push('Hydration failed'); },
  ]) {
    const mutated = structuredClone(snapshot);
    fault(mutated);
    assert.ok(modeSnapshotProblems(mutated, true).length);
  }
  for (const malformed of [null, {}, { transitions: [null] }]) assert.ok(modeSnapshotProblems(malformed).length);
});
