// docs/spec/ultima.md, Consumer CLI, Update. Plans a change per installed file, writes only with --yes or --apply, and
// journals every write under `.ultima-update/<run-id>/` so `--rollback` can undo it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

import { ultimaPresetUrl } from '../../../apps/docs/src/ultima-preset.ts';
import { LEGACY_BASE_THEME, MARKER, fileBaseTheme } from './base-theme.ts';
import { type Base, installedBase } from './base.ts';
import { LOCKFILES } from './detect.ts';
import { type Diagnostic, SPEC } from './diagnostic.ts';
import { type ServedPayloads, renderAsInstalled, servedContent } from './diff.ts';
import { UPDATE, type JournalEntry, fileHash, hashes, loadJournal, newRunId, recordOutputs, recordedRuns, rememberOriginals, saveJournal, startJournal, undo, writeInPlace } from './journal.ts';
import { merge3 } from './merge.ts';
import { SHADCN_ADD } from './shadcn.ts';
import type { ConsumerScope } from './scope.ts';
import { readStamp } from './stamp.ts';
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
  /** The hunks that conflict: 0 for a `merge`, the count for a `conflict`, null for every other action. */
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
  managed: { file: string; state: string; action: Action }[];
  notices: StatusReport['notices'];
  /** Named items the registry serves that this project has not installed. */
  notInstalled: string[];
  acceptBaseTheme: boolean;
  /** The items `--replace` named, whose files take the served file whatever their state. */
  replace: string[];
  /** A `conflict` row is written with diff3 markers. Recorded in the plan, so `--apply` writes exactly what was shown. */
  writeConflicts: boolean;
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
  writeConflicts: boolean;
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
  /** The raw URL template a catalogue served before the source keys falls back to: `SOURCE.raw`, or a test's loopback host. */
  raw?: string;
  /** Plans a held base theme change by the file's state. Neither `yes` nor an applied plan implies it. */
  acceptBaseTheme?: boolean;
  /** Items whose every file that is not `current` or `retired` takes the served file. */
  replace?: string[];
  /** Writes each conflicting file with diff3 markers, which leaves it failing to compile until someone resolves it. */
  writeConflicts?: boolean;
  /** The path of a plan `--plan --json` printed, to apply exactly as it was made. */
  apply?: string;
  /** Writes one file in place; a test replaces it to simulate a failed write. */
  write?: (path: string, content: string) => void;
};

const needsBase = (row: Row) => row.state === 'diverged' && row.installed?.hash.startsWith('c1:') === true;

/** A `diverged` file merged over its installed base: the text to write, with conflict markers when `conflicts` is not 0. */
type Merged = { conflicts: number; text: string } | { reason: string };

type Planned = Pick<PlanRow, 'action' | 'reason' | 'base' | 'hunks'>;

/**
 * The action a file's state gives it, with the reason for a `report`. A `diverged` `c1` file takes its installed base
 * and, once the base is verified, the merge over it.
 */
export function planAction(row: Row, base?: Base, merged?: Merged): Planned {
  const plain = (action: Action, reason: string | null = null): Planned => ({ action, reason, base: null, hunks: null });
  switch (row.state) {
    case 'current':
    case 'edited':
      return plain('none');
    case 'behind':
      return plain('replace');
    case 'diverged':
      if (!needsBase(row)) return plain('report', 'built file, which cannot be merged');
      if (!base || 'reason' in base) return { action: 'report', reason: `no installed base: ${base?.reason ?? 'none was looked for'}`, base: 'unavailable', hunks: null };
      if (!merged || 'reason' in merged) return { action: 'report', reason: merged?.reason ?? 'the served file was not merged', base: 'verified', hunks: null };
      return { action: merged.conflicts === 0 ? 'merge' : 'conflict', reason: null, base: 'verified', hunks: merged.conflicts };
    case 'unstamped':
      return plain('report', 'no installed base');
    case 'retired':
      return plain('report', 'the registry no longer serves it');
    case 'unknown-scheme':
      return plain('report', 'a hash scheme this CLI does not know');
  }
}

/** `--replace` takes the served file for every state but `current` and `retired`. */
function replaceAction(row: Row): Planned {
  if (row.state === 'current' || row.state === 'retired' || row.state === 'behind') return planAction(row);
  return { action: 'replace', reason: '--replace; the journal keeps the local file', base: null, hunks: null };
}

export async function update(root: string, names: string[], options: UpdateOptions): Promise<{ usage: string } | { diagnostics: Diagnostic[] } | UpdateReport> {
  const recorded = options.apply === undefined ? undefined : readPlan(options.apply);
  if (recorded && 'usage' in recorded) return recorded;
  const surveyed = await survey(root, options);
  if ('diagnostics' in surveyed) return surveyed;
  const { report, scope, url, items, source } = surveyed;
  const catalogue = { source, items, fetched: new Map() };
  const served: ServedPayloads = new Map();
  const baseOf = async (rows: Row[]) => {
    const bases = new Map<Row, Base>();
    for (const row of rows.filter(needsBase)) bases.set(row, await installedBase(row, catalogue, scope));
    return bases;
  };
  const mergeOf = async (bases: Map<Row, Base>) => {
    const merges = new Map<string, Merged>();
    for (const [row, base] of bases) if ('text' in base) merges.set(row.file, await merge(root, row, base.text, { url, scope, served }));
    return merges;
  };
  const context = (merges: Map<string, Merged>) => ({ scope, url, write: options.write ?? writeInPlace, merges });

  if (recorded && options.apply !== undefined) {
    const now = report.files.filter(({ file }) => recorded.files.some((row) => row.file === file && row.base !== null));
    const bases = await baseOf(now);
    const stale = staleness(root, options.apply, recorded, report, (row) => planAction(row, bases.get(row)));
    if (stale) return stale;
    const merging = new Set(recorded.files.filter((row) => row.action === 'merge' || row.action === 'conflict').map(({ file }) => file));
    const run = await applyPlan(root, recorded, context(await mergeOf(new Map([...bases].filter(([row]) => merging.has(row.file))))));
    return 'diagnostics' in run ? run : { plan: recorded, run };
  }

  const rowsOf = (name: string) => report.files.filter(({ item }) => item === name);
  const unknown = names.filter((name) => rowsOf(name).length === 0 && !items.some((item) => item.name === name));
  if (unknown.length > 0) {
    return { usage: `${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} neither served by ${report.registry} nor installed here` };
  }
  const replaced = new Set(options.replace);
  const absent = [...replaced].filter((name) => rowsOf(name).length === 0);
  if (absent.length > 0) return { usage: `--replace takes an installed item, and ${absent.join(', ')} ${absent.length === 1 ? 'is' : 'are'} not installed here` };

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
  const bases = await baseOf(covered.filter((row) => !replaced.has(row.item)));
  const merges = await mergeOf(bases);
  const held = (row: Row): Planned & Pick<PlanRow, 'requires'> => {
    const item = items.find(({ name }) => name === row.item);
    const base = item?.meta?.ultima?.baseTheme ?? LEGACY_BASE_THEME;
    if (!options.acceptBaseTheme && item && ['tokens', 'tokens-css'].includes(row.item) && fileBaseTheme(readFileSync(join(root, row.file), 'utf8'), row.local) !== base) {
      return { action: 'hold', reason: `base theme changes to ${base}`, base: null, hunks: null, requires: [] };
    }
    const planned = replaced.has(row.item) ? replaceAction(row) : planAction(row, bases.get(row), merges.get(row.file));
    const requires = WRITES.includes(planned.action) ? missing(item) : [];
    return requires.length > 0 ? { action: 'hold', reason: `needs ${requires.join(', ')}`, base: null, hunks: null, requires } : { ...planned, requires };
  };
  const files = covered
    .map((row) => planRow(root, row, held))
    .filter((row) => row.action !== 'none' || named.has(row.item))
    .map((row) => ({ ...row, uncommitted: writes({ writeConflicts: options.writeConflicts ?? false }, row) && uncommitted(root, row.file) }))
    .sort((a, b) => ORDER.indexOf(a.action) - ORDER.indexOf(b.action) || a.item.localeCompare(b.item) || a.file.localeCompare(b.file));
  const requires = [...new Set(files.flatMap((row) => row.requires))];
  const registryNeeds = requires.filter((name) => name.startsWith('@ultima/'));
  const npmNeeds = requires.filter((name) => !name.startsWith('@ultima/'));
  const plan: UpdatePlan = {
    registry: report.registry,
    revision: report.revision,
    names: [...named],
    files,
    managed: [],
    notices: report.notices,
    notInstalled: [...named].filter((name) => rowsOf(name).length === 0),
    acceptBaseTheme: options.acceptBaseTheme ?? false,
    replace: [...replaced],
    writeConflicts: options.writeConflicts ?? false,
    preset: files.some(({ action, requires }) => action === 'hold' && requires.length === 0) ? `${SHADCN_ADD} "${(await ultimaPresetUrl()).url}"` : null,
    adds: [...(registryNeeds.length > 0 ? [`${SHADCN_ADD} ${registryNeeds.join(' ')}`] : []), ...(npmNeeds.length > 0 ? [addCommand(root, manifest, npmNeeds)] : [])],
  };
  if (!options.yes) return { plan, run: null };
  const run = await applyPlan(root, plan, context(merges));
  return 'diagnostics' in run ? run : { plan, run };
}

const WRITES: Action[] = ['replace', 'merge', 'conflict'];
const writes = (plan: Pick<UpdatePlan, 'writeConflicts'>, { action }: Pick<PlanRow, 'action'>) => action !== 'conflict' ? WRITES.includes(action) : plan.writeConflicts;

/**
 * The one apply path, for `--yes` and `--apply` alike: writes the plan's `replace` and `merge` rows, and its `conflict`
 * rows when it writes conflicts, under a journal. `merges` holds each merged file's text, worked out from the same inputs.
 */
export async function applyPlan(
  root: string,
  plan: UpdatePlan,
  { scope, url, write, merges }: { scope: ConsumerScope; url: string; write: (path: string, content: string) => void; merges: Map<string, Merged> },
): Promise<UpdateRun | { diagnostics: Diagnostic[] }> {
  // Every served file is fetched before the first write, so a network failure leaves the project as it was.
  const served: ServedPayloads = new Map();
  const pending: { file: string; content: string; action: Action }[] = [];
  for (const row of plan.files.filter((row) => writes(plan, row))) {
    const merged = row.action === 'replace' ? undefined : merges.get(row.file);
    const content = row.action === 'replace' ? await servedContent(url, row, served) : merged && 'text' in merged ? merged.text : undefined;
    if (content === undefined) return unfetched(row.file, url.replace('{name}', row.item));
    pending.push({ file: row.file, action: row.action, content: row.action === 'replace' ? renderAsInstalled(content, scope.aliases, scope.components.rsc === true) : content });
  }
  if (pending.length === 0) return { runId: null, written: [], failed: null, next: [] };

  const journal = startJournal(root, UPDATE, newRunId());
  rememberOriginals(journal, pending.map(({ file }) => file));
  const written: string[] = [];
  for (const { file, content, action } of pending) {
    const entry: JournalEntry = { id: `${action} ${file}`, status: 'started', at: new Date().toISOString(), before: hashes(root, [file]) };
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
  journal.status = 'finished';
  saveJournal(journal);
  return { runId: journal.runId, written, failed: null, next: [`npx ultima-design check --files ${written.join(' ')}`, typecheck(root, scope.tsconfig)] };
}

function planRow(root: string, row: Row, decide: (row: Row) => Planned & Partial<Pick<PlanRow, 'requires'>> = planAction): Omit<PlanRow, 'uncommitted'> {
  const { action, reason, base, hunks, requires = [] } = decide(row);
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
    hunks,
    requires,
    sha256: fileHash(join(root, row.file)),
  };
}

/**
 * The local file merged three ways over its installed base and the served file, each as installed. The trailing stamp,
 * and the base-theme marker ahead of it, are set aside and the served ones close the result, so `status` then reports
 * the file `edited`. A conflict's text carries diff3 markers.
 */
async function merge(root: string, row: Row, base: string, { url, scope, served }: { url: string; scope: ConsumerScope; served: ServedPayloads }): Promise<Merged> {
  const content = await servedContent(url, row, served);
  if (content === undefined) return { reason: `the served file could not be fetched from ${url.replace('{name}', row.item)}` };
  const theirs = renderAsInstalled(content, scope.aliases, scope.components.rsc === true);
  const [original, ours, incoming] = [base, readFileSync(join(root, row.file), 'utf8'), theirs].map(footer) as [Footed, Footed, Footed];
  const merged = merge3(original.body, ours.body, incoming.body);
  const close = (text: string) => `${text === '' || text.endsWith('\n') ? text : `${text}\n`}${incoming.footer}`;
  if ('text' in merged) return { conflicts: 0, text: close(merged.text) };
  const labels = { local: 'local', base: `@ultima/${row.item} ${row.installed?.revision}`, served: `@ultima/${row.item} ${readStamp(content)?.revision}` };
  return { conflicts: merged.conflicts, text: close(merged.withMarkers(labels)) };
}

type Footed = { body: string; footer: string };

/** A stamped file split before its stamp line, or before the base-theme marker line that precedes the stamp. */
function footer(text: string): Footed {
  const lines = text.split(/(?<=\n)/);
  let at = lines.length;
  while (at > 0 && lines[at - 1]?.trim() === '') at -= 1;
  if (at === 0 || !readStamp(text)) return { body: text, footer: '' };
  at -= 1;
  if (at > 0 && MARKER.test(lines[at - 1]?.trim() ?? '')) at -= 1;
  return { body: lines.slice(0, at).join(''), footer: lines.slice(at).join('') };
}

/**
 * A `sha256:` digest of what an apply depends on: the registry and its revision, and each file's row with its hashes,
 * base and action. Keys and rows are sorted first, so neither key order nor the printed table changes it.
 */
export function planHash({ registry, revision, writeConflicts, files, managed }: Pick<UpdatePlan, 'registry' | 'revision' | 'writeConflicts' | 'files' | 'managed'>): string {
  const byFile = <T extends { file: string }>(rows: T[]) => [...rows].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  const body = { registry, revision, writeConflicts, files: byFile(files.map(({ uncommitted: _, ...row }) => row)), managed: byFile(managed) };
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
    typeof json.writeConflicts !== 'boolean' ||
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
    replace: [],
    writeConflicts: json.writeConflicts,
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
    // A row planned without a base, a replace or a hold, does not depend on one.
    const inputs = INPUTS.filter((key) => key !== 'base' || row.base !== null);
    if (!fresh || inputs.some((key) => canonical(fresh[key]) !== canonical(row[key]))) changed.push(row.file);
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

const acceptCommand = (plan: UpdatePlan) => ['npx ultima-design update', ...plan.names, '--accept-base-theme'].join(' ');
/** This plan's command with its decisions, and `flags` after them. */
const updateCommand = (plan: UpdatePlan, ...flags: string[]) =>
  [
    'npx ultima-design update',
    ...plan.names,
    ...(plan.acceptBaseTheme ? ['--accept-base-theme'] : []),
    ...plan.replace.flatMap((name) => ['--replace', name]),
    ...(plan.writeConflicts ? ['--write-conflicts'] : []),
    ...flags,
  ].join(' ');
const applyCommand = (plan: UpdatePlan) => updateCommand(plan, '--yes');
/** The `--replace` flags that take the served file for each item with a conflict the plan leaves unwritten. */
const replaceConflicts = (plan: UpdatePlan) =>
  plan.writeConflicts ? [] : [...new Set(plan.files.filter(({ action }) => action === 'conflict').map(({ item }) => item))].flatMap((name) => ['--replace', name]);

/** The object `--json` prints: the plan before an apply, the run after one. */
export function updateJson({ plan, run }: UpdateReport): PlanJson | Record<string, unknown> {
  if (run === null) {
    return {
      kind: PLAN_KIND,
      schemaVersion: SCHEMA_VERSION,
      registry: plan.registry,
      revision: plan.revision,
      planHash: planHash(plan),
      writeConflicts: plan.writeConflicts,
      files: plan.files,
      managed: plan.managed,
      notices: plan.notices,
      commands: [
        ...(plan.preset ? [{ for: 'hold', command: acceptCommand(plan) }, { for: 'keep', command: plan.preset }] : []),
        ...plan.adds.map((command) => ({ for: 'needs', command })),
        ...(replaceConflicts(plan).length > 0
          ? [updateCommand(plan, '--write-conflicts'), updateCommand(plan, ...replaceConflicts(plan))].map((command) => ({ for: 'conflict', command }))
          : []),
        ...(plan.files.some((row) => writes(plan, row)) ? [{ for: 'apply', command: applyCommand(plan) }] : []),
      ],
    };
  }
  const of = (action: Action) => plan.files.filter((row) => row.action === action).map(({ file }) => file);
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

export function printUpdate({ plan, run }: UpdateReport): string {
  const closing: [string, string][] = [];
  const reported = plan.files.filter(({ action }) => action === 'report').map(({ file }) => file);
  const held = plan.files.filter(({ action }) => action === 'hold').map(({ file }) => file);
  const conflicted = plan.files.filter(({ action }) => action === 'conflict').map(({ file }) => file);
  const holds: [string, string][] = [];
  if (plan.preset) {
    holds.push(['hold', `${acceptCommand(plan)}  (https://ultima.systems/install/update)`]);
    holds.push(['keep', `${plan.preset}  installs the Ultima preset, which keeps the previous look`]);
  }
  plan.adds.forEach((command, index) => holds.push([index === 0 ? 'needs' : '', command]));
  const resolve = replaceConflicts(plan).length > 0 ? `${updateCommand(plan, '--write-conflicts')}  or  ${replaceConflicts(plan).join(' ')}` : null;
  if (run === null) {
    closing.push(...holds);
    if (resolve) closing.push(['conflict', resolve]);
    if (plan.files.some((row) => writes(plan, row))) {
      closing.push(['apply', applyCommand(plan)]);
    }
  } else {
    closing.push(['wrote', run.written.join(', ') || 'none']);
    if (run.failed) closing.push(['failed', `${run.failed.file}: ${run.failed.error}`]);
    if (conflicted.length > 0) closing.push(['conflict', `${conflicted.join(', ')}  ${plan.writeConflicts ? 'written with conflict markers to resolve' : 'left unwritten'}`]);
    if (resolve) closing.push(['', resolve]);
    if (held.length > 0) closing.push(['held', held.join(', ')]);
    if (reported.length > 0) closing.push(['reported', reported.join(', ')]);
    closing.push(...holds);
    if (run.runId) closing.push(['undo', `npx ultima-design update --rollback ${run.runId}`]);
    run.next.forEach((command, index) => closing.push([index === 0 ? 'next' : '', command]));
  }

  const table = [['item', 'file', 'state', 'action'], ...plan.files.map((row) => {
    const hunks = row.action === 'conflict' ? `${row.hunks} ${row.hunks === 1 ? 'hunk' : 'hunks'}` : null;
    const reason = [hunks, row.reason, row.uncommitted ? 'uncommitted changes, kept in the journal' : null].filter(Boolean).join('; ');
    return [row.item, row.file, row.state, row.action, ...(reason ? [reason] : [])];
  })];
  const width = (column: string[]) => Math.max(...column.map((cell) => cell.length)) + 2;
  const first = width([...table.map(([item]) => item as string), ...closing.map(([label]) => label)]);
  const widths = [first, ...[1, 2, 3].map((index) => width(table.map((row) => row[index] as string)))];
  const line = (cells: string[]) => cells.map((cell, index) => (index < cells.length - 1 ? cell.padEnd(widths[index] as number) : cell)).join('');

  const lines = [`Registry  ${plan.registry}  revision ${plan.revision ?? 'none'}`, ''];
  lines.push(...(plan.files.length > 0 ? table.map(line) : ['Nothing to update.']));
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
