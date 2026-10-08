import type { Manifest } from './verification/source.ts';

export const CONSUMER_LAYOUTS = ['vite', 'next-app', 'next-src'] as const;
export type ConsumerLayout = typeof CONSUMER_LAYOUTS[number];
export const consumerCases = (layout: ConsumerLayout) => ['system-dark', 'system-light', 'explicit-dark', 'explicit-light'].map((mode) => `${layout}/css/chromium/${mode}`);
export const CONSUMER_CASES = consumerCases('vite');
export type ConsumerCase = { id: string; status: 'passed' | 'failed'; snapshot: string; failures: string[] };
export type ConsumerReport = {
  schemaVersion: 1;
  status: 'passed' | 'failed' | 'incomplete';
  layout: ConsumerLayout;
  deliveryPath: 'css';
  source: {
    head: string | null;
    manifest: Manifest;
    registryManifestHash: string | null;
    cliTarballDigest: string | null;
    draftDigest: string | null;
    draftFingerprint: string;
    recipeVersion: number;
  };
  command: string[];
  work: string | null;
  versions: Record<string, string>;
  installedItems: string[];
  expected: string[];
  executed: string[];
  cases: ConsumerCase[];
  errors: string[];
};

export function consumerReportProblems(value: unknown, layout?: ConsumerLayout): string[] {
  if (!value || typeof value !== 'object') return ['missing consumer-proof report'];
  const report = value as ConsumerReport;
  const problems: string[] = [];
  if (report.schemaVersion !== 1 || !CONSUMER_LAYOUTS.includes(report.layout) || report.deliveryPath !== 'css' || (layout && report.layout !== layout)) problems.push('unknown consumer-proof schema or parameters');
  if (!['passed', 'failed', 'incomplete'].includes(report.status)) problems.push('unknown consumer-proof status');
  const expected = consumerCases(report.layout);
  const same = (values: unknown) => Array.isArray(values) && values.length === expected.length && new Set(values).size === values.length && expected.every((id) => values.includes(id));
  if (!same(report.expected) || !same(report.executed)) problems.push('consumer-proof case coverage is incomplete');
  if (!Array.isArray(report.cases) || !same(report.cases.map((row) => row?.id))) problems.push('consumer-proof case results are incomplete');
  else for (const row of report.cases) {
    if (!['passed', 'failed'].includes(row.status) || typeof row.snapshot !== 'string' || !row.snapshot || !Array.isArray(row.failures) || row.failures.some((failure) => typeof failure !== 'string')) {
      problems.push(`invalid case result: ${row.id}`);
      continue;
    }
    if ((row.status === 'passed') !== (row.failures.length === 0)) problems.push(`case status disagrees with failures: ${row.id}`);
    if (report.status === 'passed' && (row.status !== 'passed' || row.failures.length !== 0)) problems.push(`passing report contains a failing case: ${row.id}`);
  }
  const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (!report.source || !/^[a-f0-9]{40,64}$/.test(report.source.head ?? '') || !digest(report.source.manifest?.digest) || report.source.manifest.algorithm !== 'sha256' || report.source.manifest.version !== 1 || !Array.isArray(report.source.manifest?.entries) || report.source.manifest.files !== report.source.manifest.entries.length || !digest(report.source.registryManifestHash) || !digest(report.source.cliTarballDigest) || !digest(report.source.draftDigest) || typeof report.source.draftFingerprint !== 'string' || !report.source.draftFingerprint || !Number.isInteger(report.source.recipeVersion)) problems.push('consumer-proof source identity is incomplete');
  if (!Array.isArray(report.errors) || report.errors.some((error) => typeof error !== 'string') || (report.status === 'passed' && report.errors.length !== 0)) problems.push('invalid consumer-proof errors');
  return problems;
}
