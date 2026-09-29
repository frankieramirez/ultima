import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import { THEME_REGISTRY_PATH } from '../../../packages/tokens/src/theme/registry-url.ts';
import { themeRegistry } from '../server/theme-registry.ts';

export function themeRegistryPlugin(): Plugin {
  const middleware = async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== THEME_REGISTRY_PATH) return next();
    try {
      const result = await themeRegistry(new Request(url, { method: request.method }));
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(await result.text());
    } catch {
      response.writeHead(500, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ error: 'The theme could not be generated.' }));
    }
  };
  return {
    name: 'ultima-theme-registry',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
