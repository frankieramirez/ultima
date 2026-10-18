// The recovery record of `init` in an existing application (docs/spec/consumer-setup.md, Conflicts, idempotence and
// recovery) and of `update` (docs/spec/ultima.md, Update, Journal and rollback). Before a run writes, it saves the
// original bytes and mode of every path it may write under `<recovery>/<run-id>/` at the project root, then journals
// each operation with the hashes it found and left and, for `init`, each subprocess's exit. A rerun of `init` continues
// its latest unfinished run; `--rollback` undoes only what still holds the bytes the run left.
import { randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import type { InitIO } from './init.ts';
import type { Manager } from './recipe.ts';
import { sha256 } from './recipe.ts';

/** The directory at the project root that holds a command's runs. */
export type Recovery = '.ultima-init' | '.ultima-update';
export const INIT = '.ultima-init' satisfies Recovery;
export const UPDATE = '.ultima-update' satisfies Recovery;
const KINDS = { '.ultima-init': 'ultima-init-journal', '.ultima-update': 'ultima-update-journal' } as const;
const VERSION = 1;
const RUN_ID = /^[0-9TZ-]+-[0-9a-f]{6}$/;

export type JournalEntry = {
  id: string;
  status: 'started' | 'done' | 'failed';
  at: string;
  /** The sha256 of each path the operation may write, null when absent: `before` as it started, `after` as it ended. */
  before: Record<string, string | null>;
  after?: Record<string, string | null>;
  exit?: number;
  log?: string;
  error?: string;
};

export type RunJournal = {
  kind: (typeof KINDS)[Recovery];
  schemaVersion: typeof VERSION;
  runId: string;
  root: string;
  status: 'running' | 'stopped' | 'finished' | 'rolled back';
  /** Each path the run may write, as it was before the run first touched it; the bytes are in `files/<sha256>`. */
  originals: Record<string, { sha256: string; mode: number } | null>;
  /** Directories the run's paths sit in that did not exist before it, which rollback removes once empty. */
  directories: string[];
  /** The sha256 each path held when the run last wrote it, null when it removed it; absent when it holds the original. */
  outputs: Record<string, string | null>;
  operations: JournalEntry[];
  rollback?: { at: string; restored: string[]; removed: string[]; left: string[] };
};

/** `init`'s journal. */
export type Journal = RunJournal & {
  manager: Manager;
  lockfile: string;
  /** The planHash of each apply that ran under this id: the first, then every resume. */
  plans: string[];
  /** The registry payloads pinned before shadcn ran, and the destinations it was to create. */
  payloads: { item: string; url: string; sha256: string }[];
  creates: string[];
  /** The dependencies this run added to package.json, as it wrote them, and the version each tested package resolved to before it. */
  dependencies: Record<string, string>;
  versions: Record<string, string>;
};

type Journals = { '.ultima-init': Journal; '.ultima-update': RunJournal };

export const initCli = (manager: Manager) => (manager === 'npm' ? 'npx ultima-design init' : 'pnpm exec ultima init');
export const newRunId = () => `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
export const recoveryDirectory = (root: string, recovery: Recovery, runId: string) => join(root, recovery, runId);
const recoveryOf = (journal: RunJournal) => (Object.keys(KINDS) as Recovery[]).find((recovery) => KINDS[recovery] === journal.kind) as Recovery;

export function fileHash(path: string): string | null {
  try {
    return lstatSync(path).isFile() ? sha256(readFileSync(path)) : null;
  } catch {
    return null;
  }
}

/** Makes the run's directory, private to its owner, and returns a journal with nothing recorded yet. */
export function startJournal(root: string, recovery: Recovery, runId: string): RunJournal {
  mkdirSync(join(root, recovery), { recursive: true });
  // Git ignores the directory through its own .gitignore, so the consumer's is never edited.
  if (!existsSync(join(root, recovery, '.gitignore'))) writeFileSync(join(root, recovery, '.gitignore'), '*\n');
  mkdirSync(join(recoveryDirectory(root, recovery, runId), 'files'), { recursive: true });
  chmodSync(recoveryDirectory(root, recovery, runId), 0o700);
  return { kind: KINDS[recovery], schemaVersion: VERSION, runId, root, status: 'running', originals: {}, directories: [], outputs: {}, operations: [] };
}

export function createJournal(root: string, runId: string, manager: Manager, lockfile: string): Journal {
  return { ...startJournal(root, INIT, runId), manager, lockfile, plans: [], payloads: [], creates: [], dependencies: {}, versions: {} };
}

export function loadJournal<R extends Recovery>(root: string, recovery: R, runId: string): Journals[R] | null {
  if (!RUN_ID.test(runId)) return null;
  try {
    const journal = JSON.parse(readFileSync(join(recoveryDirectory(root, recovery, runId), 'journal.json'), 'utf8')) as Journals[R];
    return journal.kind === KINDS[recovery] && journal.schemaVersion === VERSION && journal.runId === runId ? { ...journal, root } : null;
  } catch {
    return null;
  }
}

/** The run ids recorded under the recovery directory, oldest first. */
export function recordedRuns(root: string, recovery: Recovery): string[] {
  const directory = join(root, recovery);
  return existsSync(directory) ? readdirSync(directory).filter((name) => RUN_ID.test(name)).sort() : [];
}

/** The latest run that neither finished nor was rolled back, which a rerun continues. */
export function unfinishedJournal(root: string): Journal | null {
  for (const runId of recordedRuns(root, INIT).reverse()) {
    const journal = loadJournal(root, INIT, runId);
    if (journal && (journal.status === 'running' || journal.status === 'stopped')) return journal;
  }
  return null;
}

/** Written to a sibling and renamed, so an interruption leaves the previous journal whole. */
export function saveJournal(journal: RunJournal) {
  const path = join(recoveryDirectory(journal.root, recoveryOf(journal), journal.runId), 'journal.json');
  writeFileSync(`${path}.tmp`, `${JSON.stringify(journal, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

/** Saves the original of each path the run has not touched before, and the directories it would create. */
export function rememberOriginals(journal: RunJournal, paths: string[]) {
  const { root } = journal;
  for (const path of paths) {
    if (path in journal.originals) continue;
    const absolute = join(root, path);
    const hash = fileHash(absolute);
    if (hash === null) {
      journal.originals[path] = null;
      for (let directory = dirname(path); directory !== '.' && !existsSync(join(root, directory)); directory = dirname(directory)) {
        if (!journal.directories.includes(directory)) journal.directories.push(directory);
      }
      continue;
    }
    const blob = join(recoveryDirectory(root, recoveryOf(journal), journal.runId), 'files', hash);
    if (!existsSync(blob)) copyFileSync(absolute, blob);
    journal.originals[path] = { sha256: hash, mode: lstatSync(absolute).mode & 0o7777 };
  }
  saveJournal(journal);
}

export function hashes(root: string, paths: string[]): Record<string, string | null> {
  return Object.fromEntries(paths.map((path) => [path, fileHash(join(root, path))]));
}

/** Records what each path holds now as this run's output, or forgets it when it holds the original again. */
export function recordOutputs(journal: RunJournal, after: Record<string, string | null>) {
  for (const [path, hash] of Object.entries(after)) {
    if (hash === (journal.originals[path]?.sha256 ?? null)) delete journal.outputs[path];
    else journal.outputs[path] = hash;
  }
}

/** Replaces a file through a sibling and a rename, keeping the mode it had. */
export function writeInPlace(path: string, content: string | Buffer, mode?: number) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.ultima-init-${randomBytes(3).toString('hex')}`;
  writeFileSync(temporary, content);
  const keep = mode ?? (existsSync(path) ? lstatSync(path).mode & 0o7777 : undefined);
  if (keep !== undefined) chmodSync(temporary, keep);
  renameSync(temporary, path);
}

function removeIfEmpty(directory: string) {
  try {
    rmdirSync(directory);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOTEMPTY' && code !== 'EEXIST' && code !== 'ENOENT') throw error;
  }
}

/**
 * Restores originals and removes created files only where they still hold the run's output, lists the rest with a note
 * on recovering each, and records the rollback in the journal.
 */
export function undo(journal: RunJournal): { restored: string[]; removed: string[]; left: string[]; notes: string[] } {
  const { root } = journal;
  const directory = recoveryDirectory(root, recoveryOf(journal), journal.runId);
  const restored: string[] = [];
  const removed: string[] = [];
  const left: string[] = [];
  const notes: string[] = [];
  for (const [path, output] of Object.entries(journal.outputs).sort(([a], [b]) => a.localeCompare(b))) {
    const absolute = join(root, path);
    const original = journal.originals[path] ?? null;
    const current = fileHash(absolute);
    if (current === (original?.sha256 ?? null)) continue;
    if (current !== output) {
      left.push(path);
      notes.push(
        original
          ? `  - ${path} changed after this run wrote it, so it was left as it is. Its original is ${join(directory, 'files', original.sha256)}: compare and restore it by hand.`
          : `  - ${path} did not exist before this run and changed after it was written, so it was left. Delete it by hand if you do not want it.`,
      );
      continue;
    }
    if (original) {
      writeInPlace(absolute, readFileSync(join(directory, 'files', original.sha256)), original.mode);
      restored.push(path);
    } else {
      rmSync(absolute);
      removed.push(path);
    }
  }
  for (const created of [...journal.directories].sort((a, b) => b.split('/').length - a.split('/').length || b.localeCompare(a))) {
    removeIfEmpty(join(root, created));
  }
  journal.status = 'rolled back';
  journal.rollback = { at: new Date().toISOString(), restored, removed, left };
  saveJournal(journal);
  return { restored, removed, left, notes };
}

/** `init --rollback <run-id>`: undoes the run and names the reinstall a restored package.json needs. */
export function rollback(root: string, runId: string, io: InitIO): number {
  const journal = loadJournal(root, INIT, runId);
  if (!journal) {
    io.err(`ultima init: ${root} has no init run ${runId}. Runs recorded there: ${recordedRuns(root, INIT).join(', ') || 'none'}\n`);
    return 2;
  }
  const directory = recoveryDirectory(root, INIT, runId);
  const { restored, removed, left, notes } = undo(journal);
  const packageFiles = ['package.json', journal.lockfile].filter((path) => restored.includes(path) || removed.includes(path));
  const lockfile = journal.originals[journal.lockfile] !== null && journal.originals[journal.lockfile] !== undefined;
  const reinstall = journal.manager === 'npm' ? (lockfile ? 'npm ci' : 'npm install') : lockfile ? 'pnpm install --frozen-lockfile' : 'pnpm install';

  const list = (paths: string[]) => (paths.length > 0 ? paths.join(', ') : 'none');
  io.out(
    [
      `Rolled back init run ${runId} in ${root}.`,
      '',
      `Restored   ${list(restored)}`,
      `Removed    ${list(removed)}`,
      `Left       ${list(left)}`,
      ...(notes.length > 0 ? ['', 'Changed since the run, for you to recover:', ...notes] : []),
      ...(packageFiles.length > 0
        ? ['', `${packageFiles.join(' and ')} ${packageFiles.length === 1 ? 'is' : 'are'} back to ${packageFiles.length === 1 ? 'its' : 'their'} original bytes, and node_modules still holds what the run installed. Reinstall:`, `  ${reinstall}`, 'Effects of install scripts and the package cache are not rolled back.']
        : []),
      '',
      `Logs and originals stay in ${relative(root, directory).split(sep).join('/')}. Run \`${initCli(journal.manager)} .\` to plan again.`,
      '',
    ].join('\n'),
  );
  return left.length > 0 ? 1 : packageFiles.length > 0 ? 3 : 0;
}
