// The first-screen run record's pure parts, shared by the harness (scripts/first-screen.ts) and the docs test
// that validates the retained records: docs/spec/adoption-delivery.md#first-screen-exercise.

export const BRIEF = 'docs/evidence/first-screen/brief.md';
export const LAYOUTS = { vite: '--framework vite', 'next-app': '--framework next', 'next-src': '--framework next --layout src' } as const;
export type Layout = keyof typeof LAYOUTS;

/** The brief's brand color, from its `Brand color:` line. */
export function briefBrand(brief: string): string {
  const match = /^Brand color: `(#[0-9A-Fa-f]{6})`/m.exec(brief);
  if (!match) throw new Error(`${BRIEF} names no brand color`);
  return match[1]!.toUpperCase();
}

export type Condition = 'passed' | 'failed' | 'pending-review';
export type Conditions = Record<'completed' | 'publicGuidanceOnly' | 'interventions' | 'decisions' | 'check' | 'lint' | 'rawPaint' | 'production', Condition>;
type Evidence = {
  agent?: { outcome?: string | null } | null;
  transcript?: { outsideReferences?: unknown[] } | null;
  review?: { interventions: unknown[]; decisions: unknown[] } | null;
  styling?: {
    check?: { exit: number | null; counts: { errors: number } | null };
    lint?: { state: string; errors: number | null };
    rawPaint?: { findings: unknown[] };
  } | null;
  production?: { status?: string } | null;
};

/**
 * The pass conditions, each from its own evidence. Interventions and decisions need the operator's review of the
 * transcript, so a run without one stays pending; nothing in the record can turn a failed condition into a pass.
 */
export function verdict(record: Evidence): { conditions: Conditions; status: Condition } {
  const styling = record.styling;
  const review = record.review;
  const conditions: Conditions = {
    completed: record.agent?.outcome === 'success' ? 'passed' : 'failed',
    publicGuidanceOnly: record.transcript?.outsideReferences?.length === 0 ? 'passed' : 'failed',
    interventions: review ? (review.interventions.length === 0 ? 'passed' : 'failed') : 'pending-review',
    decisions: review ? (review.decisions.length === 0 ? 'passed' : 'failed') : 'pending-review',
    check: styling?.check?.exit === 0 && styling.check.counts?.errors === 0 ? 'passed' : 'failed',
    lint: styling?.lint?.state === 'configured' && styling.lint.errors === 0 ? 'passed' : 'failed',
    rawPaint: styling?.rawPaint?.findings.length === 0 ? 'passed' : 'failed',
    production: record.production?.status === 'passed' ? 'passed' : 'failed',
  };
  const values = Object.values(conditions);
  return { conditions, status: values.includes('failed') ? 'failed' : values.includes('pending-review') ? 'pending-review' : 'passed' };
}
