/**
 * `pnpm verify`, per Verification CLI and Executable feature map in docs/spec/agent-infrastructure.md.
 * This slice ships the read-only discovery commands, `list` (with `--search`) and `describe`. They
 * derive the feature map afresh from the records, the catalogue and the bindings in source, launch no
 * process and load no application or test module. The execution modes are planned and report
 * `unavailable` with exit 3 until their adapters land; they never report a pass.
 *
 * Exits: 0 discovery succeeded, 1 malformed records, 2 usage or an unknown ID, 3 unavailable mode.
 */
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatDiagnostics, loadCatalogue } from './catalogue/model.ts';
import { TARGET_DIRECTORIES } from './verification/bindings.ts';
import {
  type ItemSummary,
  type JoinedFeature,
  type JoinedScenario,
  type RepositoryFiles,
  type VerificationDiagnostic,
  type VerificationModel,
  formatVerificationDiagnostics,
  loadVerification,
  repositoryFiles,
} from './verification/model.ts';
import type { Target } from './verification/schema.ts';
import { type Candidate, search } from './verification/search.ts';

export const REPORT_VERSION = 1;

const USAGE = `usage: pnpm verify <command> [options]

Discovery (available, read-only):
  list [--search <text>] [--json]        features, scenarios and catalogue items; --search ranks candidates
  describe scenario <id> [--json]        owner, routes, fixtures, steps, variants, bindings and commands
  describe feature <id> [--json]         owner, contract, sources, scenarios and supporting suites

Execution (planned, unavailable in this build; exits 3):
  component <id>...   feature <id>...   changed --base <ref>   release

Exits: 0 discovered, 1 malformed records, 2 usage or unknown ID, 3 unavailable mode.`;

const UNAVAILABLE: Record<string, string> = {
  component: 'planning lands with #458 and execution with #460',
  feature: 'planning lands with #458 and execution with #460',
  changed: 'planning lands with #458 and execution with #460',
  release: 'planning lands with #458; the full release gate needs every adapter through #464',
};

class UsageError extends Error {}

type Command = { argv: string[]; display: string; status: 'available' | 'planned'; note: string };

const command = (argv: string[], status: Command['status'], note: string): Command => ({ argv, display: argv.join(' '), status, note });

const PACKAGES: Record<Exclude<Target, 'production'>, { name: string; directory: string }> = {
  'ui-vitest': { name: '@ultima/ui', directory: 'packages/ui' },
  'docs-vitest': { name: '@ultima/docs', directory: 'apps/docs' },
  'elements-vitest': { name: '@ultima/elements', directory: 'packages/elements' },
};

/** The existing runner commands that execute a suite file today; they run every test in it. */
function suiteCommands(target: Target, path: string, feature: string): Command[] {
  if (target === 'production') {
    return [command(['pnpm', 'verify', 'feature', feature], 'planned', 'the production runner lands with #462; this binding has not executed')];
  }
  const { name, directory } = PACKAGES[target];
  const file = path.slice(directory.length + 1);
  if (target === 'elements-vitest') {
    return [command(['pnpm', '--filter', name, 'test'], 'available', 'the whole elements suite, after its token and element builds')];
  }
  const run = command(['pnpm', '--filter', name, 'exec', 'vitest', 'run', file], 'available', `every test in ${path}, not this scenario alone`);
  return target === 'docs-vitest'
    ? [command(['pnpm', 'registry:build'], 'available', 'the docs suites read the built registry'), run]
    : [run];
}

function manifest(files: RepositoryFiles, inputs: string[]) {
  const hash = createHash('sha256');
  for (const path of [...inputs].sort()) hash.update(`${path}\0${files.read(path) ?? ''}\0`);
  return { algorithm: 'sha256', digest: hash.digest('hex'), files: inputs.length };
}

function recording(files: RepositoryFiles) {
  const read = new Set<string>();
  const recorded: RepositoryFiles = {
    ...files,
    read(path) {
      const text = files.read(path);
      if (text !== undefined) read.add(path);
      return text;
    },
  };
  return { files: recorded, read };
}

export function discover(root: string) {
  const { files, read } = recording(repositoryFiles(root));
  const { catalogue, diagnostics: catalogueDiagnostics } = loadCatalogue(files);
  const { model, diagnostics } = loadVerification(files, catalogue);
  return { model, catalogueDiagnostics, diagnostics, sourceManifest: manifest(files, [...read]) };
}

function registrationOf(model: VerificationModel, item: ItemSummary) {
  const scenarios = model.scenarios.filter(
    (scenario) => scenario.items.includes(item.id) || model.features.find((f) => f.id === scenario.feature)?.items.includes(item.id),
  );
  return scenarios.length > 0
    ? { status: 'registered' as const, scenarios: scenarios.map((scenario) => scenario.id), note: `covered by ${scenarios.length} registered scenario(s)` }
    : {
        status: 'catalogue-only' as const,
        scenarios: [],
        note: 'no executable feature scenario is registered for this item yet; its existing component proof still applies',
      };
}

function itemCommands(item: ItemSummary): Command[] {
  const planned = command(['pnpm', 'verify', 'component', item.id], 'planned', UNAVAILABLE.component as string);
  if (item.kind === 'react' && item.test) return [planned, ...suiteCommands('ui-vitest', item.test, '')];
  if (item.kind === 'element' && item.test) return [planned, ...suiteCommands('elements-vitest', item.test, '')];
  return [planned];
}

type ItemDetail = { kind: string; sources: string[]; route: string | null; registration: ReturnType<typeof registrationOf>; commands: Command[] };
type ScenarioDetail = { feature: string; routes: string[]; bindings: { target: Target; location: string | null }[]; commands: Command[] };

function describeCandidate(model: VerificationModel, candidate: Candidate) {
  if (candidate.type === 'item') {
    const item = model.items.find((entry) => entry.id === candidate.id) as ItemSummary;
    const detail: ItemDetail = { kind: item.kind, sources: item.paths, route: item.route ?? null, registration: registrationOf(model, item), commands: itemCommands(item) };
    return detail;
  }
  if (candidate.type === 'feature') {
    const feature = model.features.find((entry) => entry.id === candidate.id) as JoinedFeature;
    return {
      contract: feature.contract,
      scenarios: feature.scenarios,
      commands: [command(['pnpm', 'verify', 'describe', 'feature', feature.id], 'available', 'ownership, scenarios and supporting suites')],
    };
  }
  const scenario = model.scenarios.find((entry) => entry.id === candidate.id) as JoinedScenario;
  const detail: ScenarioDetail = {
    feature: scenario.feature,
    routes: scenario.resolvedRoutes.map((route) => route.pathname),
    bindings: scenario.bindings.map((slot) => ({ target: slot.target, location: slot.binding ? `${slot.binding.path}:${slot.binding.line}` : null })),
    commands: [command(['pnpm', 'verify', 'describe', 'scenario', scenario.id], 'available', 'steps, variants, bindings and runnable scope')],
  };
  return detail;
}

function scenarioDocument(model: VerificationModel, scenario: JoinedScenario) {
  const feature = model.features.find((entry) => entry.id === scenario.feature) as JoinedFeature;
  const items = scenario.items.map((id) => model.items.find((item) => item.id === id) as ItemSummary);
  return {
    id: scenario.id,
    title: scenario.title,
    intent: scenario.intent,
    record: scenario.path,
    feature: { id: feature.id, title: feature.title, record: feature.path },
    contract: scenario.contract,
    ownership: {
      items: items.map((item) => ({ id: item.id, kind: item.kind, paths: item.paths })),
      sources: scenario.sources,
      demos: scenario.demos,
    },
    routes: scenario.resolvedRoutes,
    fixtures: scenario.fixtures,
    preconditions: scenario.preconditions,
    steps: scenario.steps,
    targets: scenario.bindings.map((slot) => ({
      target: slot.target,
      binding: slot.binding ? { path: slot.binding.path, line: slot.binding.line } : null,
      executed: false,
      cases: slot.cases.map((entry) => entry.id),
      commands: slot.binding ? suiteCommands(slot.target, slot.binding.path, feature.id) : [],
    })),
    scope: {
      command: command(['pnpm', 'verify', 'feature', feature.id], 'planned', UNAVAILABLE.feature as string),
      note: `There is no single-scenario mode. The feature command runs every required case of ${feature.id} (${feature.scenarios.join(', ')}) plus its dependency checks, so its result is never a single-case pass.`,
    },
  };
}

function featureDocument(model: VerificationModel, feature: JoinedFeature) {
  return {
    id: feature.id,
    title: feature.title,
    summary: feature.summary,
    record: feature.path,
    contract: feature.contract,
    aliases: feature.aliases,
    ownership: {
      items: feature.items.map((id) => {
        const item = model.items.find((entry) => entry.id === id) as ItemSummary;
        return { id, kind: item.kind, paths: item.paths, route: item.route ?? null };
      }),
      sourceRoots: feature.sourceRoots,
      extraDependencies: feature.extraDependencies,
    },
    scenarios: feature.scenarios.map((id) => {
      const scenario = model.scenarios.find((entry) => entry.id === id) as JoinedScenario;
      return { id, title: scenario.title, targets: scenario.bindings.map((slot) => slot.target) };
    }),
    supporting: feature.supporting.map((suite) => ({
      ...suite,
      commands: suiteCommands((Object.entries(TARGET_DIRECTORIES).find(([, d]) => suite.path.startsWith(`${d}/`))?.[0] ?? 'docs-vitest') as Target, suite.path, feature.id),
    })),
    scope: {
      command: command(['pnpm', 'verify', 'feature', feature.id], 'planned', UNAVAILABLE.feature as string),
      note: 'Runs every registered scenario case of this feature plus its item proof-bar, supporting suites and build/install checks once available.',
    },
  };
}

function modes() {
  return [
    { mode: 'list', status: 'available' },
    { mode: 'describe', status: 'available' },
    ...Object.entries(UNAVAILABLE).map(([mode, note]) => ({ mode, status: 'unavailable', note })),
  ];
}

const formatCommands = (commands: Command[], indent = '    ') =>
  commands.map((c) => `${indent}${c.status === 'available' ? '$' : '(planned)'} ${c.display}  — ${c.note}`).join('\n');

function humanScenario(document: ReturnType<typeof scenarioDocument>): string {
  return [
    `${document.id} — ${document.title}`,
    `  ${document.intent}`,
    `  feature: ${document.feature.id} (${document.feature.record})`,
    `  contract: ${document.contract}`,
    `  record: ${document.record}`,
    `  items: ${document.ownership.items.map((item) => `${item.id} [${item.paths.join(', ')}]`).join('; ') || 'none'}`,
    `  sources: ${document.ownership.sources.join(', ') || 'none'}`,
    `  demos: ${document.ownership.demos.join(', ') || 'none'}`,
    `  routes: ${document.routes.map((route) => `${route.pathname} (${route.definedBy})`).join(', ') || 'none'}`,
    '  fixtures:',
    ...document.fixtures.map(
      (f) => `    ${f.name}: ${f.path}, reset ${f.reset}${f.storage ? `; storage ${f.storage.keys.join(', ')}: ${f.storage.reason}` : ''}`,
    ),
    '  preconditions:',
    ...document.preconditions.map((p) => `    - ${p}`),
    '  steps:',
    ...document.steps.map((s, i) => `    ${i + 1}. ${s.action}\n       expect: ${s.expect}`),
    '  targets:',
    ...document.targets.flatMap((t) => [
      `    ${t.target}: ${t.binding ? `${t.binding.path}:${t.binding.line}` : 'no binding'} (not executed by discovery)`,
      ...t.cases.map((c) => `      case ${c}`),
      ...(t.commands.length > 0 ? [formatCommands(t.commands, '      ')] : []),
    ]),
    '  scope:',
    formatCommands([document.scope.command]),
    `    ${document.scope.note}`,
  ].join('\n');
}

function humanFeature(document: ReturnType<typeof featureDocument>): string {
  return [
    `${document.id} — ${document.title}`,
    `  ${document.summary}`,
    `  contract: ${document.contract}`,
    `  record: ${document.record}`,
    `  aliases: ${document.aliases.join(', ') || 'none'}`,
    `  items: ${document.ownership.items.map((item) => `${item.id} [${item.paths.join(', ')}]${item.route ? ` ${item.route}` : ''}`).join('; ') || 'none'}`,
    `  source roots: ${document.ownership.sourceRoots.join(', ') || 'none'}`,
    `  extra dependencies: ${document.ownership.extraDependencies.map((d) => `${d.item ?? d.path} (${d.reason})`).join(', ') || 'none'}`,
    '  scenarios:',
    ...document.scenarios.map((s) => `    ${s.id} — ${s.title} [${s.targets.join(', ')}]`),
    '  supporting suites:',
    ...document.supporting.flatMap((s) => [`    ${s.path}: ${s.reason}`, formatCommands(s.commands, '      ')]),
    '  scope:',
    formatCommands([document.scope.command]),
    `    ${document.scope.note}`,
  ].join('\n');
}

type Output = { exit: number; stdout: string; stderr: string };

function dispatch(argv: string[], root: string): Output {
  const json = argv.includes('--json');
  const args = argv.filter((arg) => arg !== '--json');
  const out = (document: object, human: string, exit = 0): Output => ({
    exit,
    stdout: `${json ? JSON.stringify({ schemaVersion: REPORT_VERSION, ...document }, null, 2) : human}\n`,
    stderr: '',
  });
  const [mode, ...rest] = args;

  if (mode === undefined || mode === '--help' || mode === '-h' || rest.includes('--help')) {
    return out({ command: 'help', status: 'help', modes: modes() }, USAGE);
  }

  const { model, catalogueDiagnostics, diagnostics, sourceManifest } = discover(root);
  const invalid: (VerificationDiagnostic | { code: string; path: string; message: string })[] = [...catalogueDiagnostics, ...diagnostics];
  if (invalid.length > 0) {
    return out(
      { command: mode, status: 'invalid', diagnostics: invalid, sourceManifest },
      `verify: the feature map is invalid, so nothing was discovered\n${formatDiagnostics(catalogueDiagnostics)}${catalogueDiagnostics.length > 0 ? '\n' : ''}${formatVerificationDiagnostics(diagnostics)}`,
      1,
    );
  }

  if (mode === 'list') {
    const searchIndex = rest.indexOf('--search');
    const unknown = rest.filter((arg, index) => !(index === searchIndex || index === searchIndex + 1));
    if (unknown.length > 0 || (searchIndex >= 0 && rest[searchIndex + 1] === undefined)) {
      throw new UsageError(`list takes [--search <text>] [--json]; got ${rest.join(' ')}`);
    }
    if (searchIndex >= 0) {
      const text = rest[searchIndex + 1] as string;
      const { query, candidates } = search(model, text);
      const detailed = candidates.map((candidate) => ({ ...candidate, ...describeCandidate(model, candidate) }));
      const suggestion = candidates.length === 0 ? 'No candidate matched. Run `pnpm verify list` for every feature, scenario and item.' : null;
      const human = [
        `search "${text}" (tokens: ${query.join(', ') || 'none'}): ${candidates.length} candidate(s), best first. Nothing runs automatically.`,
        ...detailed.map((c) => {
          const reasons = c.reasons.map((r) => `${r.field} "${r.value}" [${r.tokens.join(', ')}]`).join('; ');
          const lines = [`  ${c.type} ${c.id} — ${c.title}`, `    matched: ${reasons}`];
          const { sources, route, registration, feature, routes, bindings } = c as Partial<ItemDetail & ScenarioDetail>;
          if (sources && registration) {
            lines.push(`    source: ${sources.join(', ') || 'none'}${route ? `; route ${route}` : ''}`);
            lines.push(
              `    registration: ${registration.status}: ${registration.note}${registration.scenarios.length > 0 ? ` (${registration.scenarios.join(', ')})` : ''}`,
            );
          }
          if (routes && bindings) {
            lines.push(`    feature ${feature}; routes ${routes.join(', ')}; bindings ${bindings.map((b) => `${b.target} ${b.location ?? 'none'}`).join(', ')}`);
          }
          lines.push(formatCommands(c.commands));
          return lines.join('\n');
        }),
        ...(suggestion ? [suggestion] : []),
      ].join('\n');
      return out({ command: 'list', status: 'discovered', search: { text, tokens: query }, candidates: detailed, suggestion, sourceManifest }, human);
    }
    const document = {
      command: 'list',
      status: 'discovered',
      sourceManifest,
      modes: modes(),
      features: model.features.map((f) => ({ id: f.id, title: f.title, contract: f.contract, record: f.path, scenarios: f.scenarios })),
      scenarios: model.scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        feature: s.feature,
        targets: s.bindings.map((slot) => ({
          target: slot.target,
          binding: slot.binding ? `${slot.binding.path}:${slot.binding.line}` : null,
          cases: slot.cases.map((entry) => entry.id),
        })),
      })),
      items: model.items.map((item) => ({ id: item.id, kind: item.kind, title: item.title, registration: registrationOf(model, item).status })),
    };
    const human = [
      `features (${document.features.length}):`,
      ...document.features.map((f) => `  ${f.id} — ${f.title}: ${f.scenarios.join(', ') || 'no scenarios'}`),
      `scenarios (${document.scenarios.length}):`,
      ...document.scenarios.map((s) => `  ${s.id} — ${s.title}\n${s.targets.map((t) => `    ${t.target}: ${t.cases.length} case(s), binding ${t.binding ?? 'none'}`).join('\n')}`),
      `catalogue items (${document.items.length}):`,
      ...[...new Set(document.items.map((item) => item.kind))].map(
        (kind) => `  ${kind}: ${document.items.filter((item) => item.kind === kind).map((item) => item.id).join(', ')}`,
      ),
      'modes:',
      ...document.modes.map((m) => `  ${m.mode}: ${m.status}${'note' in m ? ` (${m.note})` : ''}`),
      `source manifest: ${sourceManifest.algorithm} ${sourceManifest.digest} over ${sourceManifest.files} files`,
    ].join('\n');
    return out(document, human);
  }

  if (mode === 'describe') {
    const [type, id, ...extra] = rest;
    if ((type !== 'scenario' && type !== 'feature') || id === undefined || extra.length > 0) {
      throw new UsageError('describe takes `scenario <id>` or `feature <id>`');
    }
    if (type === 'scenario') {
      const scenario = model.scenarios.find((entry) => entry.id === id);
      if (!scenario) throw new UsageError(`unknown scenario "${id}"; available: ${model.scenarios.map((s) => s.id).join(', ')}`);
      const document = scenarioDocument(model, scenario);
      return out({ command: 'describe', status: 'discovered', type, scenario: document, sourceManifest }, humanScenario(document));
    }
    const feature = model.features.find((entry) => entry.id === id);
    if (!feature) throw new UsageError(`unknown feature "${id}"; available: ${model.features.map((f) => f.id).join(', ')}`);
    const document = featureDocument(model, feature);
    return out({ command: 'describe', status: 'discovered', type, feature: document, sourceManifest }, humanFeature(document));
  }

  if (mode in UNAVAILABLE) {
    const ids = rest.filter((arg) => !arg.startsWith('--'));
    const choices = mode === 'component' ? model.items.map((item) => item.id) : mode === 'feature' ? model.features.map((f) => f.id) : [];
    if ((mode === 'component' || mode === 'feature') && ids.length === 0) throw new UsageError(`${mode} needs at least one ID; available: ${choices.join(', ')}`);
    const unknown = ids.filter((id) => (mode === 'component' || mode === 'feature') && !choices.includes(id));
    if (unknown.length > 0) throw new UsageError(`unknown ${mode} ID ${unknown.map((id) => `"${id}"`).join(', ')}; available: ${choices.join(', ')}`);
    return out(
      { command: mode, status: 'unavailable', selectors: ids, note: UNAVAILABLE[mode] },
      `verify ${mode}: unavailable in this build (${UNAVAILABLE[mode]}). Nothing ran and nothing passed.`,
      3,
    );
  }

  throw new UsageError(`unknown command "${mode}"\n${USAGE}`);
}

export function run(argv: string[], root: string): Output {
  try {
    return dispatch(argv, root);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    const document = { schemaVersion: REPORT_VERSION, command: argv[0] ?? null, status: 'usage-error', message: error.message };
    return { exit: 2, stdout: argv.includes('--json') ? `${JSON.stringify(document, null, 2)}\n` : '', stderr: `verify: ${error.message}\n` };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exit, stdout, stderr } = run(process.argv.slice(2), join(dirname(fileURLToPath(import.meta.url)), '..'));
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exitCode = exit;
}
