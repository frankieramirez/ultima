/**
 * Nothing in the docs build output may answer a docs route's path. Cloudflare Pages serves `name.html`
 * or `name/index.html` for `/name` and `/name/` before it falls back to the app shell, and applies
 * `_redirects` before both, so a static file or redirect at a route's path replaces that page on a
 * direct load. `routeShadowPlugin` fails `vite build` when the output holds one.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

import { parse } from '../../../scripts/catalogue/source.ts';
import { routePaths } from '../../../scripts/verification/model.ts';

const ROUTER = fileURLToPath(new URL('../src/router.tsx', import.meta.url));

export type RouteShadow = { source: string; pathname: string; route: string };

export function docsRoutes(): string[] {
  return [...routePaths(parse(ROUTER, readFileSync(ROUTER, 'utf8')))];
}

function prettyPath(file: string): string | null {
  if (file === 'index.html' || file.startsWith('_')) return null;
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'/index.html'.length)}`;
  if (file.endsWith('.html')) return `/${file.slice(0, -'.html'.length)}`;
  return extname(file) === '' ? `/${file}` : null;
}

const isRouteParam = (segment: string) => segment.startsWith('$');
const isRedirectWildcard = (segment: string) => segment === '*' || segment.startsWith(':');

function matches(route: string, pathname: string): boolean {
  const want = route.split('/').filter(Boolean);
  const have = pathname.split('/').filter(Boolean);
  return (
    want.length === have.length &&
    want.every((segment, i) => segment === have[i] || isRouteParam(segment) || isRedirectWildcard(have[i] as string))
  );
}

export function routeShadows(root: string, routes: readonly string[]): RouteShadow[] {
  const served: { source: string; pathname: string }[] = [];
  for (const entry of readdirSync(root, { recursive: true }) as string[]) {
    if (!statSync(join(root, entry)).isFile()) continue;
    const file = entry.split(sep).join('/');
    const pathname = prettyPath(file);
    if (pathname) served.push({ source: file, pathname });
  }
  const redirects = join(root, '_redirects');
  if (existsSync(redirects)) {
    for (const line of readFileSync(redirects, 'utf8').split('\n')) {
      const from = line.trim().split(/\s+/)[0];
      if (from && !from.startsWith('#')) served.push({ source: '_redirects', pathname: from });
    }
  }
  return served.flatMap(({ source, pathname }) =>
    routes.filter((route) => matches(route, pathname)).map((route) => ({ source, pathname, route })),
  );
}

export function routeShadowPlugin(): Plugin {
  let outDir = '';
  return {
    name: 'ultima-route-shadows',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const shadows = routeShadows(outDir, docsRoutes());
      if (shadows.length > 0) {
        const lines = shadows.map(({ source, pathname, route }) => `  ${source} answers ${pathname}, the ${route} route`);
        throw new Error(`${outDir} shadows docs routes on a direct load:\n${lines.join('\n')}`);
      }
    },
  };
}
