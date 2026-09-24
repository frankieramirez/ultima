/**
 * The CI production gate (`apps/docs/scripts/production-gate.ts`), proved on reports that real
 * `test:production` runs leave behind: the lifecycle captures this checkout and plans its registered
 * cases, and stubbed adapters stand in for the build and the browser. A dropped or skipped cell, an
 * unavailable prerequisite, an absent or unreadable report, a foreign revision and missing evidence each
 * fail the gate, and only a run that executed every registered case passes it.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { gateProblems, main } from '../../apps/docs/scripts/production-gate.ts';
import { productionPlan, runStandalone } from '../../apps/docs/scripts/test-production.ts';
import type { Adapter, AdapterReport, Adapters, Report } from './run.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = mkdtempSync(join(tmpdir(), 'ultima-production-gate-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const NO_PREPARATION = { argv: [process.execPath, '-e', ''], deadlineSeconds: 30 };
const PRESENT = { chromium: async () => null, 'loopback-port': async () => null, network: async () => null, python3: async () => null };
const HEAD = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();

let registered: string[] = [];
before(() => {
  const planned = productionPlan(ROOT);
  assert.ok(!('failure' in planned), 'the checkout plans its production cases');
  registered = planned.checks.find((entry) => entry.id === 'production-scenarios')?.cases ?? [];
  assert.ok(registered.length >= 26, 'the whole matrix is registered');
});

/** An adapter that writes one evidence file and reports `report` over it. */
function stub(name: string, report: (expected: string[]) => Partial<AdapterReport>): Adapter {
  return {
    async run(context) {
      const file = `artifacts/${name}.txt`;
      mkdirSync(join(context.run, 'artifacts'), { recursive: true });
      writeFileSync(join(context.run, file), `${name}\n`);
      const expected = [...context.check.files.filter((entry) => entry.present).map((entry) => entry.path), ...context.check.cases];
      return { verdict: 'passed', process: null, executed: expected.length > 0 ? expected : ['build'], artifacts: [file], ...report(expected) };
    },
  };
}

const passing: Adapters = { 'docs-build': stub('docs-build', () => ({})), 'production-scenarios': stub('production', () => ({})) };

let count = 0;
async function run(adapters: Adapters, probes: Record<string, () => Promise<string | null>> = PRESENT): Promise<{ directory: string; report: Report }> {
  count += 1;
  const directory = join(scratch, `run-${count}`);
  const result = await runStandalone(['--output', directory], { root: ROOT, adapters, probes, preparation: NO_PREPARATION });
  assert.ok(result.report, 'the run wrote a report');
  return { directory, report: result.report };
}

describe('the production gate', () => {
  test('passes a run that executed every registered case against the tested revision', async () => {
    const { directory, report } = await run(passing);
    assert.equal(report.status, 'passed', report.summary);
    assert.deepEqual(gateProblems({ directory, head: HEAD }), []);
  });

  test('fails a dropped cell, even when the report was edited to claim a pass', async () => {
    const dropped = registered[0] as string;
    const adapters: Adapters = {
      ...passing,
      'production-scenarios': stub('production', (expected) => ({ executed: expected.filter((id) => id !== dropped) })),
    };
    const { directory, report } = await run(adapters);
    assert.notEqual(report.status, 'passed');
    assert.ok(gateProblems({ directory }).some((problem) => problem.includes(dropped)));

    // A report that lost the cell from both its plan and its execution, and says it passed.
    const path = join(directory, 'report.json');
    const forged = JSON.parse(readFileSync(path, 'utf8')) as Report;
    Object.assign(forged, { status: 'passed', exit: 0 });
    for (const entry of forged.checks) {
      if (entry.selection.scope === 'outside') continue;
      Object.assign(entry, { status: 'passed', failure: null, expected: entry.expected.filter((id) => id !== dropped) });
    }
    writeFileSync(path, JSON.stringify(forged));
    const problems = gateProblems({ directory });
    assert.ok(problems.some((problem) => problem.startsWith('the report did not plan 1 registered case(s)') && problem.includes(dropped)), problems.join('\n'));
    assert.ok(problems.some((problem) => problem.startsWith('the report did not execute 1 registered case(s)')), problems.join('\n'));
  });

  test('fails a skipped cell', async () => {
    const skipped = registered.at(-1) as string;
    const adapters: Adapters = {
      ...passing,
      'production-scenarios': stub('production', (expected) => ({ executed: expected.filter((id) => id !== skipped), skipped: [skipped] })),
    };
    const { directory, report } = await run(adapters);
    assert.notEqual(report.status, 'passed');
    const problems = gateProblems({ directory });
    assert.ok(problems.some((problem) => problem.includes(`skipped ${skipped}`)), problems.join('\n'));
  });

  test('fails an unavailable prerequisite', async () => {
    const { directory, report } = await run(passing, { ...PRESENT, chromium: async () => 'the locked Chromium is not installed' });
    assert.equal(report.status, 'incomplete');
    const problems = gateProblems({ directory });
    assert.ok(problems.some((problem) => problem.includes('prerequisite chromium was unavailable')), problems.join('\n'));
    assert.ok(problems.some((problem) => problem.includes('did not execute')), problems.join('\n'));
  });

  test('fails a proven case failure', async () => {
    const adapters: Adapters = {
      ...passing,
      'production-scenarios': stub('production', () => ({ verdict: 'validation-failure', failures: ['dialog focus did not return'] })),
    };
    const { directory, report } = await run(adapters);
    assert.equal(report.status, 'failed');
    assert.ok(gateProblems({ directory }).some((problem) => problem.startsWith('the run ended failed with exit 1')));
  });

  test('fails an absent, unreadable or foreign report', async () => {
    const absent = join(scratch, 'absent');
    mkdirSync(absent);
    assert.match(gateProblems({ directory: absent }).join(), /report\.json is absent/);

    writeFileSync(join(absent, 'report.json'), '{');
    assert.match(gateProblems({ directory: absent }).join(), /is not JSON/);

    writeFileSync(join(absent, 'report.json'), JSON.stringify({ kind: 'plan', schemaVersion: 1 }));
    assert.match(gateProblems({ directory: absent }).join(), /is not a verification-run report/);
  });

  test('fails a report of another revision or with evidence that is gone', async () => {
    const { directory } = await run(passing);
    assert.match(gateProblems({ directory, head: '0'.repeat(40) }).join(), /not 0{40}/);

    rmSync(join(directory, 'artifacts/production.txt'));
    assert.match(gateProblems({ directory }).join(), /names evidence that does not exist: artifacts\/production\.txt/);
  });

  test('exits 0 only on a pass, 1 on a failure and 2 on usage', async () => {
    const { directory } = await run(passing);
    const quiet = { write: process.stdout.write, error: process.stderr.write };
    process.stdout.write = () => true;
    process.stderr.write = () => true;
    try {
      assert.equal(main([directory, '--head', HEAD]), 0);
      assert.equal(main([join(scratch, 'nowhere')]), 1);
      assert.equal(main([]), 2);
      assert.equal(main([directory, '--head']), 2);
      assert.equal(main([directory, '--frobnicate']), 2);
    } finally {
      process.stdout.write = quiet.write;
      process.stderr.write = quiet.error;
    }
  });
});
