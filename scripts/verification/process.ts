/**
 * Owned child processes, per Isolation and cancellation under Verification CLI in
 * docs/spec/agent-infrastructure.md. Every child starts from an argument array with no shell, in its
 * own process group, with its output in a log file and an ownership token in its environment. Stopping
 * it signals that group and every live process carrying the token, which finds descendants that left the
 * group, gives them a bounded graceful shutdown and then kills what remains. Nothing is ever found or
 * killed by port or process name.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, openSync, readFileSync, readdirSync } from 'node:fs';

/** The environment variable that marks a process, and every descendant that inherits it, as run-owned. */
export const OWNER_VARIABLE = 'ULTIMA_VERIFY_OWNER';

/** Graceful shutdown before owned descendants are killed. */
export const GRACE_MS = 5000;

export type ProcessResult = {
  argv: string[];
  cwd: string;
  pid: number | null;
  /** `exited` and `signalled` ran to their own end; the rest were stopped or never started. */
  status: 'exited' | 'signalled' | 'launch-failed' | 'timed_out' | 'cancelled';
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  error?: string;
  /** Owned processes still alive after the child ended, which were then stopped; a negative id is a process group. */
  leftovers: number[];
  /** Owned processes that survived the forced kill: a cleanup failure. A negative id is a process group. */
  survivors: number[];
};

export type LaunchOptions = {
  argv: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  log: string;
  /** Milliseconds before the child is stopped as timed out. */
  deadlineMs: number;
  signal?: AbortSignal;
  graceMs?: number;
  /** Called once the child has a pid, before it is awaited. */
  onSpawn?: (pid: number) => void;
};

function zombie(pid: number): boolean {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
  } catch {
    return false;
  }
}

const groupAlive = (pgid: number) => {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Live processes whose environment carries this token. Only Linux exposes it; elsewhere the group is the bound. */
export function ownedBy(token: string): number[] {
  if (process.platform !== 'linux') return [];
  const marker = Buffer.from(`${OWNER_VARIABLE}=${token}\0`);
  const owned: number[] = [];
  let entries: string[];
  try {
    entries = readdirSync('/proc');
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (!/^[0-9]+$/.test(entry)) continue;
    const pid = Number(entry);
    if (pid === process.pid) continue;
    try {
      const environ = readFileSync(`/proc/${pid}/environ`);
      if (environ.includes(marker) && !zombie(pid)) owned.push(pid);
    } catch {}
  }
  return owned.sort((a, b) => a - b);
}

function signalOwned(pgid: number | null, token: string, signal: NodeJS.Signals) {
  if (pgid !== null) {
    try {
      process.kill(-pgid, signal);
    } catch {}
  }
  for (const pid of ownedBy(token)) {
    try {
      process.kill(pid, signal);
    } catch {}
  }
}

/** Owned pids still alive, with a live group that holds none of them as its negated id. */
const groupOf = (pgid: number | null, token: string) => {
  const owned = ownedBy(token);
  return owned.length === 0 && pgid !== null && groupAlive(pgid) ? [-pgid] : owned;
};

const settled = (pgid: number | null, token: string) => (pgid === null || !groupAlive(pgid)) && ownedBy(token).length === 0;

/** SIGTERM to the group and every token holder, a bounded wait, then SIGKILL; returns what survived. */
export async function stopOwned(pgid: number | null, token: string, graceMs = GRACE_MS): Promise<number[]> {
  signalOwned(pgid, token, 'SIGTERM');
  const until = performance.now() + graceMs;
  while (performance.now() < until && !settled(pgid, token)) await sleep(50);
  if (settled(pgid, token)) return [];
  signalOwned(pgid, token, 'SIGKILL');
  const hard = performance.now() + 2000;
  while (performance.now() < hard && !settled(pgid, token)) await sleep(50);
  return groupOf(pgid, token);
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const ownerToken = (runId: string) => `${runId}.${randomBytes(6).toString('hex')}`;

/** Runs one owned child to completion, deadline or cancellation, and always stops what it left behind. */
export async function launch(options: LaunchOptions & { token: string }): Promise<ProcessResult> {
  const started = performance.now();
  const { argv, cwd, token } = options;
  const graceMs = options.graceMs ?? GRACE_MS;
  const base = { argv, cwd, leftovers: [] as number[], survivors: [] as number[] };
  if (options.signal?.aborted) {
    return { ...base, pid: null, status: 'cancelled', exitCode: null, signal: null, durationMs: 0 };
  }
  const log = openSync(options.log, 'a');
  let child;
  try {
    child = spawn(argv[0] as string, argv.slice(1), {
      cwd,
      env: { ...options.env, [OWNER_VARIABLE]: token },
      detached: true,
      stdio: ['ignore', log, log],
      shell: false,
    });
  } catch (error) {
    closeSync(log);
    return { ...base, pid: null, status: 'launch-failed', exitCode: null, signal: null, durationMs: performance.now() - started, error: String(error) };
  }
  closeSync(log);
  const pgid = child.pid ?? null;
  if (pgid !== null) options.onSpawn?.(pgid);

  let stopping: 'timed_out' | 'cancelled' | null = null;
  let stopped: Promise<number[]> | null = null;
  const stop = (reason: 'timed_out' | 'cancelled') => {
    if (stopping) return;
    stopping = reason;
    stopped = stopOwned(pgid, token, graceMs);
  };
  const timer = setTimeout(() => stop('timed_out'), Math.max(0, options.deadlineMs));
  const onAbort = () => stop('cancelled');
  options.signal?.addEventListener('abort', onAbort, { once: true });

  const outcome = await new Promise<{ code: number | null; signal: NodeJS.Signals | null; error?: string }>((resolve) => {
    child.once('error', (error) => resolve({ code: null, signal: null, error: error.message }));
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  options.signal?.removeEventListener('abort', onAbort);

  let leftovers: number[] = [];
  let survivors: number[] = [];
  if (stopped) survivors = await stopped;
  else {
    leftovers = groupOf(pgid, token);
    if (leftovers.length > 0) survivors = await stopOwned(pgid, token, graceMs);
  }
  const durationMs = performance.now() - started;
  if (outcome.error && pgid === null) {
    return { ...base, pid: null, status: 'launch-failed', exitCode: null, signal: null, durationMs, error: outcome.error };
  }
  const status = stopping ?? (outcome.error ? 'launch-failed' : outcome.signal ? 'signalled' : 'exited');
  return { ...base, pid: pgid, status, exitCode: outcome.code, signal: outcome.signal, durationMs, leftovers, survivors, ...(outcome.error ? { error: outcome.error } : {}) };
}
