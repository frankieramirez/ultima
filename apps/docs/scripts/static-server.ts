/**
 * The owned static server for the production docs build, per Runner and build identity under Production
 * browser verification in docs/spec/agent-infrastructure.md. It binds loopback port 0, serves only files
 * inside the build root with their MIME type, resolves an extensionless path to its `.html` file as
 * Cloudflare Pages does, falls back to `index.html` for an HTML navigation to a
 * client-side route, and answers 404 for a missing asset, so a missing script can never load the app
 * shell as a successful response. A request that decodes outside the root is refused. The theme
 * registry route executes the built Cloudflare worker when that artifact is present.
 *
 * `IDENTITY_PATH` answers with the run's nonce and the build manifest's digest. It lives outside the
 * published build, and the runner checks both before any scenario starts, so an earlier run's server or
 * a foreign one cannot stand in for this build.
 */
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { type Server, createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { IDENTITY_PATH } from '../../../scripts/verification/ports.ts';
import { THEME_REGISTRY_PATH } from '../../../packages/tokens/src/theme/registry-url.ts';

export { IDENTITY_PATH };

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json; charset=utf-8',
};

export type ServedRequest = { method: string; path: string; status: number; file: string | null };

export type StaticServer = {
  url: string;
  port: number;
  /** Every request answered, in order, for the run's server log. */
  requests: ServedRequest[];
  close(): Promise<void>;
};

export type StaticServerOptions = {
  root: string;
  nonce: string;
  /** The build manifest digest the identity response carries. */
  manifestDigest: string;
  port?: number;
};

/** A file inside `root` for a URL pathname, `null` when absent, or `'outside'` when it escapes the root. */
export function resolveFile(root: string, pathname: string): string | null | 'outside' {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return 'outside';
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return 'outside';
  const target = resolve(root, `.${decoded}`);
  const inside = relative(root, target);
  if (inside.startsWith('..') || isAbsolute(inside)) return 'outside';
  // Cloudflare Pages serves `name.html` for `/name` and `/name/`, after the exact file and `name/index.html`.
  const candidates = [target, join(target, 'index.html')];
  if (extname(decoded) === '' && inside !== '') candidates.push(`${target}.html`);
  for (const file of candidates) {
    let real: string;
    try {
      real = realpathSync(file);
    } catch {
      continue;
    }
    const within = relative(realpathSync(root), real);
    if (within.startsWith('..') || isAbsolute(within)) return 'outside';
    if (statSync(real).isFile()) return real;
  }
  return null;
}

/**
 * An HTML navigation: a GET for a pathname with no file extension, from a client that accepts HTML.
 * Anything with an extension is an asset request, which is never answered with the app shell.
 */
export function isNavigation(method: string, pathname: string, accept: string | undefined): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (extname(pathname) !== '' || pathname.startsWith('/assets/')) return false;
  return (accept ?? '').includes('text/html');
}

export async function startStaticServer(options: StaticServerOptions): Promise<StaticServer> {
  const root = realpathSync(options.root);
  const workerFile = join(root, '_worker.js');
  const worker = existsSync(workerFile) ? (await import(pathToFileURL(workerFile).href)).default : null;
  const requests: ServedRequest[] = [];
  const server: Server = createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    let pathname: string;
    try {
      pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    } catch {
      pathname = '/';
    }
    const answer = (status: number, file: string | null, body?: string, type = 'text/plain; charset=utf-8') => {
      requests.push({ method, path: pathname, status, file: file ? relative(root, file) : null });
      if (file === null) {
        response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
        response.end(method === 'HEAD' ? undefined : body);
        return;
      }
      response.writeHead(status, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      if (method === 'HEAD') response.end();
      else createReadStream(file).pipe(response);
    };
    if (pathname === IDENTITY_PATH) {
      answer(200, null, JSON.stringify({ nonce: options.nonce, manifest: options.manifestDigest }), MIME['.json']);
      return;
    }
    if (pathname === THEME_REGISTRY_PATH && worker) {
      try {
        const result: Response = await worker.fetch(new Request(new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`), { method }));
        requests.push({ method, path: pathname, status: result.status, file: null });
        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(await result.text());
      } catch {
        answer(500, null, JSON.stringify({ error: 'The theme could not be generated.' }), MIME['.json']);
      }
      return;
    }
    if (method !== 'GET' && method !== 'HEAD') {
      answer(405, null, 'method not allowed');
      return;
    }
    const file = resolveFile(root, pathname);
    if (file === 'outside') {
      answer(403, null, 'outside the build root');
      return;
    }
    if (file !== null) {
      answer(200, file);
      return;
    }
    if (isNavigation(method, pathname, request.headers.accept)) {
      answer(200, join(root, 'index.html'));
      return;
    }
    answer(404, null, 'not found');
  });
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address !== 'object') {
        reject(new Error('the static server has no address'));
        return;
      }
      resolvePromise({
        url: `http://127.0.0.1:${address.port}`,
        port: address.port,
        requests,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}

/** Checks a server's identity response against the nonce and manifest this run expects. */
export async function verifyIdentity(url: string, nonce: string, manifestDigest: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(`${url}${IDENTITY_PATH}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return `the identity request answered ${response.status}`;
    const body = (await response.json()) as { nonce?: unknown; manifest?: unknown };
    if (body.nonce !== nonce) return 'the server answered with a foreign nonce';
    if (body.manifest !== manifestDigest) return 'the server serves a different build manifest';
    return null;
  } catch (error) {
    return `the identity request failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
