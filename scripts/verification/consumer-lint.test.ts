import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { LINT_FRAGMENT, LINT_INSTALL, LINT_PINS, LINT_RULES, MINIMAL_CONFIG, NEXT_IMPORT, combinationProblems, lintSnapshotProblems, lintVerdict, severity } from '../consumer-lint.ts';
import { LINT_CASES, consumerReportProblems, lintCases } from '../consumer-report.ts';
import { setupItems } from '../../registry/items.config.ts';
import setupNext from '../../registry/metadata/setup/setup-next.ts';
import setupVite from '../../registry/metadata/setup/setup-vite.ts';

const fragment = readFileSync(resolve(LINT_FRAGMENT), 'utf8');
const install = readFileSync(resolve('apps/docs/src/content/install.mdx'), 'utf8');
const tested = { eslint: '9.39.5', '@typescript-eslint/parser': '8.71.1', '@stylexjs/eslint-plugin': '0.19.1', '@stylexjs/stylex': '0.19.1' };
const probe = (path: string, validStyles: unknown = [2, { allowOuterPseudoAndMedia: true }]) => ({ path, ignored: false, parser: 'typescript-eslint/parser@8.71.1', rules: { '@stylexjs/valid-styles': validStyles } });

test('the hosted fragment registers the plugin with the supplied severities and nothing else', async () => {
  const stub = fragment.replace("import stylex from '@stylexjs/eslint-plugin';", 'const stylex = { stub: true };');
  assert.notEqual(stub, fragment, 'the fragment imports the official plugin');
  const { ultimaStylex } = await import(`data:text/javascript,${encodeURIComponent(stub)}`);
  assert.deepEqual(Object.keys(ultimaStylex.plugins), ['@stylexjs']);
  assert.deepEqual(ultimaStylex.files, ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}']);
  assert.deepEqual(Object.fromEntries(Object.entries(ultimaStylex.rules).map(([rule, value]) => [rule, severity(value)])), LINT_RULES);
  assert.deepEqual(ultimaStylex.rules['@stylexjs/valid-styles'][1], { allowOuterPseudoAndMedia: true });
  for (const [name, version] of Object.entries(LINT_PINS)) assert.ok(fragment.includes(`${name} ${version}`), `the fragment names the tested ${name}`);
});

test('the install walkthrough shows the exact fragment, config and pinned commands the runner uses', () => {
  assert.ok(install.includes('## StyleX lint'), 'the walkthrough section is #stylex-lint');
  assert.ok(install.includes(`\`\`\`js title="ultima.eslint.mjs"\n${fragment}\`\`\``), 'the walkthrough copies the hosted fragment byte for byte');
  assert.ok(install.includes(`\`\`\`js title="eslint.config.mjs"\n${MINIMAL_CONFIG}\`\`\``), 'the minimal config is the one the Vite fixture lints with');
  assert.ok(install.includes(`npm ${LINT_INSTALL.join(' ')}`), 'the walkthrough installs the tested combination');
  assert.ok(install.includes(`npm install -D --save-exact @stylexjs/eslint-plugin@${LINT_PINS['@stylexjs/eslint-plugin']}`), 'an existing config adds only the plugin');
  assert.ok(install.includes(`${NEXT_IMPORT}\n`) && install.includes('  ...nextTs,\n  ultimaStylex,\n'), 'the Next example appends the fragment after nextTs, as the Next fixtures do');
  assert.ok(install.includes('(/ultima.eslint.mjs)'), 'the walkthrough links the download');
  assert.ok(!/--max-warnings 0`?\s*\n/.test(install) && !install.includes('eslint . --fix'), 'supplied commands never fail on warnings or autofix');
});

test('both setup items link the fragment and recipe in a hand step and never claim doctor verifies it', () => {
  for (const id of ['setup-vite', 'setup-next'] as const) {
    const step = setupItems[id].handSteps.find((candidate) => candidate.prose.includes('ultima.eslint.mjs'));
    assert.ok(step, `${id} has a lint hand step`);
    assert.ok(step.prose.includes('https://ultima.systems/ultima.eslint.mjs') && step.prose.includes('https://ultima.systems/install#stylex-lint'));
    assert.ok(step.unverifiable && !('assertion' in step && step.assertion), `${id}'s lint step stays unverifiable: doctor reports static presence and never proves the effective config`);
    assert.ok(!(id === 'setup-vite' ? setupVite : setupNext).files.some((file) => /eslint/.test(file.path)), `${id} never writes an ESLint config`);
  }
});

test('the proof reads broken setups as incomplete or failed, never passed', () => {
  const required = [probe('src/App.tsx'), probe('src/components/ui/button.tsx')];
  assert.deepEqual(lintVerdict(0, required, tested), { verdict: 'passed', reasons: [] });
  assert.equal(lintVerdict(1, required, tested).verdict, 'failed');
  assert.equal(lintVerdict(2, required, tested).verdict, 'incomplete');
  assert.equal(lintVerdict(null, required, tested).verdict, 'incomplete');
  assert.match(lintVerdict(2, required, tested, 'Oops! Something went wrong! :(\n\nESLint: 9.39.5\n\nError: Cannot find package \'@stylexjs/eslint-plugin\'').reasons[0]!, /Cannot find package/);
  assert.equal(lintVerdict(0, [{ ...required[0]!, ignored: true }], tested).verdict, 'incomplete');
  assert.equal(lintVerdict(0, [{ ...required[0]!, parser: 'espree' }], tested).verdict, 'incomplete');
  assert.equal(lintVerdict(0, [probe('src/App.tsx', [0])], tested).verdict, 'failed');
  assert.equal(lintVerdict(0, [probe('src/App.tsx', 'warn')], tested).verdict, 'failed');
  assert.equal(lintVerdict(0, required, { ...tested, eslint: '10.12.0' }).verdict, 'incomplete');
  assert.equal(lintVerdict(0, required, { ...tested, eslint: '8.57.1' }).verdict, 'incomplete');
  assert.equal(lintVerdict(0, required, { ...tested, '@stylexjs/eslint-plugin': '0.18.3' }).verdict, 'incomplete');
  assert.equal(lintVerdict(0, required, { ...tested, '@stylexjs/eslint-plugin': null }).verdict, 'incomplete');
  assert.deepEqual(combinationProblems(tested), []);
});

test('a lint report needs every case, the full catalogue and its lint evidence, and cannot satisfy another gate', () => {
  for (const layout of ['vite', 'next-app', 'next-src'] as const) {
    const cases = lintCases(layout);
    assert.equal(cases.length, LINT_CASES.length);
    const lint = { fragment: { path: 'ultima.eslint.mjs', digest: 'a'.repeat(64) }, config: 'minimal', lintScript: null, network: 'node preload', versions: tested, files: ['src/App.tsx'] };
    const report = { exercise: 'lint', layout, deliveryPath: 'css', status: 'passed', expected: cases, executed: cases, cases: cases.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })), installedItems: ['button', 'sidebar', 'settings-01'], lint };
    const problems = consumerReportProblems(report);
    assert.ok(!problems.includes('consumer-proof case coverage is incomplete') && !problems.some((problem) => problem.startsWith('lint ')), problems.join('; '));
    assert.ok(consumerReportProblems({ ...report, executed: cases.slice(1) }).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, exercise: 'copy-bundles' }).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, installedItems: ['button'] }).includes('lint installed source inventory is incomplete'));
    assert.ok(consumerReportProblems({ ...report, lint: { ...lint, files: [] } }).includes('lint fragment, network, version or coverage evidence is missing'));
    assert.ok(consumerReportProblems({ ...report, lint: undefined }).includes('lint fragment, network, version or coverage evidence is missing'));
    assert.ok(consumerReportProblems({ ...report, deliveryPath: 'registry' }).includes('lint requires CSS delivery'));
  }
});

test('lint snapshots must agree with their case, keep every command log and run offline', () => {
  const id = lintCases('vite')[1]!;
  const row = { id, status: 'passed', failures: [] };
  const command = { argv: ['npx', '--no-install', 'eslint', '.'], cwd: '.', exit: 0, network: 'node preload', log: 'catalogue.0.log' };
  const exists = (log: string) => log === 'catalogue.0.log' || log === 'compile.0.log';
  assert.deepEqual(lintSnapshotProblems({ id, failures: [], commands: [command] }, row, exists), []);
  assert.ok(lintSnapshotProblems({ id, failures: ['hidden'], commands: [command] }, row, exists).length);
  assert.ok(lintSnapshotProblems({ id, failures: [], commands: [] }, row, exists).length);
  assert.ok(lintSnapshotProblems({ id, failures: [], commands: [{ ...command, log: 'missing.log' }] }, row, exists).length);
  assert.ok(lintSnapshotProblems({ id, failures: [], commands: [{ ...command, network: 'allowed' }] }, row, exists).length);
  const compile = lintCases('vite').at(-1)!;
  assert.deepEqual(lintSnapshotProblems({ id: compile, failures: [], commands: [{ ...command, network: 'allowed', log: 'compile.0.log' }] }, { ...row, id: compile }, exists), []);
  assert.ok(lintSnapshotProblems(null, row, exists).length);
});
