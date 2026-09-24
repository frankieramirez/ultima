// ULT-EXCEPTION-001: declaration-scoped exceptions with exact counts and authority links.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { EXCEPTIONS } from '../workspace.ts';
import { afterFirstLine, fixture, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const withDialog = afterFirstLine(source(SEPARATOR), "import { Dialog } from './dialog';");

function exceptionFindings(report: ReturnType<typeof run>) {
  return report.diagnostics
    .filter((diagnostic) => diagnostic.ruleId === 'ULT-EXCEPTION-001')
    .map((diagnostic) => ({ exception: diagnostic.exception, line: diagnostic.start.line, message: diagnostic.message }));
}

describe('ULT-EXCEPTION-001', () => {
  test('the repository needs no exception', () => {
    assert.match(source(EXCEPTIONS), /export default \[\] satisfies ArchitectureException\[\];/);
  });

  test('an exactly matched entry excepts its one site and nothing else', () => {
    const report = run({ [SEPARATOR]: withDialog, [EXCEPTIONS]: fixture('exceptions/valid.ts') });
    assert.equal(report.status, 'clean');
    assert.equal(report.counts.excepted, 1);
    assert.deepEqual(report.diagnostics, []);

    const second = afterFirstLine(withDialog, "import { Popover } from './popover';");
    const other = run({ [SEPARATOR]: second, [EXCEPTIONS]: fixture('exceptions/valid.ts') });
    assert.deepEqual(
      other.diagnostics.map((diagnostic) => [diagnostic.ruleId, diagnostic.target]),
      [['ULT-IMPORT-001', './popover']],
    );
  });

  test('the entry goes stale when its site is fixed', () => {
    const report = run({ [EXCEPTIONS]: fixture('exceptions/valid.ts') });
    assert.deepEqual(exceptionFindings(report), [
      { exception: 'separator-relative-dialog', line: 4, message: 'Exception "separator-relative-dialog" matches no site: it is stale.' },
    ]);
    assert.equal(report.status, 'violations');
  });

  test('rejects stale, broad, directory, miscounted, duplicate, unlinked, unexceptable and unknown-field entries', () => {
    const report = run({ [SEPARATOR]: withDialog, [EXCEPTIONS]: fixture('exceptions/invalid.ts') });
    const findings = exceptionFindings(report);
    const about = (id: string) => findings.filter((finding) => finding.exception === id).map((finding) => finding.message);
    assert.deepEqual(about('broad-glob'), ['Exception "broad-glob" is broad: it names a glob, a directory or a wildcard.']);
    assert.deepEqual(about('directory'), ['Exception "directory" names packages/ui/src, which is not a file.']);
    assert.deepEqual(about('duplicate'), ['Exception "duplicate" duplicates "wrong-count".']);
    assert.deepEqual(about('wrong-count'), ['Exception "wrong-count" matches 1 sites and expects 2.']);
    assert.deepEqual(about('missing-anchor'), ['Exception "missing-anchor" links docs/spec/ultima.md#no-such-heading, which does not exist.']);
    assert.match(about('not-a-spec-link')[0] ?? '', /is not docs\/spec\/<file>\.md#<anchor>/);
    assert.deepEqual(about('hides-incomplete'), ['"ULT-ANALYSIS-001" is not a rule an exception can name.']);
    assert.deepEqual(about('unknown-field'), ['Entry unknown-field has the unknown field "scope".']);
    const stale = about('stale');
    assert.ok(stale.includes('Exception "stale" matches no site: it is stale.'), stale.join('\n'));
    assert.ok(stale.includes('Exception id "stale" is declared twice.'), stale.join('\n'));
    // A miscounted entry excepts nothing: the site it names stays a violation.
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.ruleId === 'ULT-IMPORT-001' && diagnostic.target === './dialog'));
    assert.equal(report.counts.excepted, 0);
  });

  test('locates each finding at its entry in the exceptions file', () => {
    const report = run({ [SEPARATOR]: withDialog, [EXCEPTIONS]: fixture('exceptions/invalid.ts') });
    const lines = Object.fromEntries(exceptionFindings(report).map((finding) => [finding.exception, finding.line]));
    assert.equal(lines['broad-glob'], 14);
    assert.equal(lines.directory, 24);
    assert.ok(report.diagnostics.every((diagnostic) => diagnostic.ruleId !== 'ULT-EXCEPTION-001' || diagnostic.file === EXCEPTIONS));
  });

  test('rejects an exceptions file that is code rather than data', () => {
    const report = run({ [EXCEPTIONS]: fixture('exceptions/not-data.ts') });
    const findings = exceptionFindings(report);
    assert.ok(findings.length >= 1);
    assert.ok(findings.every((finding) => finding.message.startsWith('The exceptions file is not plain data')));
  });

  test('a missing exceptions file makes the run incomplete', () => {
    const report = run({ [EXCEPTIONS]: null });
    assert.equal(report.status, 'incomplete');
    assert.deepEqual(report.diagnostics.map((diagnostic) => [diagnostic.ruleId, diagnostic.file]), [['ULT-ANALYSIS-001', EXCEPTIONS]]);
  });
});
