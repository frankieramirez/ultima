// docs/spec/ultima.md, Consumer CLI, Update. Plans a change per installed file, writes only with --yes or --apply, and
// journals every write under `.ultima-update/<run-id>/` so `--rollback` can undo it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import ts from 'typescript';

import { ultimaPresetUrl } from '../../../apps/docs/src/ultima-preset.ts';
import { LEGACY_BASE_THEME, fileBaseTheme } from './base-theme.ts';
import { type Base, installedBase } from './base.ts';
import { LOCKFILES } from './detect.ts';
import { type Diagnostic, SPEC } from './diagnostic.ts';
import { type ServedPayloads, renderAsInstalled, servedContent } from './diff.ts';
import { DESTINATIONS, detectHarnesses, install, managedSkills } from './install.ts';
import { UPDATE, type JournalEntry, type RunJournal, fileHash, hashes, loadJournal, newRunId, recordOutputs, recordedRuns, rememberOriginals, saveJournal, startJournal, undo, writeInPlace } from './journal.ts';
import { SHADCN_ADD } from './shadcn.ts';
import type { ConsumerScope } from './scope.ts';
import { type Row, type StatusReport, survey } from './status.ts';

export type Action = 'none' | 'replace' | 'merge' | 'conflict' | 'hold' | 'report' | 'refresh';
const ORDER: Action[] = ['none', 'replace', 'merge', 'conflict', 'hold', 'report', 'refresh'];

export type PlanRow = {
  item: string;
  file: string;
  state: Row['state'];
  action: Action;
  reason: string | null;
  installed: Row['installed'];
  local: string | null;
  served: string | null;
  /** Whether a `diverged` `c1` file's installed base was rebuilt and matched its stamp; null for every other row. */
  base: 'verified' | 'unavailable' | null;
  /** The hunks a merge holds; null for every other action. */
  hunks: number | null;
  /** What a `hold` waits for the project to add: registry items as `@ultima/<name>`, npm packages by name. */
  requires: string[];
  /** The sha256 of the local file's bytes, so an edit of any kind after planning makes the plan stale. */
  sha256: string | null;
  /** The file has changes git has not committed. The plan still writes it, since the journal keeps the original. */
  uncommitted: boolean;
};

export type UpdatePlan = {
  registry: string;
  revision: string | null;
  /** The items the command named, empty for every installed file. */
  names: string[];
  files: PlanRow[];
  /** The managed skill and hook files: `refresh` where `install` would rewrite them, `report` where it would not. */
  managed: { file: string; state: string; action: Action }[];
  notices: StatusReport['notices'];
  /** Named items the registry serves that this project has not installed. */
  notInstalled: string[];
  acceptBaseTheme: boolean;
  /** The frozen Ultima preset's install command, which keeps the previous look, when a base theme change is held. */
  preset: string | null;
  /** The commands that add what held items require. `update` never runs them, and never edits `package.json`. */
  adds: string[];
};

const PLAN_KIND = 'ultima-update-plan';
const SCHEMA_VERSION = 1;

/** The plan as `--plan --json` prints it and `--apply` reads it back. */
export type PlanJson = {
  kind: typeof PLAN_KIND;
  schemaVersion: typeof SCHEMA_VERSION;
  registry: string;
  revision: string | null;
  planHash: string;
  files: PlanRow[];
  managed: UpdatePlan['managed'];
  notices: UpdatePlan['notices'];
  commands: { for: string; command: string }[];
};

export type UpdateRun = {
  runId: string | null;
  written: string[];
  failed: { file: string; error: string } | null;
  /** The commands the consumer runs next: `check --files` over what was written, then the project's typecheck. */
  next: string[];
};

export type UpdateReport = { plan: UpdatePlan; run: UpdateRun | null };

export type UpdateOptions = {
  project?: string;
  yes?: boolean;
  /** Plans a held base theme change by the file's state. Neither `yes` nor an applied plan implies it. */
  acceptBaseTheme?: boolean;
  /** The path of a plan `--plan --json` printed, to apply exactly as it was made. */
  apply?: string;
  /** Writes one file in place; a test replaces it to simulate a failed write. */
  write?: (path: string, content: string) => void;
};

const needsBase = (row: Row) => row.state === 'diverged' && row.installed?.hash.startsWith('c1:') === true;

/** The action a file's state, and for a `diverged` `c1` file its installed base, gives it, with the reason for a `report`. */
export function planAction(row: Row, base?: Base): { action: Action; reason: string | null; base: PlanRow['base'] } {
  switch (row.state) {
    case 'current':
    case 'edited':
      return { action: 'none', reason: null, base: null };
    case 'behind':
      return { action: 'replace', reason: null, base: null };
    case 'diverged':
      if (!needsBase(row)) return { action: 'report', reason: 'built file, which cannot be merged', base: null };
      if (base && 'text' in base) return { action: 'report', reason: 'installed base verified; merging is not built yet', base: 'verified' };
      return { action: 'report', reason: `no installed base: ${base?.reason ?? 'none was looked for'}`, base: 'unavailable' };
    case 'unstamped':
      return { action: 'report', reason: 'no installed base', base: null };
    case 'retired':
      return { action: 'report', reason: 'the registry no longer serves it', base: null };
    case 'unknown-scheme':
      return { action: 'report', reason: 'a hash scheme this CLI does not know', base: null };
  }
}

export async function update(root: string, names: string[], options: UpdateOptions): Promise<{ usage: string } | { diagnostics: Diagnostic[] } | UpdateReport> {
  const recorded = options.apply === undefined ? undefined : readPlan(options.apply);
  if (recorded && 'usage' in recorded) return recorded;
  const surveyed = await survey(root, options);
  if ('diagnostics' in surveyed) return surveyed;
  const { report, scope, url, items, source } = surveyed;
  const context = { scope, url, write: options.write ?? writeInPlace };
  const catalogue = { source, items, fetched: new Map() };
  const baseOf = async (rows: Row[]) => {
    const bases = new Map<Row, Base>();
    for (const row of rows.filter(needsBase)) bases.set(row, await installedBase(row, catalogue, scope));
    return bases;
  };

  if (recorded && options.apply !== undefined) {
    const now = report.files.filter(({ file }) => recorded.files.some((row) => row.file === file));
    const bases = await baseOf(now);
    const stale = staleness(root, options.apply, recorded, report, (row) => planAction(row, bases.get(row)));
    if (stale) return stale;
    const run = await applyPlan(root, recorded, context);
    return 'diagnostics' in run ? run : { plan: recorded, run };
  }

  const rowsOf = (name: string) => report.files.filter(({ item }) => item === name);
  const unknown = names.filter((name) => rowsOf(name).length === 0 && !items.some((item) => item.name === name));
  if (unknown.length > 0) {
    return { usage: `${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} neither served by ${report.registry} nor installed here` };
  }

  const named = new Set(names);
  const installedItems = new Set(report.files.map(({ item }) => item));
  const manifest = packageJson(root);
  const declared = { ...manifest?.dependencies, ...manifest?.devDependencies, ...manifest?.optionalDependencies, ...manifest?.peerDependencies };
  const missing = (item: (typeof items)[number] | undefined) => [
    ...(item?.registryDependencies ?? [])
      .map((dependency) => /^@ultima\/(.+)$/.exec(dependency)?.[1] ?? /\/([^/]+)\.json$/.exec(dependency)?.[1])
      .filter((name): name is string => name !== undefined && !installedItems.has(name))
      .map((name) => `@ultima/${name}`),
    ...(item?.dependencies ?? []).map((dependency) => dependency.replace(/(?!^)@.*$/, '')).filter((name) => !(name in declared)),
  ];
  const covered = report.files.filter((row) => names.length === 0 || named.has(row.item));
  const bases = await baseOf(covered);
  const held = (row: Row): Pick<PlanRow, 'action' | 'reason' | 'base' | 'requires'> => {
    const served = items.find(({ name }) => name === row.item);
    const base = served?.meta?.ultima?.baseTheme ?? LEGACY_BASE_THEME;
    if (!options.acceptBaseTheme && served && ['tokens', 'tokens-css'].includes(row.item) && fileBaseTheme(readFileSync(join(root, row.file), 'utf8'), row.local) !== base) {
      return { action: 'hold', reason: `base theme changes to ${base}`, base: null, requires: [] };
    }
    const planned = planAction(row, bases.get(row));
    const requires = ['replace', 'merge', 'conflict'].includes(planned.action) ? missing(served) : [];
    return requires.length > 0 ? { action: 'hold', reason: `needs ${requires.join(', ')}`, base: null, requires } : { ...planned, requires };
  };
  const files = covered
    .map((row) => planRow(root, row, held))
    .filter((row) => row.action !== 'none' || named.has(row.item))
    .map((row) => ({ ...row, uncommitted: row.action === 'replace' && uncommitted(root, row.file) }))
    .sort((a, b) => ORDER.indexOf(a.action) - ORDER.indexOf(b.action) || a.item.localeCompare(b.item) || a.file.localeCompare(b.file));
  const requires = [...new Set(files.flatMap((row) => row.requires))];
  const registryNeeds = requires.filter((name) => name.startsWith('@ultima/'));
  const npmNeeds = requires.filter((name) => !name.startsWith('@ultima/'));
  const plan: UpdatePlan = {
    registry: report.registry,
    revision: report.revision,
    names: [...named],
    files,
    managed: names.length === 0 ? managedPlan(root, report.managed).rows : [],
    notices: report.notices,
    notInstalled: [...named].filter((name) => rowsOf(name).length === 0),
    acceptBaseTheme: options.acceptBaseTheme ?? false,
    preset: files.some(({ action, requires }) => action === 'hold' && requires.length === 0) ? `${SHADCN_ADD} "${(await ultimaPresetUrl()).url}"` : null,
    adds: [...(registryNeeds.length > 0 ? [`${SHADCN_ADD} ${registryNeeds.join(' ')}`] : []), ...(npmNeeds.length > 0 ? [addCommand(root, manifest, npmNeeds)] : [])],
  };
  if (!options.yes) return { plan, run: null };
  const run = await applyPlan(root, plan, context);
  return 'diagnostics' in run ? run : { plan, run };
}

/** The one apply path, for `--yes` and `--apply` alike: writes the plan's `replace` and `refresh` rows under a journal. */
export async function applyPlan(
  root: string,
  plan: UpdatePlan,
  { scope, url, write }: { scope: ConsumerScope; url: string; write: (path: string, content: string) => void },
): Promise<UpdateRun | { diagnostics: Diagnostic[] }> {
  // Every served file is fetched before the first write, so a network failure leaves the project as it was.
  const served: ServedPayloads = new Map();
  const writes: { file: string; content: string }[] = [];
  for (const row of plan.files.filter(({ action }) => action === 'replace')) {
    const content = await servedContent(url, row, served);
    if (content === undefined) return unfetched(row.file, url.replace('{name}', row.item));
    writes.push({ file: row.file, content: renderAsInstalled(content, scope.aliases, scope.components.rsc === true) });
  }
  const refresh = plan.managed.filter(({ action }) => action === 'refresh').map(({ file }) => file);
  if (writes.length === 0 && refresh.length === 0) return { runId: null, written: [], failed: null, next: [] };

  const journal = startJournal(root, UPDATE, newRunId());
  rememberOriginals(journal, [...writes.map(({ file }) => file), ...refresh]);
  const written: string[] = [];
  for (const { file, content } of writes) {
    const entry: JournalEntry = { id: `replace ${file}`, status: 'started', at: new Date().toISOString(), before: hashes(root, [file]) };
    journal.operations.push(entry);
    saveJournal(journal);
    let error: string | undefined;
    try {
      write(join(root, file), content);
    } catch (thrown) {
      error = (thrown as Error).message;
    }
    entry.after = hashes(root, [file]);
    recordOutputs(journal, entry.after);
    Object.assign(entry, error === undefined ? { status: 'done' } : { status: 'failed', error });
    if (error !== undefined) {
      journal.status = 'stopped';
      saveJournal(journal);
      return { runId: journal.runId, written, failed: { file, error }, next: [] };
    }
    written.push(file);
    saveJournal(journal);
  }
  const next = written.length > 0 ? [`npx ultima-design check --files ${written.join(' ')}`, typecheck(root, scope.tsconfig)] : [];
  if (refresh.length > 0) {
    const error = refreshManaged(journal, refresh);
    if (error !== undefined) return { runId: journal.runId, written, failed: { file: refresh.join(', '), error }, next: [] };
    written.push(...refresh);
  }
  journal.status = 'finished';
  saveJournal(journal);
  return { runId: journal.runId, written, failed: null, next };
}

/**
 * The managed rows, from `install`'s own planner for the detected harnesses whose skill is `stale`: `refresh` for each
 * file it would rewrite, `report` for an edited skill, for a stale one no detected harness owns, and for a file it skips.
 */
function managedPlan(root: string, skills: StatusReport['managed']): { rows: UpdatePlan['managed']; harnesses: ReturnType<typeof detectHarnesses> } {
  const stale = skills.filter(({ state }) => state === 'stale').map(({ file }) => dirname(file));
  const harnesses = detectHarnesses(root).filter((harness) => stale.includes(DESTINATIONS[harness]));
  const planned = harnesses.length > 0 ? install(root, { harnesses, dryRun: true, force: false }).files : [];
  const rows: UpdatePlan['managed'] = skills
    .filter(({ file, state }) => state === 'edited' || (state === 'stale' && !planned.some((row) => row.file === file)))
    .map(({ file, state }) => ({ file, state, action: 'report' }));
  for (const { file, action } of planned) {
    if (action === 'write') rows.push({ file, state: 'stale', action: 'refresh' });
    else if (action === 'outside' || action === 'invalid') rows.push({ file, state: action, action: 'report' });
  }
  return { rows, harnesses };
}

/** Rewrites the managed files with `install` itself, so update has no skill writer of its own, and journals the write. */
function refreshManaged(journal: RunJournal, files: string[]): string | undefined {
  const { root } = journal;
  const entry: JournalEntry = { id: `refresh ${files.join(', ')}`, status: 'started', at: new Date().toISOString(), before: hashes(root, files) };
  journal.operations.push(entry);
  saveJournal(journal);
  let error: string | undefined;
  try {
    install(root, { harnesses: managedPlan(root, managedSkills(root)).harnesses, dryRun: false, force: false });
  } catch (thrown) {
    error = (thrown as Error).message;
  }
  entry.after = hashes(root, files);
  recordOutputs(journal, entry.after);
  Object.assign(entry, error === undefined ? { status: 'done' } : { status: 'failed', error });
  if (error !== undefined) journal.status = 'stopped';
  saveJournal(journal);
  return error;
}

function planRow(root: string, row: Row, decide: (row: Row) => Pick<PlanRow, 'action' | 'reason' | 'base'> & Partial<Pick<PlanRow, 'requires'>> = planAction): Omit<PlanRow, 'uncommitted'> {
  const { action, reason, base, requires = [] } = decide(row);
  return {
    item: row.item,
    file: row.file,
    state: row.state,
    action,
    reason,
    installed: row.installed,
    local: row.local,
    served: row.served,
    base,
    hunks: null,
    requires,
    sha256: fileHash(join(root, row.file)),
  };
}

/**
 * A `sha256:` digest of what an apply depends on: the registry and its revision, and each file's row with its hashes,
 * base and action. Keys and rows are sorted first, so neither key order nor the printed table changes it.
 */
export function planHash({ registry, revision, files, managed }: Pick<UpdatePlan, 'registry' | 'revision' | 'files' | 'managed'>): string {
  const byFile = <T extends { file: string }>(rows: T[]) => [...rows].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  const body = { registry, revision, files: byFile(files.map(({ uncommitted: _, ...row }) => row)), managed: byFile(managed) };
  return `sha256:${createHash('sha256').update(canonical(body)).digest('hex')}`;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const entries = Object.entries(value).filter(([, field]) => field !== undefined);
  return `{${entries.sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, field]) => `${JSON.stringify(key)}:${canonical(field)}`).join(',')}}`;
}

function readPlan(path: string): { usage: string } | UpdatePlan {
  let json: PlanJson;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { usage: `--apply could not read a plan from ${path}: ${(error as Error).message}` };
  }
  const rows = json?.files;
  if (
    json?.kind !== PLAN_KIND ||
    json.schemaVersion !== SCHEMA_VERSION ||
    !Array.isArray(rows) ||
    !rows.every((row) => typeof row?.file === 'string' && typeof row.item === 'string' && ORDER.includes(row.action) && Array.isArray(row.requires)) ||
    !Array.isArray(json.managed) ||
    !Array.isArray(json.notices) ||
    !Array.isArray(json.commands)
  ) {
    return { usage: `${path} is not a version ${SCHEMA_VERSION} ${PLAN_KIND}; make one with \`npx ultima-design update --plan --json\`` };
  }
  if (planHash(json) !== json.planHash) return { usage: `${path} was edited after it was planned; plan again and apply the new plan unchanged` };
  const commands = (label: string) => json.commands.filter((command) => command?.for === label).map(({ command }) => command);
  return {
    registry: json.registry,
    revision: json.revision,
    names: [],
    files: rows,
    managed: json.managed,
    notices: json.notices,
    notInstalled: [],
    acceptBaseTheme: false,
    preset: commands('keep')[0] ?? null,
    adds: commands('needs'),
  };
}

const INPUTS = ['item', 'state', 'installed', 'local', 'served', 'base', 'sha256'] as const;

function staleness(root: string, path: string, plan: UpdatePlan, report: StatusReport, decide: (row: Row) => ReturnType<typeof planAction>): { diagnostics: Diagnostic[] } | null {
  const changed: string[] = [];
  if (plan.registry !== report.registry || plan.revision !== report.revision) {
    changed.push(`the registry, planned at ${plan.registry} revision ${plan.revision ?? 'none'} and now ${report.registry} revision ${report.revision ?? 'none'},`);
  }
  for (const row of plan.files) {
    const now = report.files.find(({ file }) => file === row.file);
    const fresh = now && planRow(root, now, decide);
    if (!fresh || INPUTS.some((key) => canonical(fresh[key]) !== canonical(row[key]))) changed.push(row.file);
  }
  const managed = managedPlan(root, report.managed).rows;
  for (const row of plan.managed) {
    if (!managed.some((now) => canonical(now) === canonical(row))) changed.push(row.file);
  }
  if (changed.length === 0) return null;
  return {
    diagnostics: [
      {
        ruleId: 'ULT-UPDATE-003',
        severity: 'incomplete',
        file: path,
        message: `The plan is stale: ${changed.join(', ')} changed since it was planned, so nothing was written.`,
        repair: 'Plan again with `npx ultima-design update --plan --json`, review it, and apply the new plan.',
        link: `${SPEC}#update`,
      },
    ],
  };
}

const FORCE = 'npx ultima-design install --force';
const applies = (plan: UpdatePlan) => plan.files.some(({ action }) => action === 'replace') || plan.managed.some(({ action }) => action === 'refresh');
const editedSkill = (plan: UpdatePlan) => plan.managed.some(({ state }) => state === 'edited');
const acceptCommand = (plan: UpdatePlan) => ['npx ultima-design update', ...plan.names, '--accept-base-theme'].join(' ');
const applyCommand = (plan: UpdatePlan) => ['npx ultima-design update', ...plan.names, ...(plan.acceptBaseTheme ? ['--accept-base-theme'] : []), '--yes'].join(' ');

/** The object `--json` prints: the plan before an apply, the run after one. */
export function updateJson({ plan, run }: UpdateReport): PlanJson | Record<string, unknown> {
  if (run === null) {
    return {
      kind: PLAN_KIND,
      schemaVersion: SCHEMA_VERSION,
      registry: plan.registry,
      revision: plan.revision,
      planHash: planHash(plan),
      files: plan.files,
      managed: plan.managed,
      notices: plan.notices,
      commands: [
        ...(plan.preset ? [{ for: 'hold', command: acceptCommand(plan) }, { for: 'keep', command: plan.preset }] : []),
        ...plan.adds.map((command) => ({ for: 'needs', command })),
        ...(editedSkill(plan) ? [{ for: 'skill', command: FORCE }] : []),
        ...(applies(plan) ? [{ for: 'apply', command: applyCommand(plan) }] : []),
      ],
    };
  }
  const of = (action: Action) => [...plan.files, ...plan.managed].filter((row) => row.action === action).map(({ file }) => file);
  return {
    kind: 'ultima-update-run',
    schemaVersion: SCHEMA_VERSION,
    runId: run.runId,
    planHash: planHash(plan),
    written: run.written,
    conflicts: of('conflict'),
    held: of('hold'),
    reported: of('report'),
    next: run.next,
    failed: run.failed,
  };
}

export function rollbackJson({ runId, restored, left }: { runId: string; restored: string[]; left: string[] }) {
  return { kind: 'ultima-update-rollback', schemaVersion: SCHEMA_VERSION, runId, restored, left };
}

export function updateExit(result: { usage: string } | { diagnostics: Diagnostic[] } | UpdateReport): 0 | 2 | 3 {
  if ('usage' in result) return 2;
  if ('diagnostics' in result) return result.diagnostics.length > 0 ? 3 : 0;
  return result.run?.failed ? 3 : 0;
}

/** `update --rollback [<run-id>]`: the named run, else the latest one not yet rolled back. */
export function rollbackUpdate(root: string, runId: string | undefined): { diagnostics: Diagnostic[] } | { runId: string; restored: string[]; left: string[]; notes: string[] } {
  const runs = recordedRuns(root, UPDATE);
  const id = runId ?? [...runs].reverse().find((candidate) => loadJournal(root, UPDATE, candidate)?.status !== 'rolled back');
  const journal = id === undefined ? null : loadJournal(root, UPDATE, id);
  if (!journal) {
    return {
      diagnostics: [
        {
          ruleId: 'ULT-UPDATE-002',
          severity: 'incomplete',
          file: UPDATE,
          message:
            runId !== undefined
              ? `${root} holds no update run ${runId}.`
              : `${root} holds no update run to undo${runs.length > 0 ? ': every recorded run is already rolled back' : ''}.`,
          repair: runId !== undefined ? `Name one of the runs recorded there: ${runs.join(', ') || 'none'}.` : 'Nothing to do: `update --yes` records a run that can be rolled back.',
          link: `${SPEC}#update`,
        },
      ],
    };
  }
  const { restored, left, notes } = undo(journal);
  return { runId: journal.runId, restored, left, notes };
}

export function printRollback({ runId, restored, left, notes }: { runId: string; restored: string[]; left: string[]; notes: string[] }): string {
  const list = (paths: string[]) => (paths.length > 0 ? paths.join(', ') : 'none');
  return `${[
    `Rolled back update run ${runId}.`,
    '',
    `Restored  ${list(restored)}`,
    `Left      ${list(left)}`,
    ...(notes.length > 0 ? ['', 'Changed since the run, for you to recover:', ...notes] : []),
  ].join('\n')}\n`;
}

const MANAGED_REASONS: Record<string, string> = {
  edited: 'edited since install',
  stale: 'no harness detected for it; install --harness <name> refreshes it',
  outside: 'resolves outside the repository root',
  invalid: 'not valid JSON; fix it by hand',
};

export function printUpdate({ plan, run }: UpdateReport): string {
  const closing: [string, string][] = [];
  const reported = [...plan.files, ...plan.managed].filter(({ action }) => action === 'report').map(({ file }) => file);
  const held = plan.files.filter(({ action }) => action === 'hold').map(({ file }) => file);
  const holds: [string, string][] = [];
  if (plan.preset) {
    holds.push(['hold', `${acceptCommand(plan)}  (https://ultima.systems/install/update)`]);
    holds.push(['keep', `${plan.preset}  installs the Ultima preset, which keeps the previous look`]);
  }
  plan.adds.forEach((command, index) => holds.push([index === 0 ? 'needs' : '', command]));
  if (editedSkill(plan)) holds.push(['skill', `${FORCE}  replaces the edited skill, discarding its edits`]);
  if (run === null) {
    closing.push(...holds);
    if (applies(plan)) {
      closing.push(['apply', applyCommand(plan)]);
    }
  } else {
    closing.push(['wrote', run.written.join(', ') || 'none']);
    if (run.failed) closing.push(['failed', `${run.failed.file}: ${run.failed.error}`]);
    if (held.length > 0) closing.push(['held', held.join(', ')]);
    if (reported.length > 0) closing.push(['reported', reported.join(', ')]);
    closing.push(...holds);
    if (run.runId) closing.push(['undo', `npx ultima-design update --rollback ${run.runId}`]);
    run.next.forEach((command, index) => closing.push([index === 0 ? 'next' : '', command]));
  }

  const table = [['item', 'file', 'state', 'action'], ...plan.files.map((row) => {
    const reason = [row.reason, row.uncommitted ? 'uncommitted changes, kept in the journal' : null].filter(Boolean).join('; ');
    return [row.item, row.file, row.state, row.action, ...(reason ? [reason] : [])];
  }), ...plan.managed.map(({ file, state, action }) => [file.endsWith('SKILL.md') ? 'skill' : 'hook', file, state, action, ...(MANAGED_REASONS[state] && action === 'report' ? [MANAGED_REASONS[state]] : [])])];
  const width = (column: string[]) => Math.max(...column.map((cell) => cell.length)) + 2;
  const first = width([...table.map(([item]) => item as string), ...closing.map(([label]) => label)]);
  const widths = [first, ...[1, 2, 3].map((index) => width(table.map((row) => row[index] as string)))];
  const line = (cells: string[]) => cells.map((cell, index) => (index < cells.length - 1 ? cell.padEnd(widths[index] as number) : cell)).join('');

  const lines = [`Registry  ${plan.registry}  revision ${plan.revision ?? 'none'}`, ''];
  lines.push(...(table.length > 1 ? table.map(line) : ['Nothing to update.']));
  for (const name of plan.notInstalled) lines.push(`${name}: not installed; update adds nothing new: ${SHADCN_ADD} @ultima/${name}`);
  if (closing.length > 0) lines.push('', ...closing.map(([label, text]) => `${label.padEnd(first)}${text}`));
  return `${lines.join('\n')}\n`;
}

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; optionalDependencies?: Record<string, string>; peerDependencies?: Record<string, string>; packageManager?: unknown };

function packageJson(root: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  } catch {
    return undefined;
  }
}

/** The add command of the package manager the lockfile names, else `packageManager`, else npm. */
function addCommand(root: string, manifest: Manifest | undefined, packages: string[]): string {
  const declared = typeof manifest?.packageManager === 'string' ? /^([a-z]+)@/.exec(manifest.packageManager)?.[1] : undefined;
  const manager = Object.entries(LOCKFILES).find(([file]) => existsSync(join(root, file)))?.[1] ?? declared ?? 'npm';
  return `${manager} ${manager === 'npm' ? 'install' : 'add'} ${packages.join(' ')}`;
}

/** Whether git holds uncommitted changes to the file. Outside a repository, or without git, it does not. */
function uncommitted(root: string, file: string): boolean {
  try {
    return execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim() !== '';
  } catch {
    return false;
  }
}

/** The project's typecheck: its `typecheck` script, else `tsc` over the tsconfig the scope read. */
function typecheck(root: string, tsconfig: string): string {
  const pnpm = existsSync(join(root, 'pnpm-lock.yaml'));
  let scripts: Record<string, unknown> | undefined;
  try {
    scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
  } catch {
    scripts = undefined;
  }
  if (typeof scripts?.typecheck === 'string') return `${pnpm ? 'pnpm' : 'npm'} run typecheck`;
  const references = Array.isArray((ts.readConfigFile(tsconfig, ts.sys.readFile).config as { references?: unknown } | undefined)?.references);
  const project = relative(root, tsconfig) === 'tsconfig.json' ? [] : [relative(root, tsconfig)];
  const args = references ? ['-b', ...project] : ['--noEmit', ...(project.length > 0 ? ['-p', ...project] : [])];
  return [pnpm ? 'pnpm exec tsc' : 'npx tsc', ...args].join(' ');
}

function unfetched(file: string, itemUrl: string): { diagnostics: Diagnostic[] } {
  return {
    diagnostics: [
      {
        ruleId: 'ULT-UPDATE-001',
        severity: 'incomplete',
        file,
        message: `The served content for ${file} could not be fetched from ${itemUrl}, so nothing was written.`,
        repair: `Check the network and that ${itemUrl} serves the item with its file contents.`,
        link: `${SPEC}#update`,
      },
    ],
  };
}
