/**
 * Verification planning: which checks a `component`, `feature`, `changed` or `release` run needs, per
 * Selection and dependency expansion, Changed files and source identity, and Check composition under
 * Verification CLI in docs/spec/agent-infrastructure.md. Planning is pure: it reads a snapshot of the
 * checkout (and, for `changed`, one of the base commit) and returns an ordered check DAG. It runs no
 * check, and a plan is never a pass.
 *
 * Selection is conservative. It follows forward and reverse imports, the barrel's names, globs, element
 * counterparts, recipes, demos and registered scenarios. Global inputs, unmapped paths and any edge the
 * graph cannot establish broaden to the release plan, with the reason and path recorded.
 */
import compositionExamples from '../catalogue/composition-examples.ts';
import { compositionProjection } from '../catalogue/compositions.ts';
import { consumerBundle } from '../catalogue/consumer-copy.ts';
import type { Files } from '../catalogue/files.ts';
import { type Catalogue, type Diagnostic, loadCatalogue } from '../catalogue/model.ts';
import { ADAPTED_BLOCK } from '../consumer-report.ts';
import type { Base, Change } from './changes.ts';
import { CHECKS, type CheckDefinition, type CheckId, DEFAULT_DEADLINE_SECONDS, RELEASE_PENDING, check } from './checks.ts';
import { type Graph, type Reach, buildGraph, dependantsOf } from './graph.ts';
import { type JoinedScenario, type VerificationDiagnostic, type VerificationModel, loadVerification } from './model.ts';
import type { Target } from './schema.ts';

export const PLAN_VERSION = 1;

export type Mode = 'component' | 'feature' | 'changed' | 'release';

export type Snapshot = {
  files: Files;
  catalogue: Catalogue;
  model: VerificationModel;
  graph: Graph;
  /** Catalogue and feature-map diagnostics: a snapshot with any cannot bound a change on its own. */
  diagnostics: (Diagnostic | VerificationDiagnostic)[];
};

/** Findings that drop a descriptor or record from the model, so ownership itself is unknown. */
const AMBIGUOUS = new Set(['not-data', 'invalid-descriptor', 'unexpected-descriptor', 'duplicate-id', 'not-json', 'invalid-record', 'unexpected-record', 'id-mismatch', 'absent-owner']);

export const ambiguous = (snapshot: Snapshot) => snapshot.diagnostics.filter((diagnostic) => AMBIGUOUS.has(diagnostic.code));

export function snapshot(files: Files): Snapshot {
  const { catalogue, diagnostics: catalogueDiagnostics } = loadCatalogue(files);
  const { model, diagnostics } = loadVerification(files, catalogue);
  return { files, catalogue, model, graph: buildGraph(files, catalogue), diagnostics: [...catalogueDiagnostics, ...diagnostics] };
}

export type Fallback = { reason: string; paths: string[] };

export type PlannedCheck = {
  id: CheckId;
  title: string;
  status: 'planned';
  adapter: CheckDefinition['adapter'];
  argv: string[];
  cwd: string;
  nested: string[];
  prerequisites: CheckId[];
  /** Checks that must finish first, whatever their outcome, because this one writes outputs they read. */
  after: CheckId[];
  locks: CheckDefinition['locks'];
  needs: CheckDefinition['needs'];
  deadlineSeconds: number;
  /** `global` runs everywhere; `whole` runs the entire suite; `files` runs the listed test files. */
  scope: 'global' | 'whole' | 'files';
  reasons: string[];
  /** Test files it must discover and run, each with why; `present: false` means the plan expects a file that is gone. */
  files: { path: string; present: boolean; reasons: string[] }[];
  /** Registered scenario cases the run must report back. */
  cases: string[];
};

export type Plan = {
  schemaVersion: typeof PLAN_VERSION;
  command: Mode;
  status: 'planned';
  selectors: string[];
  /** `scoped` for a named or changed scope, `common` when nothing behavioral changed, `release` for the full plan. */
  scope: 'scoped' | 'common' | 'release';
  fallbacks: Fallback[];
  base: Base | null;
  changes: (Change & { mapping: string })[];
  selection: {
    items: { id: string; kind: string; present: boolean; reasons: string[] }[];
    features: { id: string; reasons: string[] }[];
    scenarios: { id: string; reasons: string[] }[];
    deletedTests: { path: string; owners: string[] }[];
  };
  /** Dirty paths a named scope does not cover; `null` when Git could not say. */
  unrelatedDirty: { paths: string[]; recommendation: string } | { unknown: string } | null;
  /** Catalogue and feature-map findings in the checkout; the freshness check fails on each. */
  findings: string[];
  checks: PlannedCheck[];
  deadline: { overallSeconds: number; source: 'default' | '--timeout' };
  output: string | null;
  /** `canPass` says only that every selected check has an adapter; a plan itself never passes. */
  /** `pending`: release obligations no check can meet yet (checks.ts), which keep a release from passing. */
  outcome: { status: 'planned'; ran: 0; passed: 0; canPass: boolean; unavailable: CheckId[]; pending: string[]; note: string };
};

export type PlanInput = {
  mode: Mode;
  selectors: string[];
  current: Snapshot;
  /** For `changed`: the base commit's snapshot, or why there is none. */
  base?: Snapshot | { failure: string };
  baseInfo?: Base;
  changes?: Change[];
  /** For named scopes: dirty paths, or why Git could not list them. */
  dirty?: Change[] | { failure: string };
  timeoutSeconds?: number;
  output?: string;
};

/** Inputs every item or check can depend on: a change selects the full release plan. */
const RELEASE_INPUTS: readonly [RegExp, string][] = [
  [/^pnpm-(lock|workspace)\.yaml$/, 'the lockfile and workspace manifest can change every dependency'],
  [/(^|\/)package\.json$/, 'a package manifest can change dependencies and scripts for every item'],
  [/^\.npmrc$/, 'package-manager configuration affects every installation'],
  [/(^|\/)tsconfig(\.[^/]+)?\.json$/, 'TypeScript configuration affects every typed file'],
  [/^stylex\.options\.ts$/, 'StyleX configuration affects every compiled style'],
  [/(^|\/)(vite|vitest)\.config\.[cm]?ts$/, 'Vite and Vitest configuration affect every build and suite'],
  [/^\.github\//, 'a CI workflow is a check definition'],
  [/^\.gitignore$/, 'ignore rules decide which files are source'],
  [/^scripts\//, 'verification tooling, generators and build scripts can affect every item'],
  [/^packages\/[^/]+\/scripts\//, 'a package build or generator script can affect every item it builds'],
  [/^packages\/analysis\//, 'the architecture checker and its fixtures are verification tooling'],
  [/^packages\/tokens\//, 'a shared token source, palette recipe or token export affects both targets, contrast, every demo and installation'],
  [/^registry\/metadata\/(schema|releases|groups)\.ts$/, 'the descriptor schema, release order and catalogue groups shape every item'],
  [/^docs\/spec\/ultima\.md$/, 'the registry build and the agent guide generate prose from this specification'],
];

/** Prose and agent configuration no check executes; their links and anchors are the global checks' concern. */
const PROSE: readonly [RegExp, string][] = [
  [/^docs\//, 'documentation: contract anchors and links are checked by the architecture and freshness checks'],
  [/^[^/]+\.md$/, 'repository prose: its links are checked by the architecture and freshness checks'],
  [/^skills\//, 'agent skill prose; no check executes it'],
  [/^skills-lock\.json$/, 'agent skill lock; no check executes it'],
  [/^\.(agents|claude|cursor|grok|pi)\//, 'agent configuration; no check executes it'],
  [/^LICENSE$/, 'the license text; no check executes it'],
  [/^ultima\.pen$/, 'the design source; no check executes it'],
];

const DISTRIBUTED = new Set(['react', 'element', 'source-bundle', 'setup', 'artifact']);
const METADATA = /^registry\/metadata\/([a-z-]+)\/([a-z0-9-]+)\.ts$/;
const TEMPLATE = /^registry\/static\/([^/]+)\//;
const FEATURE_RECORD = /^verification\/features\/([^/]+)\.json$/;
const SCENARIO_RECORD = /^verification\/scenarios\/([^/]+)\/([^/]+)\.json$/;
const DOCS_APP = 'apps/docs/';
const REGISTRY_WIRING = 'registry/items.config.ts';
const PRODUCTION_TESTS = 'apps/docs/tests/production/';
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
const RECOMMEND = 'Run `pnpm verify changed --base origin/main` or `pnpm verify release` to cover them.';

const within = (path: string, root: string) => path === root || path.startsWith(`${root.replace(/\/$/, '')}/`);
const describeEdge = (reach: Reach) =>
  reach.via.length === 0
    ? reach.seed
    : [reach.seed, ...reach.via.map((edge) => `${edge.via === 'import' ? '' : `(${edge.via}) `}${edge.from}`)].join(' <- ');

function suiteOf(path: string): CheckDefinition | undefined {
  return CHECKS.find((entry) => entry.tests && entry.tests !== PRODUCTION_TESTS.slice(0, -1) && within(path, entry.tests));
}

class Selection {
  fallbacks: Fallback[] = [];
  items = new Map<string, { kind: string; present: boolean; reasons: Set<string> }>();
  features = new Map<string, Set<string>>();
  scenarios = new Map<string, Set<string>>();
  /** `<scenario>@<target>` pairs whose cases are already expected. */
  targets = new Set<string>();
  files = new Map<CheckId, Map<string, { present: boolean; reasons: Set<string> }>>();
  whole = new Map<CheckId, Set<string>>();
  checks = new Map<CheckId, Set<string>>();
  cases = new Map<CheckId, Set<string>>();
  deletedTests: { path: string; owners: string[] }[] = [];
  mapping = new Map<string, string>();
  /** Every path the scope covers: seeds and everything reached. */
  covered = new Set<string>();

  readonly current: Snapshot;
  readonly base: Snapshot | undefined;

  constructor(current: Snapshot, base?: Snapshot) {
    this.current = current;
    this.base = base;
  }

  fallback(reason: string, paths: string[] = []) {
    const existing = this.fallbacks.find((entry) => entry.reason === reason);
    if (existing) existing.paths = [...new Set([...existing.paths, ...paths])].sort();
    else this.fallbacks.push({ reason, paths: [...paths].sort() });
  }

  need(id: CheckId, reason: string) {
    const reasons = this.checks.get(id) ?? new Set<string>();
    reasons.add(reason);
    this.checks.set(id, reasons);
  }

  suite(id: CheckId, reason: string) {
    const reasons = this.whole.get(id) ?? new Set<string>();
    reasons.add(reason);
    this.whole.set(id, reasons);
  }

  testFile(path: string, reason: string, present = this.current.files.read(path) !== undefined) {
    const owner = suiteOf(path);
    if (!owner) return;
    if (owner.selector === 'none') return this.suite(owner.id, `${path}: ${reason}`);
    const files = this.files.get(owner.id) ?? new Map();
    const entry = files.get(path) ?? { present, reasons: new Set<string>() };
    entry.reasons.add(reason);
    files.set(path, entry);
    this.files.set(owner.id, files);
  }

  expect(id: CheckId, caseId: string) {
    const cases = this.cases.get(id) ?? new Set<string>();
    cases.add(caseId);
    this.cases.set(id, cases);
  }
}

/** Items that own `path` in a snapshot, with the role the path plays. */
function ownersOf(snapshot: Snapshot, path: string): { id: string; kind: string; role: 'source' | 'test' | 'page' | 'demo' | 'descriptor' | 'template' }[] {
  const { catalogue } = snapshot;
  const found: ReturnType<typeof ownersOf> = [];
  const metadata = METADATA.exec(path);
  if (metadata) {
    const [, kind, id] = metadata as unknown as [string, string, string];
    const item = snapshot.model.items.find((entry) => entry.id === id && entry.kind === kind);
    if (item) found.push({ id, kind, role: 'descriptor' });
  }
  const template = TEMPLATE.exec(path);
  if (template && catalogue.setup.some((entry) => entry.id === template[1])) found.push({ id: template[1] as string, kind: 'setup', role: 'template' });
  for (const entry of catalogue.react) {
    if (path === entry.source) found.push({ id: entry.id, kind: 'react', role: 'source' });
    else if (path === entry.test) found.push({ id: entry.id, kind: 'react', role: 'test' });
    else if (path === entry.page) found.push({ id: entry.id, kind: 'react', role: 'page' });
    else if (within(path, entry.demos)) found.push({ id: entry.id, kind: 'react', role: 'demo' });
  }
  for (const entry of catalogue.elements) {
    if (path === entry.source) found.push({ id: entry.id, kind: 'element', role: 'source' });
    else if (path === entry.test) found.push({ id: entry.id, kind: 'element', role: 'test' });
  }
  for (const entry of catalogue.sourceBundles) {
    if (entry.sources.includes(path)) found.push({ id: entry.id, kind: 'source-bundle', role: 'source' });
  }
  for (const entry of catalogue.recipes) {
    if (entry.demos.includes(path)) found.push({ id: entry.id, kind: 'recipe', role: 'demo' });
  }
  return found;
}

function scenariosBoundIn(model: VerificationModel, path: string): { scenario: JoinedScenario; target: Target }[] {
  return model.scenarios.flatMap((scenario) =>
    scenario.bindings.filter((slot) => slot.binding?.path === path).map((slot) => ({ scenario, target: slot.target })),
  );
}

/** Select a scenario's cases: every target, or only `target` when just that binding is affected. */
function selectScenario(selection: Selection, id: string, reason: string, target?: Target) {
  const scenario = selection.current.model.scenarios.find((entry) => entry.id === id);
  if (!scenario) return;
  const reasons = selection.scenarios.get(id) ?? new Set<string>();
  reasons.add(target ? `${reason} (${target} only)` : reason);
  selection.scenarios.set(id, reasons);
  selection.covered.add(scenario.path);
  for (const slot of scenario.bindings) {
    if ((target && slot.target !== target) || selection.targets.has(`${id}@${slot.target}`)) continue;
    selection.targets.add(`${id}@${slot.target}`);
    if (slot.binding) selection.covered.add(slot.binding.path);
    const cases = slot.cases.map((entry) => entry.id);
    if (slot.target === 'production') {
      for (const caseId of cases) selection.expect('production-scenarios', caseId);
      selection.need('production-scenarios', `scenario ${id} registers ${cases.length} production case(s)`);
    } else if (slot.binding) {
      selection.testFile(slot.binding.path, `binds scenario ${id}`);
      const owner = suiteOf(slot.binding.path);
      if (owner) for (const caseId of cases) selection.expect(owner.id, caseId);
    }
  }
}

function selectFeature(selection: Selection, id: string, reason: string) {
  const feature = selection.current.model.features.find((entry) => entry.id === id);
  if (!feature) return;
  const reasons = selection.features.get(id) ?? new Set<string>();
  const first = reasons.size === 0;
  reasons.add(reason);
  selection.features.set(id, reasons);
  if (!first) return;
  selection.covered.add(feature.path);
  for (const scenario of feature.scenarios) selectScenario(selection, scenario, `feature ${id} is selected`);
  for (const suite of feature.supporting) selection.testFile(suite.path, `supports feature ${id}: ${suite.reason}`);
}

/** The rendered consumer runner's scene, the inventory's Projects screen, as scripts/consumer-scene.ts installs it. */
const SCENE_ENTRY = compositionExamples.find((example) => example.id === 'projects')!.files[0]!.source;
const sceneItems = new WeakMap<Snapshot, string[] | 'unprojectable'>();
/** A scene that exists but cannot be projected selects the runner from every distributed item. */
function inScene(snapshot: Snapshot, id: string): boolean {
  if (!sceneItems.has(snapshot)) {
    try { sceneItems.set(snapshot, snapshot.files.read(SCENE_ENTRY) === undefined ? [] : consumerBundle(SCENE_ENTRY, snapshot.catalogue, snapshot.files).items); }
    catch { sceneItems.set(snapshot, 'unprojectable'); }
  }
  const items = sceneItems.get(snapshot)!;
  return items === 'unprojectable' || items.includes(id);
}

/** The installed copy-bundle checks: every exposed recipe and lesson bundle, and the adapted Settings 01, as scripts/consumer-copy-bundles.ts installs them. */
const COPY_CHECKS = ['consumer-copy-vite', 'consumer-copy-next-app', 'consumer-copy-next-src'] as const;
const LINT_CHECKS = ['consumer-lint-vite', 'consumer-lint-next-app', 'consumer-lint-next-src'] as const;
const copyItems = new WeakMap<Snapshot, Set<string> | 'unprojectable'>();
function inCopyBundles(snapshot: Snapshot, id: string): boolean {
  if (!copyItems.has(snapshot)) {
    const { sources, diagnostics } = compositionProjection(snapshot.files, snapshot.catalogue);
    copyItems.set(snapshot, diagnostics.length ? 'unprojectable' : new Set([ADAPTED_BLOCK, 'tokens', 'lib', 'setup-vite', 'setup-next', ...Object.values(sources).flatMap((bundle) => bundle.items)]));
  }
  const items = copyItems.get(snapshot)!;
  return items === 'unprojectable' || items.has(id);
}

/** What selecting a catalogue item adds, by the kind its descriptor declares. */
function selectItem(selection: Selection, id: string, reason: string) {
  const { current } = selection;
  const summary = current.model.items.find((entry) => entry.id === id);
  if (!summary) return;
  const entry = selection.items.get(id) ?? { kind: summary.kind, present: true, reasons: new Set<string>() };
  const first = entry.reasons.size === 0;
  entry.reasons.add(reason);
  selection.items.set(id, entry);
  if (!first) return;
  selection.covered.add(`registry/metadata/${summary.kind}/${id}.ts`);
  for (const path of summary.paths) selection.covered.add(path);

  const { catalogue, model } = current;
  if (summary.kind === 'artifact' || id === 'tokens') {
    selection.fallback(`${id} is a token export or token source; it affects both targets, contrast, every demo and installation`, []);
    return;
  }
  if (DISTRIBUTED.has(summary.kind)) {
    selection.need('registry-build', `${id} is a distributed ${summary.kind} item`);
    selection.need('consumer-smoke', `${id} is installed by consumers; scoped runs use the full smoke until a validated selector exists`);
    if (inScene(current, id) || ['tokens', 'lib', 'setup-vite'].includes(id)) for (const check of CHECKS.filter((check) => check.id === 'consumer-proof' || /^consumer-proof-(stylex-subtree|registry|cli)$/.test(check.id))) selection.need(check.id, `${id} is installed by the Vite rendered consumer scene`);
    if (inScene(current, id) || ['tokens', 'lib', 'setup-next'].includes(id)) for (const check of CHECKS.filter((check) => /^consumer-proof-next-(app|src)(-|$)/.test(check.id))) selection.need(check.id, `${id} is installed by the Next rendered consumer scene`);
    if (['theme-mode', 'button', 'badge', 'popover', 'tokens', 'lib', 'setup-vite'].includes(id)) selection.need('consumer-mode-vite', `${id} is installed by the Vite theme-mode production scene`);
    if (['theme-mode', 'button', 'badge', 'popover', 'tokens', 'lib', 'setup-next'].includes(id)) for (const check of ['consumer-mode-next-app', 'consumer-mode-next-src'] as const) selection.need(check, `${id} is installed by the Next theme-mode production scene`);
    if (inCopyBundles(current, id)) for (const check of COPY_CHECKS) selection.need(check, `${id} is installed by the copy-bundle consumers`);
  }
  // scripts/consumer-lint.ts installs every registry:ui and registry:block item and lints it.
  if (summary.kind === 'react' || summary.kind === 'block' || id === 'lib') for (const check of LINT_CHECKS) selection.need(check, `${id} is installed and linted by the StyleX lint consumers`);
  if (id === 'setup-vite') selection.need('consumer-lint-vite', 'setup-vite is installed and linted by the Vite StyleX lint consumer');
  if (id === 'setup-next') for (const check of ['consumer-lint-next-app', 'consumer-lint-next-src'] as const) selection.need(check, 'setup-next is installed and linted by the Next StyleX lint consumers');
  if (summary.kind === 'react') {
    const react = catalogue.react.find((candidate) => candidate.id === id);
    if (react) selection.testFile(react.test, `the proof-bar suite of ${id} (${reason})`);
    for (const element of catalogue.elements.filter((candidate) => candidate.reactItem === id)) {
      selectItem(selection, element.id, `the shipped element counterpart of ${id}, with its parity gate`);
    }
    selection.need('docs-build', `the docs site renders ${id} at ${summary.route}`);
  }
  if (summary.kind === 'element') {
    selection.suite('elements-tests', `${id}: family browser and lifecycle tests, the parity gate and bundle assertions`);
    selection.need('docs-build', `the docs site serves and embeds the ${id} bundle`);
    const element = catalogue.elements.find((candidate) => candidate.id === id);
    if (element) {
      const seeds = dependantsOf(current.graph, [element.source]);
      for (const reach of seeds.values()) attributeReached(selection, reach);
    }
  }
  if (summary.kind === 'setup') {
    for (const path of current.graph.opaque) {
      if (suiteOf(path)?.id === 'docs-tests') selection.testFile(path, `reads the built registry and install guidance that setup item ${id} feeds`);
    }
  }
  if (summary.kind === 'recipe') {
    const recipe = catalogue.recipes.find((candidate) => candidate.id === id);
    if (recipe) {
      const composed = recipe.registryDependencies.filter((dependency) => catalogue.react.some((candidate) => candidate.id === dependency));
      for (const dependency of composed) {
        const react = catalogue.react.find((candidate) => candidate.id === dependency);
        if (react) selection.testFile(react.test, `the proof-bar suite of ${dependency}, which recipe ${id} composes`);
      }
      if (recipe.registryDependencies.length > 0) {
        selection.need('registry-build', `recipe ${id} has no registry item; install validation applies to its composed inputs: ${recipe.registryDependencies.join(', ')}`);
        selection.need('consumer-smoke', `recipe ${id}'s composed installable inputs: ${recipe.registryDependencies.join(', ')}`);
      }
      selection.need('docs-build', `recipe ${id} renders on /components/${recipe.page}#${recipe.section}`);
      for (const check of COPY_CHECKS) selection.need(check, `recipe ${id}'s demos are copied into installed consumers`);
      for (const reach of dependantsOf(current.graph, recipe.demos).values()) attributeReached(selection, reach);
    }
  }
  for (const scenario of model.scenarios) {
    const feature = model.features.find((candidate) => candidate.id === scenario.feature);
    if (scenario.items.includes(id) || feature?.items.includes(id)) selectScenario(selection, scenario.id, `covers item ${id}`);
  }
  for (const feature of model.features) {
    if (feature.extraDependencies.some((dependency) => dependency.item === id)) selectFeature(selection, feature.id, `declares a runtime dependency on ${id}`);
  }
}

/** Map one file the scope reaches in the current checkout to what proves it. */
function attributeReached(selection: Selection, reach: Reach) {
  const { current } = selection;
  const { path } = reach;
  if (selection.covered.has(path) && reach.via.length > 0) return;
  selection.covered.add(path);
  const why = reach.via.length === 0 ? `${path} is in scope` : `depends on ${describeEdge(reach)}`;
  const kind = current.graph.kindOf(path);

  for (const owner of ownersOf(current, path)) {
    // A recipe's demos are its executable composition, so reaching one reaches the recipe.
    if (owner.role === 'source' || owner.role === 'descriptor' || owner.role === 'template' || owner.kind === 'recipe') selectItem(selection, owner.id, why);
  }
  if (kind === 'test' || suiteOf(path)) {
    if (TEST_FILE.test(path)) selection.testFile(path, why);
    else if (!current.graph.dependants(path).some((edge) => TEST_FILE.test(edge.from))) {
      const suite = suiteOf(path);
      if (suite) selection.suite(suite.id, `${path} is a suite helper no test imports, such as a setup file`);
    }
  }
  for (const { scenario, target } of scenariosBoundIn(current.model, path)) {
    selectScenario(selection, scenario.id, `its binding ${path} ${reach.via.length === 0 ? 'is in scope' : 'is reached'}`, target);
  }
  if (within(path, PRODUCTION_TESTS.slice(0, -1)) && scenariosBoundIn(current.model, path).length === 0 && reach.via.length === 0) {
    if (!current.graph.dependants(path).length) allProduction(selection, `${path} is a production scenario support file`);
  }
  if (path.startsWith(DOCS_APP) && !within(path, 'apps/docs/src/__tests__') && !within(path, 'apps/docs/tests')) {
    selection.need('docs-build', 'docs application sources in scope change the production build');
  }
  for (const scenario of current.model.scenarios) {
    const feature = current.model.features.find((candidate) => candidate.id === scenario.feature);
    if (scenario.sources.some((source) => within(path, source)) || scenario.demos.includes(path)) selectScenario(selection, scenario.id, why);
    if (scenario.fixtures.some((fixture) => within(path, fixture.path))) selectScenario(selection, scenario.id, `${path} is its fixture`);
    for (const route of scenario.resolvedRoutes) {
      // A route table reached through its imports still defines the same routes; only its own edit counts.
      if (route.definedBy === path && reach.via.length === 0) selectScenario(selection, scenario.id, `${path} defines its route ${route.pathname}`);
      const item = route.definedBy.startsWith('catalogue item ') ? route.definedBy.slice('catalogue item '.length) : undefined;
      const page = item && current.catalogue.react.find((candidate) => candidate.id === item)?.page;
      if (page === path) selectScenario(selection, scenario.id, `${path} renders its route ${route.pathname}`);
    }
    if (feature?.sourceRoots.some((root) => within(path, root))) selectFeature(selection, feature.id, `${path} is under its source roots (${why})`);
    if (feature?.extraDependencies.some((dependency) => dependency.path && within(path, dependency.path))) {
      selectFeature(selection, feature.id, `declares a runtime dependency on ${path}`);
    }
  }
}

function allProduction(selection: Selection, reason: string) {
  selection.need('docs-build', reason);
  for (const scenario of selection.current.model.scenarios) {
    if (scenario.bindings.some((slot) => slot.target === 'production')) selectScenario(selection, scenario.id, reason, 'production');
  }
  for (const path of selection.current.graph.opaque) if (suiteOf(path)?.id === 'docs-tests') selection.testFile(path, `reads served files: ${reason}`);
}

/** Seed one path the scope names directly (a changed path or a named item's file) in the current checkout. */
function seedCurrent(selection: Selection, path: string, why: string): boolean {
  const { current } = selection;
  const release = RELEASE_INPUTS.find(([pattern]) => pattern.test(path));
  if (release) {
    selection.fallback(release[1], [path]);
    selection.mapping.set(path, `release: ${release[1]}`);
    return true;
  }
  const prose = PROSE.find(([pattern]) => pattern.test(path));
  if (prose) {
    selection.mapping.set(path, `common checks only: ${prose[1]}`);
    return true;
  }
  const feature = FEATURE_RECORD.exec(path);
  if (feature) {
    selectFeature(selection, feature[1] as string, `${path} ${why}`);
    selection.mapping.set(path, `feature record ${feature[1]}`);
    return true;
  }
  const scenario = SCENARIO_RECORD.exec(path);
  if (scenario) {
    selectScenario(selection, `${scenario[1]}.${scenario[2]}`, `${path} ${why}`);
    selection.mapping.set(path, `scenario record ${scenario[1]}.${scenario[2]}`);
    return true;
  }
  const owners = ownersOf(current, path);
  const kind = current.graph.kindOf(path);
  if (current.graph.unclassified.includes(path)) {
    selection.fallback('a source file no classification claims has unknown dependants', [path]);
    selection.mapping.set(path, 'release: unclassified source');
    return true;
  }
  if (path === REGISTRY_WIRING) {
    selection.need('registry-build', `${path} is generated wiring the registry build reads`);
    selection.need('consumer-smoke', `${path} decides what consumers install`);
  }
  const docsFile = path.startsWith(DOCS_APP);
  const imported = current.graph.dependants(path).length > 0;
  if (owners.length === 0 && kind === undefined && !docsFile && !imported && !suiteOf(path)) return false;

  selection.mapping.set(
    path,
    [
      ...owners.map((owner) => `${owner.kind} ${owner.id} (${owner.role})`),
      ...(kind ? [kind] : []),
      ...(!kind && docsFile ? ['docs application asset'] : []),
    ].join(', ') || 'imported file',
  );
  // Docs chrome, global styles and served assets render on every route, so every production scenario sees them.
  const ownedByFeature = current.model.features.some((candidate) => candidate.sourceRoots.some((root) => within(path, root)));
  if (docsFile && !ownedByFeature && (kind === 'docs' || kind === undefined) && !within(path, 'apps/docs/tests')) {
    allProduction(selection, `${path} is docs chrome, a global style or a served asset that every route renders`);
  }
  for (const reach of dependantsOf(current.graph, [path]).values()) attributeReached(selection, reach);
  return true;
}

/** A path that existed at the base but not now: a deletion or the old side of a rename. */
function seedRemoved(selection: Selection, path: string): boolean {
  const { base, current } = selection;
  const release = RELEASE_INPUTS.find(([pattern]) => pattern.test(path));
  if (release) {
    selection.fallback(release[1], [path]);
    selection.mapping.set(path, `release: ${release[1]}`);
    return true;
  }
  const prose = PROSE.find(([pattern]) => pattern.test(path));
  if (prose) {
    selection.mapping.set(path, `common checks only: ${prose[1]}`);
    return true;
  }
  if (!base) return false;
  const owners = ownersOf(base, path);
  const mapped: string[] = owners.map((owner) => `removed from ${owner.kind} ${owner.id} (${owner.role})`);
  const feature = FEATURE_RECORD.exec(path);
  const scenario = SCENARIO_RECORD.exec(path);
  if (feature) mapped.push(`removed feature record ${feature[1]}`);
  if (scenario) mapped.push(`removed scenario record ${scenario[1]}.${scenario[2]}`);

  const suite = suiteOf(path);
  if (suite && TEST_FILE.test(path)) {
    const bound = scenariosBoundIn(base.model, path).map(({ scenario: entry }) => entry.id);
    const supporting = base.model.features.filter((entry) => entry.supporting.some((suiteEntry) => suiteEntry.path === path)).map((entry) => entry.id);
    selection.deletedTests.push({ path, owners: [...owners.map((owner) => `${owner.kind} ${owner.id}`), ...bound.map((id) => `scenario ${id}`), ...supporting.map((id) => `feature ${id}`)] });
    selection.need('catalogue-freshness', `${path} was deleted; freshness proves its owner's required test and bindings still exist`);
    for (const owner of owners) {
      if (owner.role !== 'test') continue;
      if (current.model.items.some((entry) => entry.id === owner.id)) {
        selection.testFile(path, `the required proof-bar suite of ${owner.id}, deleted in this change`, false);
        selectItem(selection, owner.id, `its test ${path} was deleted`);
      }
    }
    for (const id of supporting) selectFeature(selection, id, `its supporting suite ${path} was deleted`);
    mapped.push('deleted test');
  }
  for (const owner of owners) {
    if (owner.role === 'test') continue;
    if (current.model.items.some((entry) => entry.id === owner.id)) selectItem(selection, owner.id, `${path} was removed from it`);
    else {
      const existing = selection.items.get(owner.id);
      if (existing) existing.reasons.add(`${path} was removed`);
      else selection.items.set(owner.id, { kind: owner.kind, present: false, reasons: new Set([`${path} was removed with the item`]) });
    }
  }
  if (feature) selectFeature(selection, feature[1] as string, `${path} was removed`);
  if (scenario) selectScenario(selection, `${scenario[1]}.${scenario[2]}`, `${path} was removed`);
  for (const { scenario: entry, target } of scenariosBoundIn(base.model, path)) selectScenario(selection, entry.id, `its binding ${path} was removed`, target);

  const known = base.graph.has(path) || base.files.read(path) !== undefined;
  if (!known && mapped.length === 0) return false;
  if (base.graph.unclassified.includes(path)) {
    selection.fallback('a source file no classification claims has unknown dependants', [path]);
    selection.mapping.set(path, 'release: unclassified source');
    return true;
  }
  // Former dependants still in the checkout: they imported this path at the base.
  for (const reach of dependantsOf(base.graph, [path]).values()) {
    if (reach.via.length === 0) continue;
    if (current.files.read(reach.path) === undefined) continue;
    attributeReached(selection, { ...reach, seed: `${path} (removed)` });
  }
  if (path.startsWith(DOCS_APP) && !within(path, 'apps/docs/src/__tests__') && !within(path, 'apps/docs/tests')) {
    selection.need('docs-build', `${path} was removed from the docs application`);
    if (!base.model.features.some((entry) => entry.sourceRoots.some((root) => within(path, root))) && ['docs', undefined].includes(base.graph.kindOf(path))) {
      allProduction(selection, `${path} was docs chrome, a global style or a served asset that every route rendered`);
    }
  }
  selection.mapping.set(path, mapped.join(', ') || base.graph.kindOf(path) || 'removed file');
  return true;
}

function unresolvedFallback(selection: Selection, snapshot: Snapshot, side: string) {
  if (snapshot.graph.unresolved.length === 0) return;
  selection.fallback(
    `the ${side} dependency graph has unresolved edges, so a dependant could be hidden: ${snapshot.graph.unresolved
      .map((entry) => `${entry.path}:${entry.line} "${entry.specifier}" (${entry.reason})`)
      .join('; ')}`,
    snapshot.graph.unresolved.map((entry) => entry.path),
  );
}

/** Build the ordered checks, with prerequisites closed over and every selection explained. */
function composeChecks(selection: Selection, release: boolean): PlannedCheck[] {
  const chosen = new Map<CheckId, { reasons: Set<string>; scope: PlannedCheck['scope'] }>();
  const rank = { files: 0, whole: 1, global: 2 } as const;
  const choose = (id: CheckId, scope: PlannedCheck['scope'], reasons: Iterable<string>) => {
    const entry = chosen.get(id) ?? { reasons: new Set<string>(), scope };
    for (const reason of reasons) entry.reasons.add(reason);
    if (rank[scope] > rank[entry.scope]) entry.scope = scope;
    chosen.set(id, entry);
  };

  for (const definition of CHECKS) {
    if (definition.scope === 'global') choose(definition.id, 'global', ['runs in every executable plan']);
  }
  if (release) {
    for (const definition of CHECKS) {
      if (definition.scope !== 'global') choose(definition.id, 'whole', ['the release plan runs every check and every whole suite']);
    }
    for (const scenario of selection.current.model.scenarios) {
      for (const slot of scenario.bindings) {
        const id = slot.target === 'production' ? 'production-scenarios' : slot.binding && suiteOf(slot.binding.path)?.id;
        if (id) for (const entry of slot.cases) selection.expect(id, entry.id);
      }
    }
  } else {
    for (const [id, reasons] of selection.whole) choose(id, 'whole', reasons);
    for (const [id, files] of selection.files) {
      if (!chosen.has(id)) choose(id, 'files', [`${files.size} test file(s) reached by the selection`]);
      // Files that read inputs outside their imports cannot be narrowed; they join any run of their suite.
      for (const path of selection.current.graph.opaque) {
        if (suiteOf(path)?.id === id && TEST_FILE.test(path)) selection.testFile(path, 'reads inputs outside its imports, so the graph cannot rule it out');
      }
    }
    for (const [id, reasons] of selection.checks) {
      if (id === 'production-scenarios' && (selection.cases.get(id)?.size ?? 0) === 0) continue;
      choose(id, check(id).scope === 'global' ? 'global' : 'whole', reasons);
    }
  }

  // Close over prerequisites: a scoped docs run needs the registry its package script would have built.
  for (let changed = true; changed; ) {
    changed = false;
    for (const [id, entry] of [...chosen]) {
      const definition = check(id);
      const prerequisites = [...definition.prerequisites, ...(entry.scope === 'files' ? (definition.scopedPrerequisites ?? []) : [])];
      for (const prerequisite of prerequisites) {
        if (chosen.has(prerequisite)) continue;
        choose(prerequisite, check(prerequisite).scope === 'global' ? 'global' : 'whole', [`a prerequisite of ${id}`]);
        changed = true;
      }
    }
  }

  const order = CHECKS.map((definition) => definition.id);
  const sorted: CheckId[] = [];
  const visit = (id: CheckId) => {
    if (sorted.includes(id)) return;
    const definition = check(id);
    const entry = chosen.get(id);
    for (const prerequisite of [...definition.prerequisites, ...(entry?.scope === 'files' ? (definition.scopedPrerequisites ?? []) : []), ...(definition.after ?? [])]) {
      if (chosen.has(prerequisite)) visit(prerequisite);
    }
    sorted.push(id);
  };
  for (const id of order) if (chosen.has(id)) visit(id);

  return sorted.map((id) => {
    const definition = check(id);
    const entry = chosen.get(id) as { reasons: Set<string>; scope: PlannedCheck['scope'] };
    const scoped = entry.scope === 'files';
    const files = scoped
      ? [...(selection.files.get(id) ?? new Map<string, { present: boolean; reasons: Set<string> }>())]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, value]) => ({ path, present: value.present, reasons: [...value.reasons].sort() }))
      : [];
    // `pnpm --filter <package> exec` runs in the package directory.
    const packageDirectory = (definition.tests ?? '').split('/').slice(0, 2).join('/');
    const relative = (path: string) => path.slice(packageDirectory.length + 1);
    const prerequisites = [...definition.prerequisites, ...(scoped ? (definition.scopedPrerequisites ?? []) : [])].filter((prerequisite) => chosen.has(prerequisite));
    return {
      id,
      title: definition.title,
      status: 'planned' as const,
      adapter: definition.adapter,
      argv: scoped ? [...(definition.scopedArgv as string[]), ...files.filter((file) => file.present).map((file) => relative(file.path))] : definition.argv,
      cwd: definition.cwd,
      nested: scoped ? [] : definition.nested,
      prerequisites,
      after: (definition.after ?? []).filter((earlier) => chosen.has(earlier)),
      locks: definition.locks,
      needs: definition.needs,
      deadlineSeconds: definition.deadlineSeconds,
      scope: entry.scope,
      reasons: [...entry.reasons].sort(),
      files,
      cases: [...(selection.cases.get(id) ?? [])].sort(),
    };
  });
}

export function plan(input: PlanInput): Plan {
  const { current, mode } = input;
  const base = input.base && 'failure' in input.base ? undefined : input.base;
  const selection = new Selection(current, base);

  const unreadable = ambiguous(current);
  if (mode !== 'release' && unreadable.length > 0) {
    selection.fallback(
      `the checkout's catalogue or feature map cannot be read, so ownership cannot be established; the freshness check reports it: ${unreadable.map((d) => `${d.code} ${d.path}`).join('; ')}`,
      [...new Set(unreadable.map((d) => d.path.replace(/:\d+$/, '')))],
    );
  }
  if (mode !== 'release') unresolvedFallback(selection, current, 'current');

  if (mode === 'component') {
    for (const id of input.selectors) {
      const summary = current.model.items.find((entry) => entry.id === id) as { id: string; kind: string; paths: string[] };
      selectItem(selection, id, `named by \`verify component ${id}\``);
      for (const path of summary.paths) {
        const files = current.files.read(path) !== undefined ? [path] : (current.files.list(path) ?? []).filter((entry) => !entry.directory).map((entry) => `${path}/${entry.name}`);
        for (const file of files) for (const reach of dependantsOf(current.graph, [file]).values()) attributeReached(selection, reach);
      }
    }
  } else if (mode === 'feature') {
    for (const id of input.selectors) {
      const feature = current.model.features.find((entry) => entry.id === id);
      if (!feature) continue;
      selectFeature(selection, id, `named by \`verify feature ${id}\``);
      for (const item of feature.items) selectItem(selection, item, `an item of feature ${id}`);
      for (const dependency of feature.extraDependencies) if (dependency.item) selectItem(selection, dependency.item, `a runtime dependency of feature ${id}: ${dependency.reason}`);
      const roots = [...feature.sourceRoots, ...feature.extraDependencies.flatMap((dependency) => (dependency.path ? [dependency.path] : []))];
      for (const reach of dependantsOf(
        current.graph,
        current.graph.inventory.map((entry) => entry.path).filter((path) => roots.some((root) => within(path, root))),
      ).values()) {
        attributeReached(selection, reach);
      }
    }
  } else if (mode === 'changed') {
    if (input.baseInfo?.fallback) selection.fallback(input.baseInfo.fallback);
    else if (input.base && 'failure' in input.base) selection.fallback(`the base inventory is unavailable: ${input.base.failure}`);
    else if (base && ambiguous(base).length > 0) {
      selection.fallback(
        `the base inventory is ambiguous: its catalogue or feature map cannot be read (${ambiguous(base).map((d) => `${d.code} ${d.path}`).join('; ')})`,
      );
    }
    if (base) unresolvedFallback(selection, base, 'base');
    for (const change of input.changes ?? []) {
      const now = current.files.read(change.path) !== undefined;
      const sides = [...(now ? [{ path: change.path, removed: false }] : [{ path: change.path, removed: true }]), ...(change.from ? [{ path: change.from, removed: true }] : [])];
      for (const side of sides) {
        const mapped = side.removed ? seedRemoved(selection, side.path) : seedCurrent(selection, side.path, `changed (${change.sources.join(', ')})`);
        if (!side.removed && base && (base.files.read(side.path) !== undefined)) {
          // Its dependants at the base, too: an import this change removed still had a consumer there.
          for (const reach of dependantsOf(base.graph, [side.path]).values()) {
            if (reach.via.length > 0 && current.files.read(reach.path) !== undefined) attributeReached(selection, reach);
          }
        }
        if (!mapped) {
          selection.fallback('a changed path maps to no owner, check or known input', [side.path]);
          selection.mapping.set(side.path, 'release: unmapped path');
        }
      }
    }
  }

  const release = mode === 'release' || selection.fallbacks.length > 0;
  const checks = composeChecks(selection, release);
  const behavioral = checks.some((entry) => entry.scope !== 'global');
  const unavailable = checks.filter((entry) => entry.adapter.status === 'unavailable').map((entry) => entry.id);
  const pending = release ? [...RELEASE_PENDING] : [];

  let unrelatedDirty: Plan['unrelatedDirty'] = null;
  if (mode === 'component' || mode === 'feature') {
    if (!input.dirty) unrelatedDirty = null;
    else if ('failure' in input.dirty) unrelatedDirty = { unknown: input.dirty.failure };
    else {
      const covered = [...selection.covered];
      const paths = input.dirty
        .flatMap((change) => [change.path, ...(change.from ? [change.from] : [])])
        .filter((path) => !covered.some((root) => within(path, root)));
      unrelatedDirty = { paths: [...new Set(paths)].sort(), recommendation: paths.length > 0 ? RECOMMEND : 'Every dirty path is inside the selected scope.' };
    }
  }

  return {
    schemaVersion: PLAN_VERSION,
    command: mode,
    status: 'planned',
    selectors: input.selectors,
    scope: release ? 'release' : behavioral ? 'scoped' : 'common',
    fallbacks: selection.fallbacks,
    base: input.baseInfo ?? null,
    changes: (input.changes ?? []).map((change) => ({
      ...change,
      mapping: [selection.mapping.get(change.path), change.from ? `from ${change.from}: ${selection.mapping.get(change.from) ?? 'unmapped'}` : undefined]
        .filter(Boolean)
        .join('; ') || 'unmapped',
    })),
    selection: {
      items: [...selection.items]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, entry]) => ({ id, kind: entry.kind, present: entry.present, reasons: [...entry.reasons].sort() })),
      features: [...selection.features].sort(([a], [b]) => a.localeCompare(b)).map(([id, reasons]) => ({ id, reasons: [...reasons].sort() })),
      scenarios: [...selection.scenarios].sort(([a], [b]) => a.localeCompare(b)).map(([id, reasons]) => ({ id, reasons: [...reasons].sort() })),
      deletedTests: selection.deletedTests,
    },
    unrelatedDirty,
    findings: current.diagnostics.map((d) => `${d.code} ${d.path}: ${d.message}`),
    checks,
    deadline: { overallSeconds: input.timeoutSeconds ?? DEFAULT_DEADLINE_SECONDS, source: input.timeoutSeconds ? '--timeout' : 'default' },
    output: input.output ?? null,
    outcome: {
      status: 'planned',
      ran: 0,
      passed: 0,
      canPass: unavailable.length === 0 && pending.length === 0,
      unavailable,
      pending,
      note: `Planned only: no check ran and nothing passed. ${
        unavailable.length > 0
          ? `${unavailable.length} selected check(s) have no execution adapter yet, so no run can report ${release ? 'release ' : ''}success.`
          : pending.length > 0
            ? `Every selected check has an execution adapter, but release success waits on ${pending.length} pending obligation(s).`
            : 'Every selected check has an execution adapter; only a run can pass.'
      }${
        !release && !behavioral ? ' No behavioral change was selected; the common static, freshness and type checks still run.' : ''
      }`,
    },
  };
}

export function formatPlan(document: Plan): string {
  const lines: string[] = [];
  lines.push(`verify ${document.command}${document.selectors.length > 0 ? ` ${document.selectors.join(' ')}` : ''}: ${document.status}, scope ${document.scope}`);
  lines.push(`  ${document.outcome.note}`);
  if (document.base) {
    lines.push(
      `base: ${document.base.ref} -> ${document.base.commit ?? 'unresolved'}; merge base ${document.base.mergeBase ?? 'none'}; HEAD ${document.base.head ?? 'none'}`,
    );
  }
  if (document.fallbacks.length > 0) {
    lines.push('fallbacks to the release plan:');
    for (const fallback of document.fallbacks) lines.push(`  - ${fallback.reason}${fallback.paths.length > 0 ? ` [${fallback.paths.join(', ')}]` : ''}`);
  }
  if (document.command === 'changed') {
    lines.push(`changes (${document.changes.length}):`);
    for (const change of document.changes) {
      lines.push(`  ${change.status} ${change.from ? `${change.from} -> ` : ''}${change.path} [${change.sources.join(', ')}]: ${change.mapping}`);
    }
    if (document.changes.length === 0) lines.push('  none: no behavioral change was selected');
  }
  const { items, features, scenarios, deletedTests } = document.selection;
  if (items.length + features.length + scenarios.length + deletedTests.length > 0) {
    lines.push('selection:');
    for (const item of items) lines.push(`  item ${item.id} (${item.kind}${item.present ? '' : ', removed'}): ${item.reasons.join('; ')}`);
    for (const feature of features) lines.push(`  feature ${feature.id}: ${feature.reasons.join('; ')}`);
    for (const scenario of scenarios) lines.push(`  scenario ${scenario.id}: ${scenario.reasons.join('; ')}`);
    for (const test of deletedTests) lines.push(`  deleted test ${test.path}: owned by ${test.owners.join(', ') || 'nothing registered'}`);
  }
  if (document.findings.length > 0) {
    lines.push('findings the freshness check will fail on:');
    for (const finding of document.findings) lines.push(`  ${finding}`);
  }
  lines.push(`checks (${document.checks.length}), in order; each is planned:`);
  document.checks.forEach((entry, index) => {
    lines.push(`  ${index + 1}. ${entry.id} [${entry.scope}] ${entry.title}`);
    const adapter = entry.adapter.status === 'available' ? 'adapter available' : `adapter unavailable, lands ${entry.adapter.lands}`;
    lines.push(`     $ ${entry.argv.join(' ')}  (cwd ${entry.cwd}, deadline ${entry.deadlineSeconds}s, ${adapter})`);
    if (entry.nested.length > 0) lines.push(`     nested: ${entry.nested.join('; ')}`);
    if (entry.prerequisites.length > 0) lines.push(`     requires passed: ${entry.prerequisites.join(', ')}`);
    if (entry.after.length > 0) lines.push(`     after finished: ${entry.after.join(', ')}`);
    if (entry.locks.length + entry.needs.length > 0) lines.push(`     locks: ${entry.locks.join(', ') || 'none'}; needs: ${entry.needs.join(', ') || 'none'}`);
    lines.push(`     why: ${entry.reasons.join('; ')}`);
    for (const file of entry.files) lines.push(`     file ${file.path}${file.present ? '' : ' (expected, absent)'}: ${file.reasons.join('; ')}`);
    for (const caseId of entry.cases) lines.push(`     case ${caseId}`);
  });
  if (document.unrelatedDirty) {
    if ('unknown' in document.unrelatedDirty) lines.push(`dirty paths outside the scope: unknown (${document.unrelatedDirty.unknown})`);
    else {
      lines.push(`dirty paths outside the scope (${document.unrelatedDirty.paths.length}): ${document.unrelatedDirty.paths.join(', ') || 'none'}`);
      lines.push(`  ${document.unrelatedDirty.recommendation}`);
    }
  }
  lines.push(`deadline: ${document.deadline.overallSeconds}s overall (${document.deadline.source})${document.output ? `; evidence directory ${document.output} (not written by a plan)` : ''}`);
  lines.push(`outcome: planned; ran ${document.outcome.ran}, passed ${document.outcome.passed}; unavailable: ${document.outcome.unavailable.join(', ') || 'none'}`);
  for (const obligation of document.outcome.pending) lines.push(`pending: ${obligation}`);
  return lines.join('\n');
}
