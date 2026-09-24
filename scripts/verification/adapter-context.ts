/**
 * Test tooling for the adapter suites: a planned check and an adapter context over a fixture source
 * without a run, so an adapter runs its real command against fixture files. Never a check adapter.
 */
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';

import { type CheckId, check } from './checks.ts';
import type { PlannedCheck } from './plan.ts';
import { launch, ownerToken } from './process.ts';
import { type AdapterContext, childEnvironment } from './run.ts';
import { EXCLUSIONS, MANIFEST_VERSION, type SourceIdentity } from './source.ts';

export function planned(id: CheckId, changes: Partial<PlannedCheck> = {}): PlannedCheck {
  const definition = check(id);
  return {
    id,
    title: definition.title,
    status: 'planned',
    adapter: definition.adapter,
    argv: definition.argv,
    cwd: definition.cwd,
    nested: definition.nested,
    prerequisites: [],
    after: [],
    locks: definition.locks,
    needs: definition.needs,
    deadlineSeconds: definition.deadlineSeconds,
    scope: 'whole',
    reasons: ['chosen by the test'],
    files: [],
    cases: [],
    ...changes,
  };
}

/** A snapshot identity for adapter tests that run without a capture. */
export const IDENTITY: SourceIdentity = {
  head: null,
  index: { algorithm: 'sha256', digest: '0'.repeat(64), entries: 0 },
  status: [],
  submodules: [],
  manifest: { version: MANIFEST_VERSION, algorithm: 'sha256', digest: 'a'.repeat(64), files: 0, bytes: 0 },
  exclusions: EXCLUSIONS,
  requiredIgnoredInputs: [],
};

/** An adapter context over `source` without a run: the adapter's own launch, log and evidence paths. */
export function contextFor(
  scratch: string,
  source: string,
  entry: PlannedCheck,
  options: { identity?: SourceIdentity; env?: Record<string, string> } = {},
): AdapterContext {
  const identity = options.identity ?? IDENTITY;
  const run = mkdtempSync(join(scratch, 'run-'));
  const artifacts = join(run, 'artifacts');
  const logs = join(run, 'logs');
  mkdirSync(artifacts);
  mkdirSync(logs);
  const log = join(logs, `${entry.id}.log`);
  const env = { ...childEnvironment('adapter-test', source, mkdtempSync(join(scratch, 'tmp-'))), ...options.env };
  const token = ownerToken('adapter-test');
  const signal = new AbortController().signal;
  return {
    runId: 'adapter-test',
    check: entry,
    source,
    run,
    identity,
    artifacts,
    logs,
    log,
    env,
    signal,
    remainingMs: () => entry.deadlineSeconds * 1000,
    launch: (argv, options = {}) =>
      launch({
        argv,
        cwd: join(source, options.cwd ?? entry.cwd),
        env: { ...env, ...options.env },
        log,
        ...(options.stdout ? { stdout: options.stdout } : {}),
        token,
        deadlineMs: entry.deadlineSeconds * 1000,
        signal,
        graceMs: 500,
      }),
    startServer: async () => ({ failure: 'no server in this test' }),
  };
}
