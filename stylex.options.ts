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
// That transform can land before any consumer's, and StyleX 0.19 then renders
// constants alone as an empty `@layer ;` header that Lightning CSS rejects, the
// same 500. Until a rule that is not a constant arrives the endpoint serves an
// empty sheet, and the dev runtime refetches when the next module's rules land.
// Typed structurally: packages/tokens typechecks this file and has no vite.
type DevServer = {
  middlewares: {
    use(fn: (req: { url?: string }, res: DevResponse, next: () => void) => void): void;
  };
  transformRequest(url: string): Promise<unknown>;
};
type DevResponse = { setHeader(name: string, value: string): void; end(body: string): void };

// The unplugin's process-wide collector: module id to that module's rules.
type CollectedRule = [string, { constKey?: string }, number];
const collected = () =>
  (globalThis as { __stylex_unplugin_store?: { rulesById: Map<string, CollectedRule[]> } }).__stylex_unplugin_store?.rulesById;

function onlyConstants() {
  const rules = [...(collected()?.values() ?? [])].flat();
  return rules.length > 0 && rules.every(([, rule]) => rule.constKey != null);
}

export function stylexConstsWarmup(moduleIds: string[]) {
  return {
    name: 'ultima-stylex-consts-warmup',
    enforce: 'pre',
    apply: 'serve',
    configureServer(server: DevServer) {
      let warmed: Promise<unknown> | undefined;
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/virtual:stylex.css')) return next();
        warmed ??= Promise.all(moduleIds.map((id) => server.transformRequest(id))).catch(() => {});
        void warmed.then(() => {
          if (!onlyConstants()) return next();
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-store');
          res.end('');
        });
      });
    },
  } as const;
}
