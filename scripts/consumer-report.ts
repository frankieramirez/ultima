import type { Manifest } from './verification/source.ts';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

export function registryPresets(): string[] {
  const source = ts.createSourceFile('draft.ts', readFileSync(new URL('../packages/tokens/src/theme/draft.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.flatMap((statement) => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []).find((declaration) => declaration.name.getText(source) === 'THEME_PRESETS');
  const initializer = declaration?.initializer;
  const array = initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer;
  if (!array || !ts.isArrayLiteralExpression(array)) throw new Error('THEME_PRESETS must remain a statically discoverable array');
  return array.elements.map((element) => {
    const id = ts.isObjectLiteralExpression(element) && element.properties.find((property) => property.name?.getText(source) === 'id');
    if (!id || !ts.isPropertyAssignment(id) || !ts.isStringLiteral(id.initializer)) throw new Error('A theme preset has no static id');
    return id.initializer.text;
  });
}

export const CONSUMER_LAYOUTS = ['vite', 'next-app', 'next-src'] as const;
export type ConsumerLayout = typeof CONSUMER_LAYOUTS[number];
export const DELIVERY_PATHS = ['css', 'stylex-subtree', 'registry', 'cli'] as const;
export type DeliveryPath = typeof DELIVERY_PATHS[number];
export const consumerCases = (layout: ConsumerLayout, path: DeliveryPath = 'css') => (path === 'registry' ? ['css-reference-', '', ...registryPresets().map((id) => `${id}-`)] : ['']).flatMap((preset) => ['system-dark', 'system-light', 'explicit-dark', 'explicit-light'].map((mode) => `${layout}/${path}/chromium/${preset}${mode}`));
export const modeCases = (layout: ConsumerLayout) => ['light', 'dark', 'missing', 'throwing'].flatMap((stored) => ['dark', 'light'].map((system) => `${layout}/theme-mode/chromium/${stored}-${system}`));
export const CONSUMER_CASES = consumerCases('vite');
/** The copy-bundles exercise: compile, then one case per exercise in scripts/consumer-copy-bundles.ts, which asserts the two agree. */
export const COPY_CASES = ['compile', 'projects-zoom-200', 'product-tokens', 'style-overrides', 'interaction-states', 'typography', 'carousel', 'chart', 'command-dialog', 'data-table-sorting', 'data-table-row-selection', 'data-table-filtering', 'data-table-pagination', 'item', 'kbd', 'react-hook-form', 'sheet', 'settings-01-desktop', 'settings-01-narrow'];
export const copyBundleCases = (layout: ConsumerLayout) => COPY_CASES.map((name) => `${layout}/copy-bundles/chromium/${name}`);
/** The lint exercise: one case per row of docs/spec/consumer-lint.md#verification-and-delivery, which scripts/consumer-lint.ts asserts. */
export const LINT_CASES = ['config', 'catalogue', 'invalid-property', 'palette-constant', 'raw-paint', 'warning-only', 'composition', 'no-eslint', 'missing-plugin', 'incompatible-package', 'bad-config', 'ignored-tsx', 'severity-override', 'offline', 'compile'];
export const lintCases = (layout: ConsumerLayout) => LINT_CASES.map((name) => `${layout}/lint/node/${name}`);
/** The browser engines a runner cell can name. The scene matrices run Chromium; the production bundles run all three. */
export const ENGINES = ['chromium', 'firefox', 'webkit'] as const;
export type Engine = typeof ENGINES[number];
/** The six Vite production bundles of docs/spec/consumer-support.md#bounded-production-proof; scripts/consumer-bundles.ts holds each one's assertions. */
export const BUNDLES = ['theme-css', 'overlay-keyboard', 'form', 'date-picker', 'direction-locale', 'narrow-touch'] as const;
export const NEXT_BUNDLES = ['hydration'] as const;
export const ELEMENT_BUNDLES = ['lifecycle'] as const;
export type Bundle = typeof BUNDLES[number] | typeof NEXT_BUNDLES[number] | typeof ELEMENT_BUNDLES[number];
export const MATRIX_BUNDLES: readonly Bundle[] = [...BUNDLES, ...NEXT_BUNDLES, ...ELEMENT_BUNDLES];
const cells = (prefix: string, bundles: readonly Bundle[], engines: readonly Engine[]) => engines.flatMap((engine) => bundles.flatMap((bundle) => ['dark', 'light'].map((mode) => `${prefix}/${engine}/${bundle}-${mode}`)));
/** The bundles exercise: the Vite bundles on the canonical Vite fixture, the hydration bundle on each Next layout; every bundle in both modes, per engine. */
export const bundleCases = (engines: readonly Engine[] = ENGINES, layout: ConsumerLayout = 'vite') => cells(`${layout}/bundles`, layout === 'vite' ? BUNDLES : NEXT_BUNDLES, engines);
export const elementCases = (engines: readonly Engine[] = ENGINES) => cells('vite/elements', ELEMENT_BUNDLES, engines);
/** Every cell of the cross-engine matrix in docs/spec/consumer-support.md#bounded-production-proof that the runner registers. */
export const matrixCases = () => [...CONSUMER_LAYOUTS.flatMap((layout) => bundleCases(ENGINES, layout)), ...elementCases()];
/** The items the bundles exercise installs beside the Projects scene, for its scoped popups, form controls, dates and RTL layout. */
export const BUNDLE_ITEMS = ['checkbox', 'popover', 'date-picker', 'tabs'];
export const ELEMENT_ITEMS = readdirSync(new URL('../registry/metadata/element/', import.meta.url)).filter((name) => name.endsWith('.ts')).map((name) => name.slice(0, -'.ts'.length)).sort();
/** The worked block-adaptation path the copy-bundles exercise installs and adapts. */
export const ADAPTED_BLOCK = 'settings-01';
/** The fixture prefix and mode of a cell id, the inverse of `consumerCases`. */
export function consumerCell(id: string): { fixture: string; mode: string | undefined } {
  const cell = id.split('/').at(-1) ?? '';
  const mode = cell.match(/(?:system|explicit)-(?:dark|light)$/)?.[0];
  return { fixture: (mode ? cell.slice(0, -mode.length) : cell).replace(/-$/, ''), mode };
}
export function consumerPrerequisites(layout: ConsumerLayout, path: DeliveryPath, selectedCase?: string): string[] {
  if (typeof selectedCase !== 'string' || path !== 'registry') return [];
  const { mode } = consumerCell(selectedCase);
  const prefix = `${layout}/${path}/chromium/`;
  return mode && !selectedCase.includes('/css-reference-') ? [`${prefix}css-reference-${mode}`, ...(selectedCase !== `${prefix}${mode}` ? [`${prefix}${mode}`] : [])] : [];
}
export function consumerReproduction(layout: ConsumerLayout, path: DeliveryPath, id: string, options: { preset?: string; fault?: string } = {}): string[] {
  return ['node', '--experimental-strip-types', 'scripts/consumer-proof.ts', '--layout', layout, '--delivery-path', path, ...(options.preset ? ['--preset', options.preset] : []), ...(options.fault ? ['--fault', options.fault] : []), '--case', id];
}
export type ConsumerCase = { id: string; status: 'passed' | 'failed'; snapshot: string; failures: string[] };
export type ConsumerReport = {
  schemaVersion: 1;
  status: 'passed' | 'failed' | 'incomplete';
  layout: ConsumerLayout;
  deliveryPath: DeliveryPath;
  exercise?: 'theme-mode' | 'copy-bundles' | 'lint' | 'bundles' | 'elements';
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
  drafts?: Record<string, { digest: string; fingerprint: string; recipeVersion: number }>;
  cliReports?: { doctor: string; check: string };
  engines?: Engine[];
  /** The bundles or elements exercise's one production build, shared by every engine: the hash of its served output and its lockfile. */
  fixture?: { hash: string; lock: string };
  platform?: { os: string; release: string; arch: string };
  lint?: { fragment: { path: string; digest: string }; config: string; lintScript: string | null; network: string; versions: Record<string, string | null>; files: string[] };
  selectedCase?: string;
  prerequisites?: ConsumerCase[];
};

export function consumerReportProblems(value: unknown, layout?: ConsumerLayout, path?: DeliveryPath): string[] {
  if (!value || typeof value !== 'object') return ['missing consumer-proof report'];
  const report = value as ConsumerReport;
  const problems: string[] = [];
  if (report.schemaVersion !== 1 || !CONSUMER_LAYOUTS.includes(report.layout) || !DELIVERY_PATHS.includes(report.deliveryPath) || (layout && report.layout !== layout) || (path && report.deliveryPath !== path)) problems.push('unknown consumer-proof schema or parameters');
  if (!['passed', 'failed', 'incomplete'].includes(report.status)) problems.push('unknown consumer-proof status');
  if (report.exercise !== undefined && !['theme-mode', 'copy-bundles', 'lint', 'bundles', 'elements'].includes(report.exercise)) problems.push('unknown consumer exercise');
  if (report.exercise !== undefined && report.deliveryPath !== 'css') problems.push(`${report.exercise} requires CSS delivery`);
  if (report.exercise === 'copy-bundles' && !report.installedItems?.includes(ADAPTED_BLOCK)) problems.push('copy-bundles installed source inventory is incomplete');
  if (report.exercise === 'theme-mode' && !['theme-mode', 'popover'].every((item) => report.installedItems?.includes(item))) problems.push('theme-mode installed source inventory is incomplete');
  if (report.exercise === 'lint' && !['button', 'sidebar', ADAPTED_BLOCK].every((item) => report.installedItems?.includes(item))) problems.push('lint installed source inventory is incomplete');
  if (report.exercise === 'lint' && report.status !== 'incomplete' && (!report.lint || !/^[a-f0-9]{64}$/.test(report.lint.fragment?.digest ?? '') || typeof report.lint.network !== 'string' || !report.lint.versions?.eslint || !report.lint.versions?.['@stylexjs/eslint-plugin'] || !Array.isArray(report.lint.files) || report.lint.files.length === 0)) problems.push('lint fragment, network, version or coverage evidence is missing');
  if (report.exercise === 'bundles' || report.exercise === 'elements') {
    if (report.exercise === 'elements' && report.layout !== 'vite') problems.push('elements run on their own vanilla Vite fixture');
    if (!(report.exercise === 'elements' ? ELEMENT_ITEMS : report.layout === 'vite' ? BUNDLE_ITEMS : []).every((item) => report.installedItems?.includes(item))) problems.push('bundles installed source inventory is incomplete');
    if (!Array.isArray(report.engines) || !report.engines.length || report.engines.some((engine, index) => !ENGINES.includes(engine) || report.engines!.indexOf(engine) !== index)) problems.push('unknown bundle engines');
    else if (report.status !== 'incomplete' && report.engines.some((engine) => typeof report.versions?.[engine] !== 'string' || !report.versions[engine])) problems.push('bundle browser identity is missing');
    const sha = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
    if (report.status !== 'incomplete' && (!sha(report.fixture?.hash) || !sha(report.fixture?.lock) || !report.platform?.os || !report.platform.release || !report.platform.arch)) problems.push('bundle fixture or platform identity is missing');
  }
  const engines = Array.isArray(report.engines) ? report.engines.filter((engine) => ENGINES.includes(engine)) : [];
  const all = report.exercise === 'theme-mode' ? modeCases(report.layout) : report.exercise === 'copy-bundles' ? copyBundleCases(report.layout) : report.exercise === 'lint' ? lintCases(report.layout) : report.exercise === 'bundles' ? bundleCases(engines, report.layout) : report.exercise === 'elements' ? elementCases(engines) : consumerCases(report.layout, report.deliveryPath);
  if (report.selectedCase && (report.exercise !== undefined || !all.includes(report.selectedCase))) problems.push('unknown selected consumer case');
  const expected = report.selectedCase ? [report.selectedCase] : all;
  const same = (values: unknown, wanted = expected) => Array.isArray(values) && values.length === wanted.length && new Set(values).size === values.length && wanted.every((id) => values.includes(id));
  const prerequisites = report.prerequisites ?? [];
  if (!Array.isArray(prerequisites) || !same(prerequisites.map((row) => row?.id), consumerPrerequisites(report.layout, report.deliveryPath, report.selectedCase))) problems.push('consumer-proof prerequisite evidence is incomplete');
  if (!same(report.expected) || !same(report.executed)) problems.push('consumer-proof case coverage is incomplete');
  if (!Array.isArray(report.cases) || !same(report.cases.map((row) => row?.id))) problems.push('consumer-proof case results are incomplete');
  else for (const row of [...(Array.isArray(prerequisites) ? prerequisites : []), ...report.cases]) {
    if (!row || typeof row.id !== 'string' || !['passed', 'failed'].includes(row.status) || typeof row.snapshot !== 'string' || !row.snapshot || !Array.isArray(row.failures) || row.failures.some((failure) => typeof failure !== 'string')) {
      problems.push(`invalid case result: ${row?.id ?? 'missing'}`);
      continue;
    }
    if ((row.status === 'passed') !== (row.failures.length === 0)) problems.push(`case status disagrees with failures: ${row.id}`);
    if (report.status === 'passed' && (row.status !== 'passed' || row.failures.length !== 0)) problems.push(`passing report contains a failing case: ${row.id}`);
  }
  const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (report.deliveryPath === 'registry' && registryPresets().filter((id) => !report.selectedCase || report.selectedCase.split('/').at(-1)?.startsWith(`${id}-`)).some((id) => !digest(report.drafts?.[id]?.digest) || !report.drafts?.[id]?.fingerprint || !Number.isInteger(report.drafts?.[id]?.recipeVersion))) problems.push('preset provenance is incomplete');
  if (report.deliveryPath === 'registry' && report.selectedCase && all.includes(report.selectedCase)) {
    const name = consumerCell(report.selectedCase).fixture || 'non-stock';
    const selected = report.drafts?.[name];
    if (!selected || !digest(selected.digest) || selected.digest !== report.source?.draftDigest || selected.fingerprint !== report.source?.draftFingerprint || selected.recipeVersion !== report.source?.recipeVersion) problems.push('selected registry provenance disagrees with source');
  }
  if (report.deliveryPath === 'cli' && (!report.cliReports?.doctor || !report.cliReports?.check)) problems.push('packed CLI reports are missing');
  if (!report.source || !/^[a-f0-9]{40,64}$/.test(report.source.head ?? '') || !digest(report.source.manifest?.digest) || report.source.manifest.algorithm !== 'sha256' || report.source.manifest.version !== 1 || !Array.isArray(report.source.manifest?.entries) || report.source.manifest.files !== report.source.manifest.entries.length || !digest(report.source.registryManifestHash) || (report.exercise === 'elements' ? report.source.cliTarballDigest !== null : !digest(report.source.cliTarballDigest)) || !digest(report.source.draftDigest) || typeof report.source.draftFingerprint !== 'string' || !report.source.draftFingerprint || !Number.isInteger(report.source.recipeVersion)) problems.push('consumer-proof source identity is incomplete');
  if (!Array.isArray(report.errors) || report.errors.some((error) => typeof error !== 'string') || (report.status === 'passed' && report.errors.length !== 0)) problems.push('invalid consumer-proof errors');
  return problems;
}
