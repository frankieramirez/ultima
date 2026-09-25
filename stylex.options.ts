// Not under packages/: the registry build stages from there, and this file must
// never install into a consumer. Decision ULT-24.
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export function stylexOptions({ dev }: { dev: boolean }) {
  return {
    dev,
    runtimeInjection: false,
    useCSSLayers: true,
    unstable_moduleResolution: { type: 'commonJS', rootDir },
  } as const;
}

// Consumers reference a .stylex consts module as var(--hash) at-rule keys until
// the module's rules reach the collector. /virtual:stylex.css 500s if it is
// served inside that gap, and the dev overlay never clears afterwards, so the
// first request waits on the module's transform before the endpoint runs.
// Typed structurally: packages/tokens typechecks this file and has no vite.
type DevServer = {
  middlewares: {
    use(fn: (req: { url?: string }, res: unknown, next: () => void) => void): void;
  };
  transformRequest(url: string): Promise<unknown>;
};

export function stylexConstsWarmup(moduleIds: string[]) {
  return {
    name: 'ultima-stylex-consts-warmup',
    enforce: 'pre',
    apply: 'serve',
    configureServer(server: DevServer) {
      let warmed: Promise<unknown> | undefined;
      server.middlewares.use((req, _res, next) => {
        if (!req.url?.startsWith('/virtual:stylex.css')) return next();
        warmed ??= Promise.all(moduleIds.map((id) => server.transformRequest(id))).catch(() => {});
        void warmed.then(() => next());
      });
    },
  } as const;
}
