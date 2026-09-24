/**
 * Loopback ports and owned servers, per Isolation and cancellation under Verification CLI in
 * docs/spec/agent-infrastructure.md. A port is allocated by binding port 0 and handed to the server
 * explicitly; neither that probe nor a 200 response establishes ownership. The server must answer an
 * identity request with the nonce this run gave it, so a stale server from an earlier run or a foreign
 * one on the same port cannot satisfy a check. A failed bind or wrong identity retries on a new port a
 * bounded number of times, then reports why ownership could not be established.
 */
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

import { type LaunchOptions, type ProcessResult, launch, sleep } from './process.ts';

export const IDENTITY_PATH = '/__ultima-verify/identity';
export const PORT_VARIABLE = 'ULTIMA_VERIFY_PORT';
export const NONCE_VARIABLE = 'ULTIMA_VERIFY_NONCE';
export const SERVER_ATTEMPTS = 3;

/** A free loopback port at the moment of asking; only the server's own bind and identity make it owned. */
export function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => (address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port was assigned'))));
    });
  });
}

export type OwnedServer = {
  url: string;
  port: number;
  pid: number;
  attempts: { port: number; outcome: string }[];
  /** Stops the server and its descendants; resolves with its process record. */
  stop(): Promise<ProcessResult>;
};

export type ServerOptions = Omit<LaunchOptions, 'deadlineMs' | 'onSpawn'> & {
  token: string;
  /** How long a server may take to answer with its identity. */
  readinessMs: number;
  /** How long the server may run in total before it is stopped as timed out. */
  lifetimeMs: number;
  attempts?: number;
};

async function identity(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${url}${IDENTITY_PATH}`, { signal: AbortSignal.timeout(1000) });
    if (!response.ok) return `status ${response.status}`;
    const body = (await response.json()) as { nonce?: unknown };
    return typeof body.nonce === 'string' ? body.nonce : 'no nonce';
  } catch {
    return null;
  }
}

/**
 * Starts an owned server on a fresh port and waits until it proves its identity. The server reads its
 * port from `ULTIMA_VERIFY_PORT` and must answer `IDENTITY_PATH` with `{ "nonce": ULTIMA_VERIFY_NONCE }`.
 */
export async function startServer(options: ServerOptions): Promise<{ server: OwnedServer } | { failure: string; attempts: { port: number; outcome: string }[] }> {
  const attempts: { port: number; outcome: string }[] = [];
  for (let attempt = 1; attempt <= (options.attempts ?? SERVER_ATTEMPTS); attempt += 1) {
    if (options.signal?.aborted) return { failure: 'cancelled before the server was ready', attempts };
    const port = await allocatePort();
    const nonce = randomBytes(16).toString('hex');
    const url = `http://127.0.0.1:${port}`;
    const stopper = new AbortController();
    const forward = () => stopper.abort();
    options.signal?.addEventListener('abort', forward, { once: true });
    let pid: number | null = null;
    let exited = false;
    const running = launch({
      ...options,
      env: { ...options.env, [PORT_VARIABLE]: String(port), [NONCE_VARIABLE]: nonce },
      deadlineMs: options.lifetimeMs,
      signal: stopper.signal,
      onSpawn: (spawned) => {
        pid = spawned;
      },
    }).then((result) => {
      exited = true;
      options.signal?.removeEventListener('abort', forward);
      return result;
    });
    const stop = async () => {
      stopper.abort();
      return running;
    };
    const until = performance.now() + options.readinessMs;
    let outcome = 'no identity response before the readiness deadline';
    while (performance.now() < until) {
      if (exited) {
        const result = await running;
        outcome = `the server exited before it was ready (${result.status}${result.exitCode !== null ? ` ${result.exitCode}` : ''}${result.error ? `: ${result.error}` : ''})`;
        break;
      }
      const answer = await identity(url);
      if (answer === nonce && pid !== null) {
        attempts.push({ port, outcome: 'owned' });
        return { server: { url, port, pid, attempts, stop } };
      }
      if (answer !== null) {
        outcome = `a server on port ${port} answered with a foreign identity (${answer.startsWith('status') || answer === 'no nonce' ? answer : 'wrong nonce'})`;
        await stop();
        break;
      }
      await sleep(50);
    }
    if (!exited) await stop();
    attempts.push({ port, outcome });
  }
  return { failure: `no owned server after ${attempts.length} attempt(s): ${attempts.map((a) => `port ${a.port}: ${a.outcome}`).join('; ')}`, attempts };
}
