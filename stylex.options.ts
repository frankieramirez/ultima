// Not under packages/: the registry build stages from there, and this file must
// never install into a consumer. https://linear.app/frankie-ramirez/issue/ULT-24
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
