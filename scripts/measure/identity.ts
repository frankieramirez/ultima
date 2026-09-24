/**
 * Source and environment identity for a measurement, the fields Run protocol and
 * evidence asks the baseline harness to record in place of a verification report.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { cpus, hostname, loadavg, release, totalmem, type as osType } from 'node:os';
import { join, relative } from 'node:path';

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function run(root: string, command: string, args: string[]): string | null {
  try {
    return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

/** Hash of every file under a directory, by relative path and content, in path order. */
export function treeHash(root: string, dir: string): string {
  const hash = createHash('sha256');
  for (const file of filesUnder(join(root, dir)).sort()) {
    hash.update(`${relative(root, file)}\0`);
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export type SourceIdentity = {
  commit: string | null;
  branch: string | null;
  dirtyPatchSha256: string | null;
  untracked: string[];
  sourceManifestSha256: string | null;
  lockfileSha256: string;
  harnessSha256: string;
};

export function sourceIdentity(root: string): SourceIdentity {
  const patch = run(root, 'git', ['diff', 'HEAD', '--binary']);
  const untracked = (run(root, 'git', ['ls-files', '--others', '--exclude-standard']) ?? '').split('\n').filter(Boolean);
  const staged = run(root, 'git', ['ls-files', '-s']);
  return {
    commit: run(root, 'git', ['rev-parse', 'HEAD']),
    branch: run(root, 'git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    dirtyPatchSha256: patch ? sha256(patch) : null,
    untracked,
    sourceManifestSha256: staged === null ? null : sha256(`${staged}\n${patch ?? ''}\n${untracked.join('\n')}`),
    lockfileSha256: sha256(readFileSync(join(root, 'pnpm-lock.yaml'))),
    harnessSha256: treeHash(root, 'scripts/measure'),
  };
}

function firstLine(root: string, command: string, args: string[]): string | null {
  return run(root, command, args)?.split('\n')[0] ?? null;
}

function read(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : null;
}

function playwrightVersion(root: string): string | null {
  const manifest = join(root, 'node_modules/playwright/package.json');
  return existsSync(manifest) ? (JSON.parse(readFileSync(manifest, 'utf8')) as { version: string }).version : null;
}

export type Environment = ReturnType<typeof environment>;

export function environment(root: string) {
  const cpu = cpus();
  return {
    os: `${osType()} ${release()}`,
    distribution: read('/etc/os-release')?.match(/^PRETTY_NAME="?([^"\n]*)/m)?.[1] ?? null,
    cpuModel: cpu[0]?.model ?? null,
    logicalCpus: cpu.length,
    memoryBytes: totalmem(),
    powerProfile: read('/sys/firmware/acpi/platform_profile'),
    loadAverageAtStart: loadavg(),
    host: hostname(),
    node: process.version,
    pnpm: firstLine(root, 'pnpm', ['--version']),
    python: firstLine(root, 'python3', ['--version']),
    playwright: playwrightVersion(root),
    ci: process.env.CI ?? null,
  };
}

/** Runner class names a series: different hardware or throttling never share one. */
export function runnerClass(env: Environment): string {
  const model = (env.cpuModel ?? 'unknown-cpu').replace(/\(R\)|\(TM\)|CPU|@.*$/g, '').trim().replace(/\s+/g, '-');
  return `${env.ci ? 'ci' : 'local'}:${model}:${env.logicalCpus}c:${Math.round(env.memoryBytes / 2 ** 30)}g:${env.powerProfile ?? 'unknown-power'}`;
}

/**
 * The caller's environment without colour switches. Any FORCE_COLOR value, "0" included,
 * turns picocolors on, and colour codes break the log parsers under test; piped output
 * is plain without it.
 */
export function plainEnvironment(): NodeJS.ProcessEnv {
  const { FORCE_COLOR: _force, NO_COLOR: _no, ...rest } = process.env;
  return rest;
}
