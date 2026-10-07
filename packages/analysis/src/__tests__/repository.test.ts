// The whole workspace: the delivered rules run clean and blocking, every source is classified, and
// the text and JSON outputs agree. docs/spec/agent-infrastructure.md, Proof and delivery requirements.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { loadCatalogue } from '../../../../scripts/catalogue/model.ts';
import { check } from '../check.ts';
import { exitCode, formatJson, formatText } from '../diagnostic.ts';
import { RULES } from '../rules.ts';
import { workspaceScope } from '../workspace.ts';
import { afterFirstLine, fixture, repository, root, run, source } from './support.ts';

const scope = workspaceScope(repository);
const report = check(scope);

describe('the repository', () => {
  test('passes every delivered rule with no finding, and each exception matches its one site', () => {
    assert.deepEqual(report.diagnostics, []);
    assert.equal(report.status, 'clean');
    assert.equal(report.counts.excepted, 38);
    assert.equal(exitCode(report), 0);
  });

  test('runs the delivered rules as blocking and lists the rest as unsupported', () => {
    const active = report.rules.filter((rule) => rule.status === 'blocking').map((rule) => rule.id);
    assert.deepEqual(active.sort(), [
      'ULT-ANALYSIS-001',
      'ULT-API-001',
      'ULT-API-002',
      'ULT-DOCS-001',
      'ULT-DOCS-002',
      'ULT-EXCEPTION-001',
      'ULT-IMPORT-001',
      'ULT-PRIMITIVE-001',
      'ULT-REGISTRY-001',
      'ULT-SOURCE-001',
      'ULT-STYLE-001',
      'ULT-TOKEN-001',
    ]);
    assert.deepEqual(report.rules.filter((rule) => rule.status === 'advisory').map((rule) => rule.id), ['ULT-DOCS-REVIEW-001']);
    for (const rule of report.rules.filter((entry) => entry.status === 'pending')) {
      assert.ok(report.unsupported.some((entry) => entry.step === rule.id), `${rule.id} is listed as unsupported`);
    }
    assert.equal(Object.keys(RULES).length, 13);
  });

  test('classifies every source file, with no unclassified production source', () => {
    assert.deepEqual(scope.unclassified, []);
    const count = (kind: string) => scope.inventory.filter((entry) => entry.kind === kind).length;
    const { catalogue } = loadCatalogue(repository);
    assert.equal(count('react-component'), catalogue.react.length);
    assert.equal(count('element'), catalogue.elements.length);
    for (const entry of catalogue.react) assert.equal(scope.kindOf(entry.source), 'react-component', entry.source);
    for (const entry of catalogue.elements) assert.equal(scope.kindOf(entry.source), 'element', entry.source);
    for (const bundle of catalogue.sourceBundles) {
      for (const path of bundle.sources) assert.equal(scope.kindOf(path), bundle.id === 'tokens' ? 'token-source' : 'react-helper', path);
    }
    assert.ok(count('content') > 0 && count('demo') > 0 && count('docs') > 0 && count('tooling') > 0);
  });

  test('keeps fixtures, tests and generated wiring out of production discovery', () => {
    const fixtures = scope.inventory.filter((entry) => entry.path.startsWith('packages/analysis/fixtures/'));
    assert.ok(fixtures.length > 0);
    assert.ok(fixtures.every((entry) => entry.kind === 'fixture'));
    assert.equal(scope.kindOf('packages/ui/src/__tests__/button.test.tsx'), 'test');
    assert.equal(scope.kindOf('packages/ui/src/index.ts'), 'generated');
    assert.equal(scope.kindOf('registry/items.config.ts'), 'generated');
    assert.equal(scope.kindOf('packages/elements/dist/ultima.js'), undefined);
  });

  test('is deterministic', () => {
    const changes = {
      'packages/ui/src/separator.tsx': afterFirstLine(source('packages/ui/src/separator.tsx'), "import { Dialog } from './dialog';"),
      'packages/ui/src/button.tsx': fixture('source/no-directive.tsx'),
    };
    assert.equal(formatJson(run(changes)), formatJson(run(changes)));
    assert.equal(formatJson(report), formatJson(check(workspaceScope(repository))));
  });
});

describe('the output', () => {
  const failing = run({
    'packages/ui/src/separator.tsx': fixture('imports/computed-imports.tsx'),
    'packages/ui/src/parts/extra.tsx': 'export {};\n',
  });

  test('text and JSON carry the same diagnostics', () => {
    const json = JSON.parse(formatJson(failing));
    const text = formatText(failing);
    assert.equal(json.diagnostics.length, 4);
    for (const diagnostic of json.diagnostics) {
      const { file, start, end, severity, ruleId, message, repair, link } = diagnostic;
      assert.ok(text.includes(`${file}:${start.line}:${start.column}-${end.line}:${end.column}  ${severity}  ${ruleId}`), `${ruleId} at ${file}`);
      assert.ok(text.includes(message) && text.includes(`Repair: ${repair}`) && text.includes(`Spec: ${link}`));
    }
    const { blocking, incomplete, advisory, excepted } = json.counts;
    assert.ok(text.includes(`${blocking} blocking, ${incomplete} incomplete, ${advisory} advisory, ${excepted} excepted.`));
  });

  test('JSON is versioned and names its run status, scopes and counts', () => {
    const json = JSON.parse(formatJson(failing));
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.status, 'violations');
    assert.deepEqual(json.counts, { blocking: 2, advisory: 0, incomplete: 2, excepted: 38 });
    assert.ok(json.scopes.some((entry: { kind: string }) => entry.kind === 'react-component'));
    for (const diagnostic of json.diagnostics) {
      for (const field of ['ruleId', 'severity', 'file', 'start', 'end', 'message', 'repair', 'link']) assert.ok(field in diagnostic, field);
    }
  });

  test('sorts by file, position and rule', () => {
    const keys = failing.diagnostics.map((diagnostic) => [diagnostic.file, diagnostic.start.line, diagnostic.start.column]);
    assert.deepEqual(keys, [
      ['packages/ui/src/parts/extra.tsx', 1, 1],
      ['packages/ui/src/separator.tsx', 9, 25],
      ['packages/ui/src/separator.tsx', 10, 26],
      ['packages/ui/src/separator.tsx', 11, 18],
    ]);
  });

  test('a clean run does not claim verification it did not perform', () => {
    assert.match(formatText(report), /not accessibility, performance, visual or interaction verification/);
  });
});

describe('pnpm check:architecture', () => {
  const command = (...args: string[]) =>
    spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/check-architecture.ts'), ...args], { encoding: 'utf8' });

  test('exits 0 on the repository and prints the versioned JSON report', () => {
    const result = command('--format', 'json');
    assert.equal(result.status, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.status, 'clean');
    assert.deepEqual(json.diagnostics, []);
  });

  test('defaults to text', () => {
    const result = command();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^check:architecture {2}clean/);
  });

  test('exits 2 on an invalid invocation', () => {
    for (const args of [['--format', 'yaml'], ['--bogus'], ['extra']]) {
      const result = command(...args);
      assert.equal(result.status, 2, args.join(' '));
      assert.match(result.stderr, /Usage: pnpm check:architecture/);
    }
  });
});
