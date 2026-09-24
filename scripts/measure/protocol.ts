/**
 * The aggregation and comparison rules of the measurement contract, in
 * docs/spec/agent-infrastructure.md under Run protocol and evidence. Everything here
 * is pure so the same code summarizes a baseline, a candidate, and the fixtures that
 * prove a failed or missing sample can never read as a fast pass.
 */

export const SCHEMA_VERSION = 1;

export const REQUIRED_COMMAND_RUNS = 5;

export type SampleStatus = 'valid' | 'failed' | 'timeout' | 'excluded';

export type PhaseSample = {
  id: string;
  elapsedMs: number;
  exitCode: number | null;
  signal: string | null;
  log: string;
};

export type Sample = {
  runId: string;
  order: number;
  startedAt: string;
  elapsedMs: number | null;
  status: SampleStatus;
  reason?: string;
  phases?: PhaseSample[];
};

/** Two series compare only when every field here matches. */
export type Conditions = {
  workload: string;
  workloadVersion: number;
  cache: string;
  runnerClass: string;
  harnessHash: string;
  fixtureHash: string | null;
};

export type Series = { conditions: Conditions; samples: Sample[] };

export type CommandSummary = {
  status: 'measured' | 'incomplete';
  required: number;
  valid: number;
  failed: number;
  excluded: number;
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  madMs: number | null;
};

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('median of no values');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function medianAbsoluteDeviation(values: readonly number[]): number {
  const centre = median(values);
  return median(values.map((value) => Math.abs(value - centre)));
}

/** Nearest-rank: the smallest value with at least p percent of the sample at or below it. */
export function nearestRank(values: readonly number[], percentile: number): number {
  if (values.length === 0) throw new Error('percentile of no values');
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((percentile / 100) * sorted.length));
  return sorted[rank - 1]!;
}

export function validateSeries(series: Series): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const sample of series.samples) {
    if (ids.has(sample.runId)) problems.push(`duplicate run id ${sample.runId}`);
    ids.add(sample.runId);
    if (sample.status === 'valid') {
      if (sample.elapsedMs === null || !Number.isFinite(sample.elapsedMs) || sample.elapsedMs < 0) {
        problems.push(`valid run ${sample.runId} has no usable elapsed time`);
      }
    } else if (!sample.reason) {
      problems.push(`${sample.status} run ${sample.runId} carries no reason`);
    }
  }
  return problems;
}

export function summarizeCommand(series: Series, required = REQUIRED_COMMAND_RUNS): CommandSummary {
  const problems = validateSeries(series);
  if (problems.length > 0) throw new Error(`invalid series: ${problems.join('; ')}`);
  const valid = series.samples.filter((sample) => sample.status === 'valid').map((sample) => sample.elapsedMs!);
  const failed = series.samples.filter((sample) => sample.status === 'failed' || sample.status === 'timeout').length;
  const excluded = series.samples.filter((sample) => sample.status === 'excluded').length;
  const counts = { required, valid: valid.length, failed, excluded };
  if (valid.length < required) {
    return { status: 'incomplete', ...counts, medianMs: null, minMs: null, maxMs: null, madMs: null };
  }
  return {
    status: 'measured',
    ...counts,
    medianMs: median(valid),
    minMs: Math.min(...valid),
    maxMs: Math.max(...valid),
    madMs: medianAbsoluteDeviation(valid),
  };
}

export type SessionSummary = { sessionId: string; count: number; medianMs: number; p95Ms: number };

export type InteractionSummary = {
  status: 'measured' | 'incomplete';
  requiredSessions: number;
  requiredRepetitions: number;
  sessions: SessionSummary[];
  missing: number;
  sessionMedian: { medianMs: number; minMs: number; maxMs: number } | null;
  sessionP95: { medianMs: number; minMs: number; maxMs: number } | null;
};

export type InteractionSession = { sessionId: string; events: (number | null)[] };

/** A null event is an observation the harness could not complete; it stays counted as missing. */
export function summarizeInteraction(
  sessions: readonly InteractionSession[],
  requiredSessions = 5,
  requiredRepetitions = 20,
): InteractionSummary {
  let missing = 0;
  const summaries: SessionSummary[] = [];
  let complete = sessions.length >= requiredSessions;
  for (const session of sessions) {
    const observed = session.events.filter((event): event is number => event !== null);
    missing += session.events.length - observed.length;
    if (observed.length < requiredRepetitions) complete = false;
    if (observed.length === 0) continue;
    summaries.push({
      sessionId: session.sessionId,
      count: observed.length,
      medianMs: median(observed),
      p95Ms: nearestRank(observed, 95),
    });
  }
  const spread = (values: number[]) =>
    values.length === 0 ? null : { medianMs: median(values), minMs: Math.min(...values), maxMs: Math.max(...values) };
  return {
    status: complete ? 'measured' : 'incomplete',
    requiredSessions,
    requiredRepetitions,
    sessions: summaries,
    missing,
    sessionMedian: complete ? spread(summaries.map((s) => s.medianMs)) : null,
    sessionP95: complete ? spread(summaries.map((s) => s.p95Ms)) : null,
  };
}

export type Comparison =
  | { status: 'unavailable'; reason: string }
  | {
      status: 'inconclusive' | 'slower' | 'faster';
      baselineMedianMs: number;
      candidateMedianMs: number;
      medianPairedDifferenceMs: number;
      largerMadMs: number;
      pairs: number;
      reason: string;
    };

function mismatched(a: Conditions, b: Conditions): string[] {
  return (Object.keys(a) as (keyof Conditions)[]).filter((key) => a[key] !== b[key]);
}

/**
 * Pairs valid samples by run order. Within the larger series' MAD, or with pairs that
 * disagree in direction, the result is inconclusive: an investigation screen, never a
 * significance claim, and never a pass for a missing side.
 */
export function compareSeries(baseline: Series | undefined, candidate: Series | undefined): Comparison {
  if (!baseline) return { status: 'unavailable', reason: 'no comparable baseline' };
  if (!candidate) return { status: 'unavailable', reason: 'no candidate series' };
  const differing = mismatched(baseline.conditions, candidate.conditions);
  if (differing.length > 0) return { status: 'unavailable', reason: `conditions differ: ${differing.join(', ')}` };
  const before = summarizeCommand(baseline);
  const after = summarizeCommand(candidate);
  if (before.status !== 'measured') return { status: 'unavailable', reason: `baseline incomplete: ${before.valid}/${before.required} valid` };
  if (after.status !== 'measured') return { status: 'unavailable', reason: `candidate incomplete: ${after.valid}/${after.required} valid` };

  const validOf = (series: Series) =>
    series.samples.filter((s) => s.status === 'valid').sort((a, b) => a.order - b.order).map((s) => s.elapsedMs!);
  const a = validOf(baseline);
  const b = validOf(candidate);
  const pairs = Math.min(a.length, b.length);
  const differences = Array.from({ length: pairs }, (_, i) => b[i]! - a[i]!);
  const change = median(differences);
  const largerMad = Math.max(before.madMs!, after.madMs!);
  const directions = new Set(differences.filter((d) => d !== 0).map(Math.sign));
  const base = {
    baselineMedianMs: before.medianMs!,
    candidateMedianMs: after.medianMs!,
    medianPairedDifferenceMs: change,
    largerMadMs: largerMad,
    pairs,
  };
  if (Math.abs(change) <= largerMad) {
    return { status: 'inconclusive', ...base, reason: 'median change within the larger median absolute deviation' };
  }
  if (directions.size > 1) return { status: 'inconclusive', ...base, reason: 'paired differences conflict in direction' };
  return { status: change > 0 ? 'slower' : 'faster', ...base, reason: 'every pair moved the same way beyond the larger MAD' };
}

/**
 * The same screen for an interaction: pairs the i-th session of each side by its
 * session median, and uses the larger spread of session medians as the noise floor.
 * An incomplete side leaves the comparison unavailable.
 */
export function compareInteraction(
  baseline: InteractionSummary | undefined,
  candidate: InteractionSummary | undefined,
): Comparison {
  if (!baseline) return { status: 'unavailable', reason: 'no comparable baseline' };
  if (!candidate) return { status: 'unavailable', reason: 'no candidate series' };
  if (baseline.status !== 'measured') return { status: 'unavailable', reason: 'baseline incomplete' };
  if (candidate.status !== 'measured') return { status: 'unavailable', reason: 'candidate incomplete' };
  const a = baseline.sessions.map((s) => s.medianMs);
  const b = candidate.sessions.map((s) => s.medianMs);
  const pairs = Math.min(a.length, b.length);
  const differences = Array.from({ length: pairs }, (_, i) => b[i]! - a[i]!);
  const change = median(differences);
  const largerMad = Math.max(medianAbsoluteDeviation(a), medianAbsoluteDeviation(b));
  const directions = new Set(differences.filter((d) => d !== 0).map(Math.sign));
  const base = {
    baselineMedianMs: median(a),
    candidateMedianMs: median(b),
    medianPairedDifferenceMs: change,
    largerMadMs: largerMad,
    pairs,
  };
  if (Math.abs(change) <= largerMad) {
    return { status: 'inconclusive', ...base, reason: 'median change within the larger MAD of session medians' };
  }
  if (directions.size > 1) return { status: 'inconclusive', ...base, reason: 'paired session differences conflict in direction' };
  return { status: change > 0 ? 'slower' : 'faster', ...base, reason: 'every session pair moved the same way beyond the larger MAD' };
}
