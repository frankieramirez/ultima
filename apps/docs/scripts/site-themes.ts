import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE_THEMES_PATH, renderSiteThemes } from '../src/site-theme-draft.ts';

const target = join(dirname(fileURLToPath(import.meta.url)), '../../..', SITE_THEMES_PATH);
const next = renderSiteThemes();

if (process.argv[2] === 'check') {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    current = '';
  }
  if (current !== next) {
    console.error(`${SITE_THEMES_PATH} is stale against the recipe. Run \`pnpm --filter @ultima/docs themes:generate\`.`);
    process.exit(1);
  }
  console.log(`${SITE_THEMES_PATH} is current.`);
} else {
  writeFileSync(target, next);
  console.log(`wrote ${SITE_THEMES_PATH}`);
}
