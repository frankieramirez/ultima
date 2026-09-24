/**
 * The production build manifest, per Runner and build identity under Production browser verification in
 * docs/spec/agent-infrastructure.md: the source identity a build came from, its mode and command, and the
 * SHA-256 of every file the static server can serve. Browser execution requires one that matches both
 * the run's captured source and the bytes on disk, so a stale, foreign or edited build cannot pass.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const BUILD_MANIFEST_VERSION = 1;

export type BuildManifest = {
  schemaVersion: typeof BUILD_MANIFEST_VERSION;
  kind: 'docs-production-build';
  /** The run's source manifest digest: the captured bytes this build was made from. */
  source: { digest: string; head: string | null };
  mode: 'production';
  command: { argv: string[]; cwd: string };
  /** The build root, relative to the source snapshot. */
  root: string;
  builtAt: string;
  files: { path: string; sha256: string; bytes: number }[];
  /** SHA-256 over the file list, which the served identity carries. */
  digest: string;
};

function walk(root: string, directory = root): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(root, path));
    else if (entry.isFile()) found.push(relative(root, path).split(sep).join('/'));
  }
  return found.sort();
}

export function hashBuild(root: string): Pick<BuildManifest, 'files' | 'digest'> {
  const files = walk(root).map((path) => {
    const bytes = readFileSync(join(root, path));
    return { path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  });
  const digest = createHash('sha256');
  for (const file of files) digest.update(`${file.path}\0${file.sha256}\0${file.bytes}\n`);
  return { files, digest: digest.digest('hex') };
}

export function createManifest(options: {
  source: string;
  root: string;
  sourceDigest: string;
  head: string | null;
  argv: string[];
  cwd: string;
}): BuildManifest {
  return {
    schemaVersion: BUILD_MANIFEST_VERSION,
    kind: 'docs-production-build',
    source: { digest: options.sourceDigest, head: options.head },
    mode: 'production',
    command: { argv: options.argv, cwd: options.cwd },
    root: options.root,
    builtAt: new Date().toISOString(),
    ...hashBuild(join(options.source, options.root)),
  };
}

export function readManifest(path: string): BuildManifest | { failure: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { failure: `the build manifest ${path} cannot be read: ${error instanceof Error ? error.message : String(error)}` };
  }
  const manifest = parsed as Partial<BuildManifest>;
  if (manifest.schemaVersion !== BUILD_MANIFEST_VERSION || manifest.kind !== 'docs-production-build') {
    return { failure: `the build manifest ${path} is not a version ${BUILD_MANIFEST_VERSION} docs production build manifest` };
  }
  if (manifest.mode !== 'production') return { failure: 'the build manifest is not for a production build' };
  if (typeof manifest.source?.digest !== 'string' || !Array.isArray(manifest.files) || typeof manifest.digest !== 'string' || typeof manifest.root !== 'string') {
    return { failure: 'the build manifest is missing its source identity, files or digest' };
  }
  return manifest as BuildManifest;
}

/**
 * Null when `manifest` describes a production build of `sourceDigest` whose served files are exactly the
 * bytes under `root`; otherwise every reason it does not.
 */
export function manifestProblems(manifest: BuildManifest, sourceDigest: string, root: string): string[] {
  const problems: string[] = [];
  if (manifest.source.digest !== sourceDigest) {
    problems.push(`the build manifest names source ${manifest.source.digest.slice(0, 12)}, not this run's ${sourceDigest.slice(0, 12)}: a stale or foreign build`);
  }
  let current: ReturnType<typeof hashBuild>;
  try {
    if (!statSync(root).isDirectory()) return [...problems, `the build root ${root} is not a directory`];
    current = hashBuild(root);
  } catch (error) {
    return [...problems, `the build root ${root} cannot be read: ${error instanceof Error ? error.message : String(error)}`];
  }
  const recorded = new Map(manifest.files.map((file) => [file.path, file.sha256]));
  const present = new Map(current.files.map((file) => [file.path, file.sha256]));
  for (const [path, sha] of recorded) {
    if (!present.has(path)) problems.push(`${path} is in the manifest but missing from the build`);
    else if (present.get(path) !== sha) problems.push(`${path} changed after the build`);
  }
  for (const path of present.keys()) if (!recorded.has(path)) problems.push(`${path} is served but not in the manifest`);
  if (problems.length === 0 && current.digest !== manifest.digest) problems.push('the manifest digest does not match its file list');
  return problems;
}
