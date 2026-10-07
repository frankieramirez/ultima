import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { markedFiles } from './anatomy-guard.ts';

test('finds a planted data-anatomy mark at any depth of the served tree, and nothing in a clean one', () => {
  const root = mkdtempSync(join(tmpdir(), 'ultima-served-'));
  try {
    mkdirSync(join(root, 'r'));
    writeFileSync(join(root, 'llms.txt'), 'Badge: a static label.\n');
    writeFileSync(join(root, 'r', 'badge.json'), JSON.stringify({ files: [{ content: '<span />' }] }));
    assert.deepEqual(markedFiles(root), []);
    writeFileSync(join(root, 'r', 'badge.json'), JSON.stringify({ files: [{ content: '<span data-anatomy-part="Badge" />' }] }));
    assert.deepEqual(markedFiles(root), [join(root, 'r', 'badge.json')]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
