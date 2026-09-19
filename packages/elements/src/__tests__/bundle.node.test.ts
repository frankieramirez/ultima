import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, expect, test } from 'vitest';

import { bundleArtifact } from '../../scripts/bundle.ts';

const cacheDir = join(process.cwd(), 'node_modules', '.cache');
mkdirSync(cacheDir, { recursive: true });
const fixtureDir = mkdtempSync(join(cacheDir, 'bundle-test-'));

afterAll(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

test('a source importing @zag-js/vanilla bundles with no bare specifiers', async () => {
  const fixture = join(fixtureDir, 'zag-probe.js');
  writeFileSync(
    fixture,
    "import * as zag from '@zag-js/vanilla';\nglobalThis.__zagProbe = zag;\n",
  );
  const bundled = await bundleArtifact(fixture);
  expect(bundled.length).toBeGreaterThan(5000);
  expect(bundled).toContain('__zagProbe');
  expect(bundled).not.toMatch(/^import|import["'(]|from["']|export[{*\s]/m);
});
