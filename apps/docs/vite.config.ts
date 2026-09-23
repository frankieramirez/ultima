import { readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import mdx from '@mdx-js/rollup';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import remarkGfm from 'remark-gfm';
import { defineConfig, type Plugin } from 'vite';

import { stylexConstsWarmup, stylexOptions } from '../../stylex.options.ts';

/**
 * Until launch, the production deploy serves a coming-soon page in place of the site. Cloudflare
 * Pages names the branch it builds, and main is production; preview deploys and local builds keep
 * the site. `ULTIMA_COMING_SOON=1` or `=0` overrides either way, for a local look or for launch.
 */
function comingSoonEnabled(env: NodeJS.ProcessEnv) {
  if (env.ULTIMA_COMING_SOON) return env.ULTIMA_COMING_SOON === '1';
  return env.CF_PAGES_BRANCH === 'main';
}

/**
 * Swaps the site entry for the coming-soon one, so the site's own code never reaches the output,
 * and drops the standalone HTML pages `public/` carries. Pages' SPA fallback then answers every
 * other path with the coming-soon page. The registry, the token exports, the elements bundle, and
 * `/llms.txt` still ship, because installs in consumer projects fetch them from the live domain.
 */
function comingSoon(): Plugin {
  let outDir: string | undefined;
  return {
    name: 'ultima-coming-soon',
    configResolved(config) {
      if (config.command === 'build') outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace('/src/main.tsx', '/src/main-coming-soon.tsx'),
    },
    closeBundle() {
      if (!outDir) return;
      for (const file of readdirSync(outDir)) {
        if (file.endsWith('.html') && file !== 'index.html') rmSync(resolve(outDir, file));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    // Registered before stylex.vite so its middleware gates the dev CSS endpoint.
    stylexConstsWarmup(['/src/breakpoints.stylex.ts']),
    // StyleX must run before @vitejs/plugin-react so Fast Refresh keeps working.
    stylex.vite(stylexOptions({ dev: mode !== 'production' })),
    react(),
    comingSoonEnabled(process.env) && comingSoon(),
  ],
}));
