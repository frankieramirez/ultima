import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFile, readFile, rename, rmdir, writeFile } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import type { Page } from 'playwright';

export async function setupNext(app: string, src: boolean, setup: string): Promise<void> {
  for (const step of ["Import './ultima.css' from app/layout.tsx.", 'Wrap any global CSS reset in an @layer']) assert.ok(setup.includes(step), `setup no longer prints: ${step}`);
  if (src) {
    await rename(join(app, 'app/ultima.css'), join(app, 'src/app/ultima.css'));
    await rmdir(join(app, 'app'));
  }
}

export async function nextScene(app: string, src: boolean): Promise<void> {
  const folder = join(app, src ? 'src/app' : 'app');
  await writeFile(join(folder, 'globals.css'), '@layer reset { body { margin: 0; } }\n:root { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans); }\n');
  await writeFile(join(folder, 'layout.tsx'), `import { cookies } from 'next/headers';
import './globals.css';
import './ultima.css';
export const metadata = { title: 'Installed consumer proof' };
import '${src ? '../../' : '../'}ultima-theme.css';
export const instant = false;
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const value = (await cookies()).get('proof-mode')?.value;
  const mode = value === 'dark' || value === 'light' ? value : undefined;
  return <html lang="en" data-theme={mode} data-proof-mode={mode ?? 'system'}><body>{children}</body></html>;
}
`);
  await writeFile(join(folder, 'page.tsx'), `import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HydrationProbe } from './hydration-probe';
export default function Page() {
  return <main><h1>Installed consumer proof</h1><Button tone="accent">Theme control</Button><Badge tone="success" variant="solid" role="status">Ready</Badge><HydrationProbe /></main>;
}
`);
  await writeFile(join(folder, 'hydration-probe.tsx'), `'use client';
import { useEffect } from 'react';
export function HydrationProbe() {
  useEffect(() => { document.body.dataset.hydrated = 'true'; }, []);
  return <span>Hydration probe</span>;
}
`);
}

export async function serveNext(app: string, log: string) {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>((done, reject) => reservation.close((error) => error ? reject(error) : done()));
  const args = [join(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)];
  await appendFile(log, `${JSON.stringify({ cwd: app, command: process.execPath, args })}\n`);
  const server = spawn(process.execPath, args, { cwd: app, stdio: ['ignore', 'pipe', 'pipe'] });
  let spawnError: Error | undefined;
  server.on('error', (error) => { spawnError = error; });
  let logs = Promise.resolve();
  for (const stream of [server.stdout, server.stderr]) stream.on('data', (data: Buffer) => { logs = logs.then(() => appendFile(log, data)); });
  const close = async () => {
    if (server.exitCode === null && server.signalCode === null && !spawnError) {
      server.kill('SIGTERM');
      await once(server, 'exit');
    }
    await logs;
  };
  const url = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (spawnError) throw spawnError;
      if (server.exitCode !== null) throw new Error(`Next exited with ${server.exitCode}`);
      try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return { url, close }; } catch {}
      await setTimeout(500);
    }
    throw new Error('production Next server did not start');
  } catch (error) { await close(); throw error; }
}

export type HydrationState = { attributes: Record<string, string | null>; content: string | null };
export type HydrationEvidence = { server: HydrationState; hydrated: HydrationState; ready: boolean; errors: string[] };
export async function hydrationState(page: Page): Promise<HydrationState> {
  return page.evaluate(() => ({
    attributes: Object.fromEntries(['data-theme', 'data-proof-mode'].map((name) => [name, document.documentElement.getAttribute(name)])),
    content: document.querySelector('main')?.textContent ?? null,
  }));
}
export function hydrationProblems(evidence: HydrationEvidence): string[] {
  const failures = [...evidence.errors];
  if (!evidence.ready) failures.push('client hydration did not complete');
  if (!evidence.server.content || !evidence.hydrated.content) failures.push('missing server or hydrated scene content');
  if (evidence.server.content !== evidence.hydrated.content) failures.push('server/hydrated content mismatch');
  for (const name of ['data-theme', 'data-proof-mode']) {
    if (!(name in evidence.server.attributes) || !(name in evidence.hydrated.attributes)) failures.push(`missing ${name} hydration evidence`);
    else if (evidence.server.attributes[name] !== evidence.hydrated.attributes[name]) failures.push(`server/hydrated ${name} mismatch`);
  }
  return failures;
}

export type BrowserLog = { console: { type: string; text: string }[]; pageErrors: string[]; failedRequests: { url: string; required: boolean; failure?: unknown; status?: number }[] };
const required = (type: string) => ['document', 'script', 'stylesheet', 'font'].includes(type);
/** Returns the page and required-asset errors; with a `log`, also retains every console message, page error and failed request. */
export function browserErrors(page: Page, log?: BrowserLog): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => { log?.pageErrors.push(String(error)); errors.push(`page error: ${error.message}`); });
  page.on('console', (message) => {
    log?.console.push({ type: message.type(), text: message.text() });
    if (message.type() === 'error' || /hydration|hydrating|did not match|server rendered/i.test(message.text())) errors.push(`console ${message.type()}: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    log?.failedRequests.push({ url: request.url(), required: required(request.resourceType()), failure: request.failure() });
    if (required(request.resourceType())) errors.push(`required asset failed: ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    log?.failedRequests.push({ url: response.url(), required: required(response.request().resourceType()), status: response.status() });
    if (required(response.request().resourceType())) errors.push(`required asset HTTP ${response.status()}: ${response.url()}`);
  });
  return errors;
}

export async function nextFault(app: string, src: boolean, fault?: string): Promise<void> {
  if (fault === 'stylex-extraction') {
    await writeFile(join(app, 'postcss.config.js'), 'module.exports = { plugins: {} };\n');
  }
  if (fault === 'src-extraction') {
    const path = join(app, 'postcss.config.js');
    const config = await readFile(path, 'utf8');
    assert.ok(config.includes("include: ['**/*.{js,jsx,ts,tsx}']"));
    await writeFile(path, config.replace("include: ['**/*.{js,jsx,ts,tsx}']", "include: ['app/**/*.{js,jsx,ts,tsx}', 'components/**/*.{js,jsx,ts,tsx}', 'lib/**/*.{js,jsx,ts,tsx}']"));
    if (!src) await writeFile(path, (await readFile(path, 'utf8')).replace("include: ['app/**/*.{js,jsx,ts,tsx}', 'components/**/*.{js,jsx,ts,tsx}', 'lib/**/*.{js,jsx,ts,tsx}']", 'include: []'));
  }
  if (fault === 'hydration-mismatch') {
    const path = join(app, src ? 'src/app/hydration-probe.tsx' : 'app/hydration-probe.tsx');
    await writeFile(path, (await readFile(path, 'utf8')).replace('Hydration probe</span>', "{typeof window === 'undefined' ? 'Server content' : 'Client content'}</span>"));
  }
}
