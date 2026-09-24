/**
 * The frozen source a verification run tests, per Changed files and source identity and Isolation and
 * cancellation under Verification CLI in docs/spec/agent-infrastructure.md. A capture copies the
 * checkout's tracked and untracked non-ignored files, dirty bytes included, into the run's private
 * `source/` directory and records a deterministic SHA-256 manifest of their paths, types, modes and
 * bytes, with HEAD, the index identity and the working-tree status beside it. The copy is coherent only
 * when the origin hashes the same before and after it; otherwise the capture retries a bounded number of
 * times and then fails. The origin is hashed again when the run completes, so a checkout that changed
 * during the run is reported as `sourceChanged` and never as the tested bytes.
 *
 * The copy is its own Git work tree at the captured identity: HEAD detached at the checkout's commit,
 * the index rebuilt from the recorded stage listing, and objects read through an alternate pointing at
 * the checkout's object store. Git run inside a snapshot therefore sees the tested bytes. Without it, a
 * snapshot under the checkout's ignored `.scratch/` would resolve the caller's repository, and one
 * under `--output` would find none.
 *
 * Git runs with argument arrays. Nothing here writes to the checkout, its index or refs; the only
 * repository it writes is the snapshot's own.
 */
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { type Change, type Git, dirtyPaths, git, isRepository } from './changes.ts';

export const MANIFEST_VERSION = 1;

/** How many times a capture may restart because the checkout moved under it before it gives up. */
export const CAPTURE_ATTEMPTS = 3;

/**
 * Paths a capture never copies, beyond what Git itself ignores. Each is a Git-internal, dependency or
 * evidence directory; generated outputs are ignored through `.gitignore`, which the manifest hashes.
 */
export const EXCLUSIONS: readonly { pattern: string; reason: string }[] = [
  { pattern: '.git/', reason: 'Git internals; HEAD and the index are recorded as their own identities' },
  { pattern: '**/node_modules/', reason: 'dependencies, prepared from the lockfile inside the run' },
  { pattern: '.scratch/', reason: 'verification runs and their evidence' },
  { pattern: 'paths Git ignores', reason: 'the rules in .gitignore, .git/info/exclude and core.excludesFile; .gitignore is itself in the manifest' },
];

const excluded = (path: string) => path === '.scratch' || path.startsWith('.scratch/') || path.split('/').includes('node_modules');

export type SourceEntry = {
  path: string;
  type: 'file' | 'symlink';
  /** Git's mode for the entry: 100644, 100755 or 120000. */
  mode: '100644' | '100755' | '120000';
  size: number;
  sha256: string;
};

export type Manifest = { version: typeof MANIFEST_VERSION; algorithm: 'sha256'; digest: string; files: number; bytes: number; entries: SourceEntry[] };

export type Submodule = { path: string; commit: string; initialized: boolean };

export type SourceIdentity = {
  head: string | null;
  /** SHA-256 of `git ls-files --stage -z`: what is staged, recorded apart from the tested bytes. */
  index: { algorithm: 'sha256'; digest: string; entries: number };
  /** Staged, unstaged and untracked paths against HEAD, renames and deletions included. */
  status: Change[] | { unknown: string };
  submodules: Submodule[];
  manifest: Omit<Manifest, 'entries'>;
  exclusions: typeof EXCLUSIONS;
  /** Ignored paths the run needs and an adapter supplies and hashes itself; none are declared yet. */
  requiredIgnoredInputs: string[];
};

export type Capture =
  | { ok: true; identity: SourceIdentity; manifest: Manifest; attempts: number; durationMs: number }
  | { ok: false; reason: string; attempts: number; durationMs: number };

class CaptureFailure extends Error {}

function required(repository: Git, args: string[], input?: Buffer): Buffer {
  const result = repository.run(args, input);
  if (result.status !== 0) throw new CaptureFailure(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

/** NUL-separated names, decoded losslessly: a name that is not valid UTF-8 cannot be recorded, so it fails the capture. */
function names(output: Buffer): string[] {
  const result: string[] = [];
  let start = 0;
  for (let index = 0; index < output.length; index += 1) {
    if (output[index] !== 0) continue;
    const bytes = output.subarray(start, index);
    const name = bytes.toString('utf8');
    if (!Buffer.from(name, 'utf8').equals(bytes)) throw new CaptureFailure(`a path is not valid UTF-8 and cannot be recorded losslessly: ${JSON.stringify(name)}`);
    result.push(name);
    start = index + 1;
  }
  return result;
}

type Listing = {
  head: string | null;
  index: SourceIdentity['index'];
  /** The `git ls-files --stage -z` output the index digest hashes. */
  stage: Buffer;
  paths: string[];
  submodules: Submodule[];
};

function list(root: string, repository: Git): Listing {
  if (!isRepository(repository)) throw new CaptureFailure('the checkout is not a Git work tree');
  const headResult = repository.run(['rev-parse', '--verify', '--quiet', 'HEAD']);
  const head = headResult.status === 0 ? headResult.stdout.toString('utf8').trim() : null;
  const stage = required(repository, ['ls-files', '--stage', '-z']);
  const stageEntries = names(stage);
  const submodules: Submodule[] = [];
  const gitlinks = new Set<string>();
  for (const entry of stageEntries) {
    const [meta, path] = [entry.slice(0, entry.indexOf('\t')), entry.slice(entry.indexOf('\t') + 1)];
    const [mode, commit] = meta.split(' ') as [string, string];
    if (mode !== '160000') continue;
    gitlinks.add(path);
    let initialized = false;
    try {
      initialized = lstatSync(join(root, path, '.git')) !== undefined;
    } catch {}
    submodules.push({ path, commit, initialized });
  }
  const listed = names(required(repository, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']));
  const paths = [...new Set(listed)].filter((path) => !gitlinks.has(path) && !excluded(path)).sort(compare);
  return { head, index: { algorithm: 'sha256', digest: createHash('sha256').update(stage).digest('hex'), entries: stageEntries.length }, stage, paths, submodules };
}

/** Byte order, so the manifest never depends on locale. */
function compare(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

type Read = { entry: SourceEntry; bytes: Buffer } | undefined;

/** One entry's bytes as they are now; `undefined` when it is gone, which is a working-tree deletion. */
function readEntry(root: string, path: string): Read {
  let stat;
  try {
    stat = lstatSync(join(root, path));
  } catch {
    return undefined;
  }
  if (stat.isSymbolicLink()) {
    const bytes = Buffer.from(readlinkSync(join(root, path), { encoding: 'buffer' }));
    return { entry: { path, type: 'symlink', mode: '120000', size: bytes.length, sha256: sha256(bytes) }, bytes };
  }
  if (stat.isDirectory()) throw new CaptureFailure(`${path} is a directory where Git lists a file, such as an untracked nested repository; it cannot be captured`);
  if (!stat.isFile()) throw new CaptureFailure(`${path} is not a regular file or symbolic link`);
  const bytes = readFileSync(join(root, path));
  return { entry: { path, type: 'file', mode: stat.mode & 0o111 ? '100755' : '100644', size: bytes.length, sha256: sha256(bytes) }, bytes };
}

const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

export function manifestOf(entries: SourceEntry[]): Manifest {
  const hash = createHash('sha256');
  let bytes = 0;
  for (const entry of entries) {
    hash.update(`${entry.mode} ${entry.type} ${entry.sha256} ${entry.size}\t${entry.path}\0`);
    bytes += entry.size;
  }
  return { version: MANIFEST_VERSION, algorithm: 'sha256', digest: hash.digest('hex'), files: entries.length, bytes, entries };
}

/** The origin's identity without copying it: the completion check. */
export function hashSource(root: string): { ok: true; manifest: Manifest; head: string | null; index: SourceIdentity['index'] } | { ok: false; reason: string } {
  try {
    const listing = list(root, git(root));
    const entries = listing.paths.flatMap((path) => readEntry(root, path)?.entry ?? []);
    return { ok: true, manifest: manifestOf(entries), head: listing.head, index: listing.index };
  } catch (error) {
    if (error instanceof CaptureFailure) return { ok: false, reason: error.message };
    throw error;
  }
}

/**
 * Makes `destination` a Git work tree with the captured HEAD and index. The checkout's object store is
 * an alternate, read and never written, so no object is copied; `.git/info/exclude` is copied so the
 * snapshot ignores what the checkout ignores. Both identities are read back and must match.
 */
function initializeRepository(repository: Git, destination: string, listing: Listing): void {
  const common = required(repository, ['rev-parse', '--path-format=absolute', '--git-common-dir']).toString('utf8').trim();
  const snapshot = git(destination);
  required(snapshot, ['init', '--quiet']);
  writeFileSync(join(destination, '.git/objects/info/alternates'), `${join(common, 'objects')}\n`);
  const exclude = join(common, 'info/exclude');
  if (existsSync(exclude)) {
    mkdirSync(join(destination, '.git/info'), { recursive: true });
    copyFileSync(exclude, join(destination, '.git/info/exclude'));
  }
  if (listing.head) required(snapshot, ['update-ref', '--no-deref', 'HEAD', listing.head]);
  if (listing.stage.length > 0) required(snapshot, ['update-index', '-z', '--index-info'], listing.stage);
  const head = snapshot.run(['rev-parse', '--verify', '--quiet', 'HEAD']);
  if ((head.status === 0 ? head.stdout.toString('utf8').trim() : null) !== listing.head) throw new CaptureFailure('the snapshot repository does not resolve the captured HEAD');
  const stage = required(snapshot, ['ls-files', '--stage', '-z']);
  if (!stage.equals(listing.stage)) throw new CaptureFailure('the snapshot repository does not hold the captured index');
}

export type CaptureOptions = {
  attempts?: number;
  /** Test seam: runs after an attempt's copy and before its coherence check. */
  afterCopy?: (attempt: number) => void;
};

/**
 * Copies the checkout into `destination`, which must be empty or absent, and returns its identity.
 * Each attempt lists, copies and hashes, then lists and hashes the origin again; a difference restarts
 * the attempt from an empty destination.
 */
export function captureSource(root: string, destination: string, options: CaptureOptions = {}): Capture {
  const started = performance.now();
  const attempts = options.attempts ?? CAPTURE_ATTEMPTS;
  const repository = git(root);
  let reason = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(destination, { recursive: true });
    try {
      const before = list(root, repository);
      const entries: SourceEntry[] = [];
      for (const path of before.paths) {
        const read = readEntry(root, path);
        if (!read) continue;
        const target = join(destination, path);
        mkdirSync(dirname(target), { recursive: true });
        if (read.entry.type === 'symlink') symlinkSync(read.bytes, target);
        else {
          writeFileSync(target, read.bytes);
          chmodSync(target, read.entry.mode === '100755' ? 0o755 : 0o644);
        }
        entries.push(read.entry);
      }
      const manifest = manifestOf(entries);
      options.afterCopy?.(attempt);
      const after = hashSource(root);
      if (!after.ok) throw new CaptureFailure(after.reason);
      if (after.manifest.digest !== manifest.digest || after.head !== before.head || after.index.digest !== before.index.digest) {
        const moved = after.manifest.digest !== manifest.digest ? 'the working-tree bytes' : after.head !== before.head ? 'HEAD' : 'the index';
        reason = `${moved} changed while attempt ${attempt} was copying`;
        continue;
      }
      const uninitialized = before.submodules.filter((submodule) => !submodule.initialized);
      if (uninitialized.length > 0) {
        return {
          ok: false,
          reason: `uninitialized submodule(s) ${uninitialized.map((s) => s.path).join(', ')}: no adapter supplies or hashes them`,
          attempts: attempt,
          durationMs: performance.now() - started,
        };
      }
      if (before.submodules.length > 0) {
        return {
          ok: false,
          reason: `submodule(s) ${before.submodules.map((s) => s.path).join(', ')}: capturing a submodule's bytes is not supported yet`,
          attempts: attempt,
          durationMs: performance.now() - started,
        };
      }
      initializeRepository(repository, destination, before);
      const dirty = dirtyPaths(repository);
      const { entries: _entries, ...summary } = manifest;
      return {
        ok: true,
        identity: {
          head: before.head,
          index: before.index,
          status: 'failure' in dirty ? { unknown: dirty.failure } : dirty.changes,
          submodules: before.submodules,
          manifest: summary,
          exclusions: EXCLUSIONS,
          requiredIgnoredInputs: [],
        },
        manifest,
        attempts: attempt,
        durationMs: performance.now() - started,
      };
    } catch (error) {
      if (!(error instanceof CaptureFailure)) throw error;
      return { ok: false, reason: error.message, attempts: attempt, durationMs: performance.now() - started };
    }
  }
  return { ok: false, reason: `no coherent snapshot after ${attempts} attempts: ${reason}`, attempts, durationMs: performance.now() - started };
}
