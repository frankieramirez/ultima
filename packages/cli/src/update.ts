// docs/spec/ultima.md, Consumer CLI, Update. Plans a change per installed file, writes only with --yes, and journals
// every write under `.ultima-update/<run-id>/` so `--rollback` can undo it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

import { type Diagnostic, SPEC } from './diagnostic.ts';
import { type ServedPayloads, renderAsInstalled, servedContent } from './diff.ts';
import { UPDATE, type JournalEntry, hashes, loadJournal, newRunId, recordOutputs, recordedRuns, rememberOriginals, saveJournal, startJournal, undo, writeInPlace } from './journal.ts';
import { SHADCN_ADD } from './shadcn.ts';
import { type Row, survey } from './status.ts';

export type Action = 'none' | 'replace' | 'merge' | 'conflict' | 'hold' | 'report' | 'refresh';
const ORDER: Action[] = ['none', 'replace', 'merge', 'conflict', 'hold', 'report', 'refresh'];

export type PlanRow = {
  item: string;
  file: string;
  state: Row['state'];
  action: Action;
  reason: string | null;
  /** The file has changes git has not committed. The plan still writes it, since the journal keeps the original. */
  uncommitted: boolean;
};

export type UpdatePlan = {
  registry: string;
  revision: string | null;
  /** The items the command named, empty for every installed file. */
  names: string[];
  files: PlanRow[];
  /** Named items the registry serves that this project has not installed. */
  notInstalled: string[];
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
  /** Writes one file in place; a test replaces it to simulate a failed write. */
  write?: (path: string, content: string) => void;
};

/** The action a file's state gives it, with the reason for a `report`. */
export function planAction(row: Row): { action: Action; reason: string | null } {
  switch (row.state) {
    case 'current':
    case 'edited':
      return { action: 'none', reason: null };
    case 'behind':
      return { action: 'replace', reason: null };
    case 'diverged':
      return { action: 'report', reason: row.local?.startsWith('b1:') ? 'built file, which cannot be merged' : 'no installed base' };
    case 'unstamped':
      return { action: 'report', reason: 'no installed base' };
    case 'retired':
      return { action: 'report', reason: 'the registry no longer serves it' };
    case 'unknown-scheme':
      return { action: 'report', reason: 'a hash scheme this CLI does not know' };
  }
}

export async function update(root: string, names: string[], options: UpdateOptions): Promise<{ usage: string } | { diagnostics: Diagnostic[] } | UpdateReport> {
  const surveyed = await survey(root, options);
  if ('diagnostics' in surveyed) return surveyed;
  const { report, scope, url, items } = surveyed;

  const rowsOf = (name: string) => report.files.filter(({ item }) => item === name);
  const unknown = names.filter((name) => rowsOf(name).length === 0 && !items.some((item) => item.name === name));
  if (unknown.length > 0) {
    return { usage: `${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} neither served by ${report.registry} nor installed here` };
  }

  const named = new Set(names);
  const files = report.files
    .filter((row) => names.length === 0 || named.has(row.item))
    .map((row) => ({ item: row.item, file: row.file, state: row.state, ...planAction(row) }))
    .filter((row) => row.action !== 'none' || named.has(row.item))
    .map((row) => ({ ...row, uncommitted: row.action === 'replace' && uncommitted(root, row.file) }))
    .sort((a, b) => ORDER.indexOf(a.action) - ORDER.indexOf(b.action) || a.item.localeCompare(b.item) || a.file.localeCompare(b.file));
  const plan: UpdatePlan = {
    registry: report.registry,
    revision: report.revision,
    names: [...named],
    files,
    notInstalled: [...named].filter((name) => rowsOf(name).length === 0),
  };
  if (!options.yes) return { plan, run: null };

  // Every served file is fetched before the first write, so a network failure leaves the project as it was.
  const served: ServedPayloads = new Map();
  const writes: { file: string; content: string }[] = [];
  for (const row of files.filter(({ action }) => action === 'replace')) {
    const content = await servedContent(url, row, served);
    if (content === undefined) return unfetched(row.file, url.replace('{name}', row.item));
    writes.push({ file: row.file, content: renderAsInstalled(content, scope.aliases, scope.components.rsc === true) });
  }
  if (writes.length === 0) return { plan, run: { runId: null, written: [], failed: null, next: [] } };

  const write = options.write ?? writeInPlace;
  const journal = startJournal(root, UPDATE, newRunId());
  rememberOriginals(journal, writes.map(({ file }) => file));
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
      return { plan, run: { runId: journal.runId, written, failed: { file, error }, next: [] } };
    }
    written.push(file);
    saveJournal(journal);
  }
  journal.status = 'finished';
  saveJournal(journal);
  return { plan, run: { runId: journal.runId, written, failed: null, next: [`npx ultima-design check --files ${written.join(' ')}`, typecheck(root, scope.tsconfig)] } };
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
  if (run === null) {
    if (plan.files.some(({ action }) => action === 'replace')) closing.push(['apply', ['npx ultima-design update', ...plan.names, '--yes'].join(' ')]);
  } else {
    closing.push(['wrote', run.written.join(', ') || 'none']);
    if (run.failed) closing.push(['failed', `${run.failed.file}: ${run.failed.error}`]);
    if (reported.length > 0) closing.push(['reported', reported.join(', ')]);
    if (run.runId) closing.push(['undo', `npx ultima-design update --rollback ${run.runId}`]);
    run.next.forEach((command, index) => closing.push([index === 0 ? 'next' : '', command]));
  }

  const table = [['item', 'file', 'state', 'action'], ...plan.files.map((row) => {
    const reason = [row.reason, row.uncommitted ? 'uncommitted changes, kept in the journal' : null].filter(Boolean).join('; ');
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
