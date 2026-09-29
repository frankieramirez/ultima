import { THEME_REGISTRY_PATH } from '../../../packages/tokens/src/theme/registry-url.ts';
import { themeRegistry } from './theme-registry.ts';

type Assets = { fetch(request: Request): Promise<Response> };

export default {
  async fetch(request: Request, env: { ASSETS: Assets }): Promise<Response> {
    if (new URL(request.url).pathname === THEME_REGISTRY_PATH) return themeRegistry(request);
    return env.ASSETS.fetch(request);
  },
};
