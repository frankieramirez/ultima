/**
 * What `verify changed` reads from Git, per Changed files and source identity under Verification CLI in
 * docs/spec/agent-infrastructure.md: the resolved base and merge base, and the union of committed,
 * staged, unstaged and untracked paths, read as NUL-delimited output so no name is ever quoted or split.
 * Git runs with argument arrays and no shell. Nothing here fetches, or writes a ref, the index or a file.
 */
import { spawnSync } from 'node:child_process';

import type { Files } from '../catalogue/files.ts';

export type ChangeSource = 'committed' | 'staged' | 'unstaged' | 'untracked';
export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'type-changed' | 'unmerged';

export type Change = {
  path: string;
  status: ChangeStatus;
  /** For a rename: the old path, which is analysed as a deletion in the base inventory. */
  from?: string;
  sources: ChangeSource[];
};

export type Base = {
  ref: string;
  /** The commit the ref resolved to, or null when it did not. */
  commit: string | null;
  mergeBase: string | null;
  head: string | null;
  /** Why the base cannot bound the change, which broadens the plan to release. */
  fallback: string | null;
};

export type Git = { run(args: string[], input?: string | Buffer): { status: number | null; stdout: Buffer; stderr: string } };

export function git(root: string): Git {
  return {
    run(args, input) {
      const result = spawnSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: root, input, maxBuffer: 1 << 30 });
      return { status: result.error ? null : result.status, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr?.toString() ?? String(result.error ?? '') };
    },
  };
}

const text = (output: { stdout: Buffer }) => output.stdout.toString('utf8').trim();

function commitOf(repository: Git, ref: string): string | null {
  const result = repository.run(['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`]);
  return result.status === 0 ? text(result) : null;
}

export function isRepository(repository: Git): boolean {
  const result = repository.run(['rev-parse', '--is-inside-work-tree']);
  return result.status === 0 && text(result) === 'true';
}

/** The base and merge base, or the reason they cannot be trusted. A missing ref is never fetched. */
export function resolveBase(repository: Git, ref: string): Base {
  const base: Base = { ref, commit: null, mergeBase: null, head: null, fallback: null };
  if (!isRepository(repository)) return { ...base, fallback: 'the checkout is not a Git work tree' };
  base.head = commitOf(repository, 'HEAD');
  if (!base.head) return { ...base, fallback: 'HEAD has no commit' };
  base.commit = commitOf(repository, ref);
  if (!base.commit) return { ...base, fallback: `the base ref "${ref}" does not resolve locally; it was not fetched` };
  const shallow = repository.run(['rev-parse', '--is-shallow-repository']);
  if (shallow.status !== 0 || text(shallow) !== 'false') {
    return { ...base, fallback: 'the history is shallow, so the merge base may be missing or wrong; it was not deepened' };
  }
  const merge = repository.run(['merge-base', base.commit, base.head]);
  if (merge.status !== 0 || text(merge) === '') return { ...base, fallback: `"${ref}" and HEAD share no merge base` };
  base.mergeBase = text(merge);
  return base;
}

const STATUS: Record<string, ChangeStatus> = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'added', T: 'type-changed', U: 'unmerged' };

/** Parses `git diff --name-status -z`: `<status>\0<path>\0`, or `<R|C><score>\0<from>\0<to>\0`. */
export function parseNameStatus(output: Buffer): { status: ChangeStatus; path: string; from?: string }[] {
  const fields = output.toString('utf8').split('\0');
  if (fields.at(-1) === '') fields.pop();
  const entries: { status: ChangeStatus; path: string; from?: string }[] = [];
  for (let index = 0; index < fields.length; ) {
    const code = (fields[index] as string)[0] as string;
    const status = STATUS[code] ?? 'modified';
    if (code === 'R' || code === 'C') {
      const from = fields[index + 1] as string;
      const path = fields[index + 2] as string;
      entries.push(code === 'R' ? { status, path, from } : { status, path });
      index += 3;
    } else {
      entries.push({ status, path: fields[index + 1] as string });
      index += 2;
    }
  }
  return entries;
}

export function parseNulList(output: Buffer): string[] {
  return output.toString('utf8').split('\0').filter((entry) => entry !== '');
}

class GitFailure extends Error {}

function required(repository: Git, args: string[]): Buffer {
  const result = repository.run(args);
  if (result.status !== 0) throw new GitFailure(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

/** Local edits against HEAD: staged, unstaged and untracked non-ignored paths. */
function localChanges(repository: Git): { source: ChangeSource; entries: { status: ChangeStatus; path: string; from?: string }[] }[] {
  const diff = ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '-M'];
  return [
    { source: 'staged', entries: parseNameStatus(required(repository, [...diff, '--cached'])) },
    { source: 'unstaged', entries: parseNameStatus(required(repository, diff)) },
    {
      source: 'untracked',
      entries: parseNulList(required(repository, ['ls-files', '-z', '--others', '--exclude-standard'])).map((path) => ({ status: 'added' as const, path })),
    },
  ];
}

/** A later layer describes the path as it is now, relative to what the earlier layers made of the base. */
function combine(earlier: ChangeStatus, later: ChangeStatus): ChangeStatus {
  if (later === 'deleted') return 'deleted';
  if (earlier === 'deleted') return 'modified';
  if (earlier === 'added' || earlier === 'renamed') return earlier;
  return later;
}

function merge(groups: { source: ChangeSource; entries: { status: ChangeStatus; path: string; from?: string }[] }[]): Change[] {
  const byPath = new Map<string, Change>();
  for (const { source, entries } of groups) {
    for (const entry of entries) {
      const existing = byPath.get(entry.path);
      if (!existing) {
        byPath.set(entry.path, { ...entry, sources: [source] });
        continue;
      }
      if (!existing.sources.includes(source)) existing.sources.push(source);
      existing.status = combine(existing.status, entry.status);
      existing.from ??= entry.from;
    }
  }
  return [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Changes from the merge base through HEAD, unioned with local edits; `undefined` with a reason when Git fails. */
export function changedPaths(repository: Git, mergeBase: string): { changes: Change[] } | { failure: string } {
  try {
    const committed = parseNameStatus(
      required(repository, ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '-M', mergeBase, 'HEAD', '--']),
    );
    return { changes: merge([{ source: 'committed', entries: committed }, ...localChanges(repository)]) };
  } catch (error) {
    if (error instanceof GitFailure) return { failure: error.message };
    throw error;
  }
}

/** Paths that differ from HEAD in the index or work tree, or are untracked; for a named scope's disclosure. */
export function dirtyPaths(repository: Git): { changes: Change[] } | { failure: string } {
  if (!isRepository(repository)) return { failure: 'the checkout is not a Git work tree' };
  try {
    return { changes: merge(localChanges(repository)) };
  } catch (error) {
    if (error instanceof GitFailure) return { failure: error.message };
    throw error;
  }
}

/**
 * A commit's tree as `Files`, read with one `ls-tree` and one `cat-file --batch`, so the base inventory is
 * analysed with the same model as the checkout. Only text a model reads is loaded.
 */
export function commitFiles(repository: Git, commit: string, wanted: (path: string) => boolean): Files | { failure: string } {
  const listing = repository.run(['ls-tree', '-r', '-z', '--full-tree', commit]);
  if (listing.status !== 0) return { failure: `git ls-tree ${commit} failed: ${listing.stderr.trim()}` };
  const blobs = new Map<string, string[]>();
  const paths: string[] = [];
  for (const line of parseNulList(listing.stdout)) {
    const tab = line.indexOf('\t');
    const [, type, sha] = line.slice(0, tab).split(' ') as [string, string, string];
    const path = line.slice(tab + 1);
    if (type !== 'blob') continue;
    paths.push(path);
    if (wanted(path)) blobs.set(sha, [...(blobs.get(sha) ?? []), path]);
  }
  const contents = new Map<string, string>();
  if (blobs.size > 0) {
    const batch = spawnBatch(repository, [...blobs.keys()]);
    if ('failure' in batch) return batch;
    for (const [sha, bytes] of batch.objects) for (const path of blobs.get(sha) ?? []) contents.set(path, bytes);
  }
  const directories = new Map<string, Map<string, boolean>>();
  for (const path of paths) {
    const segments = path.split('/');
    for (let depth = 0; depth < segments.length; depth += 1) {
      const parent = segments.slice(0, depth).join('/');
      const entries = directories.get(parent) ?? new Map<string, boolean>();
      directories.set(parent, entries);
      const directory = depth < segments.length - 1;
      entries.set(segments[depth] as string, directory || entries.get(segments[depth] as string) === true);
    }
  }
  return {
    read: (path) => contents.get(path),
    list(path) {
      const entries = directories.get(path);
      if (!entries) return undefined;
      return [...entries].map(([name, directory]) => ({ name, directory })).sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

function spawnBatch(repository: Git, shas: string[]): { objects: Map<string, string> } | { failure: string } {
  const result = repository.run(['cat-file', '--batch'], `${shas.join('\n')}\n`);
  if (result.status !== 0) return { failure: `git cat-file --batch failed: ${result.stderr.trim()}` };
  const output = result.stdout;
  const objects = new Map<string, string>();
  let offset = 0;
  while (offset < output.length) {
    const newline = output.indexOf(10, offset);
    const [sha, type, size] = output.subarray(offset, newline).toString('utf8').split(' ') as [string, string, string];
    if (type === 'missing') return { failure: `git cat-file found no object ${sha}` };
    const start = newline + 1;
    const end = start + Number(size);
    objects.set(sha, output.subarray(start, end).toString('utf8'));
    offset = end + 1;
  }
  return { objects };
}
