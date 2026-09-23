import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  compareSeries,
  median,
  medianAbsoluteDeviation,
  nearestRank,
  summarizeCommand,
  summarizeInteraction,
  type Conditions,
  type Sample,
  type Series,
} from './protocol.ts';

const conditions: Conditions = {
  workload: 'dialog-edit',
  workloadVersion: 1,
  cache: 'warm',
  runnerClass: 'local-i7-12700F',
  harnessHash: 'h1',
  fixtureHash: null,
};

function samples(values: (number | Omit<Sample, 'runId' | 'order' | 'startedAt'>)[]): Sample[] {
  return values.map((value, order) => ({
    runId: `r${order}`,
    order,
    startedAt: '2026-09-23T00:00:00.000Z',
    ...(typeof value === 'number' ? { elapsedMs: value, status: 'valid' as const } : value),
  }));
}

const series = (values: Parameters<typeof samples>[0], over: Partial<Conditions> = {}): Series => ({
  conditions: { ...conditions, ...over },
  samples: samples(values),
});

test('median, MAD and nearest-rank p95 follow their definitions', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(medianAbsoluteDeviation([1, 2, 3, 4, 100]), 1);
  const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(nearestRank(twenty, 95), 19);
  assert.equal(nearestRank([7], 95), 7);
});

test('five valid runs summarize to median, range and MAD', () => {
  const summary = summarizeCommand(series([100, 110, 90, 105, 95]));
  assert.deepEqual(summary, {
    status: 'measured',
    required: 5,
    valid: 5,
    failed: 0,
    excluded: 0,
    medianMs: 100,
    minMs: 90,
    maxMs: 110,
    madMs: 5,
  });
});

test('a failed run never becomes a fast valid sample', () => {
  const summary = summarizeCommand(
    series([100, 110, { elapsedMs: 3, status: 'failed', reason: 'exit 1' }, 105, 95]),
  );
  assert.equal(summary.status, 'incomplete');
  assert.equal(summary.valid, 4);
  assert.equal(summary.failed, 1);
  assert.equal(summary.medianMs, null);
});

test('a documented exclusion is retained and needs a replacement', () => {
  const summary = summarizeCommand(
    series([100, { elapsedMs: 900, status: 'excluded', reason: 'port collision in harness' }, 110, 90, 105]),
  );
  assert.equal(summary.status, 'incomplete');
  assert.equal(summary.excluded, 1);
  const replaced = summarizeCommand(
    series([100, { elapsedMs: 900, status: 'excluded', reason: 'port collision in harness' }, 110, 90, 105, 95]),
  );
  assert.equal(replaced.status, 'measured');
  assert.equal(replaced.medianMs, 100);
});

test('an exclusion or failure without a reason is rejected', () => {
  assert.throws(() => summarizeCommand(series([100, { elapsedMs: 1, status: 'excluded' }])), /carries no reason/);
  assert.throws(() => summarizeCommand(series([100, { elapsedMs: null, status: 'valid' }])), /no usable elapsed/);
});

test('a missing baseline or candidate is unavailable, never a pass', () => {
  assert.deepEqual(compareSeries(undefined, series([1, 1, 1, 1, 1])), {
    status: 'unavailable',
    reason: 'no comparable baseline',
  });
  assert.equal(compareSeries(series([1, 1, 1, 1, 1]), undefined).status, 'unavailable');
});

test('mismatched conditions are unavailable', () => {
  const result = compareSeries(
    series([100, 100, 100, 100, 100]),
    series([100, 100, 100, 100, 100], { cache: 'cold', harnessHash: 'h2' }),
  );
  assert.deepEqual(result, { status: 'unavailable', reason: 'conditions differ: cache, harnessHash' });
});

test('an incomplete side is unavailable', () => {
  const result = compareSeries(
    series([100, 100, 100, 100, 100]),
    series([100, 100, { elapsedMs: null, status: 'timeout', reason: 'deadline' }, 100, 100]),
  );
  assert.deepEqual(result, { status: 'unavailable', reason: 'candidate incomplete: 4/5 valid' });
});

test('a seeded regression is reported slower', () => {
  const before = [100, 104, 96, 102, 98];
  const result = compareSeries(series(before), series(before.map((ms) => ms + 50)));
  assert.equal(result.status, 'slower');
  if (result.status !== 'slower') return;
  assert.equal(result.medianPairedDifferenceMs, 50);
  assert.equal(result.baselineMedianMs, 100);
  assert.equal(result.candidateMedianMs, 150);
});

test('a change inside the larger MAD is inconclusive', () => {
  const result = compareSeries(series([100, 110, 90, 105, 95]), series([102, 112, 92, 107, 97]));
  assert.equal(result.status, 'inconclusive');
});

test('pairs that conflict in direction are inconclusive', () => {
  const result = compareSeries(series([100, 100, 100, 100, 100]), series([150, 150, 150, 150, 60]));
  assert.equal(result.status, 'inconclusive');
  if (result.status === 'inconclusive') assert.match(result.reason, /conflict/);
});

test('interaction sessions report per-session median and p95 and their spread', () => {
  const session = (id: string, offset: number) => ({
    sessionId: id,
    events: Array.from({ length: 20 }, (_, i) => i + 1 + offset),
  });
  const summary = summarizeInteraction([0, 1, 2, 3, 4].map((n) => session(`s${n}`, n)));
  assert.equal(summary.status, 'measured');
  assert.deepEqual(summary.sessions[0], { sessionId: 's0', count: 20, medianMs: 10.5, p95Ms: 19 });
  assert.deepEqual(summary.sessionMedian, { medianMs: 12.5, minMs: 10.5, maxMs: 14.5 });
  assert.deepEqual(summary.sessionP95, { medianMs: 21, minMs: 19, maxMs: 23 });
});

test('a missing interaction observation keeps the cell incomplete', () => {
  const events = Array.from({ length: 20 }, (_, i): number | null => (i === 7 ? null : i));
  const summary = summarizeInteraction(
    Array.from({ length: 5 }, (_, n) => ({ sessionId: `s${n}`, events })),
  );
  assert.equal(summary.status, 'incomplete');
  assert.equal(summary.missing, 5);
  assert.equal(summary.sessionMedian, null);
});
