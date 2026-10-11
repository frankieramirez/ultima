import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkMarkdownGuidance } from '../check-markdown-guidance.ts';
import { markdownGuidance, publishGuidance } from '../markdown-guidance.ts';
import { compositionProjection } from '../catalogue/compositions.ts';
import { diskFiles } from '../catalogue/files.ts';
import { loadCatalogue } from '../catalogue/model.ts';

const files = diskFiles(fileURLToPath(new URL('../..', import.meta.url)));

test('HTTP discovery checks the index byte budget and rejects edited exports and missing links', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ultima-markdown-http-'));
  try {
    const { catalogue } = loadCatalogue(files);
    const guides = await markdownGuidance(files, catalogue, compositionProjection(files, catalogue));
    publishGuidance(join(root, 'guides'), guides);
    writeFileSync(join(root, 'index.html'), '<!doctype html><div id="root"></div>');
    const index = 'Guides: 界\n' + [...guides.keys()].map((path) => `[${path}](https://ultima.systems/guides/${path})`).join('\n');
    writeFileSync(join(root, 'llms.txt'), index);
    const valid = await checkMarkdownGuidance(root);
    assert.deepEqual(valid.failures, []);
    assert.equal(valid.indexBytes, Buffer.byteLength(index));
    assert.notEqual(valid.indexBytes, index.length);
    assert.equal(valid.indexRemainingBytes, 64 * 1024 - Buffer.byteLength(index));
    writeFileSync(join(root, 'llms.txt'), index + ' '.repeat(64 * 1024 + 1 - Buffer.byteLength(index)));
    const oversized = await checkMarkdownGuidance(root);
    assert.equal(oversized.indexBytes, 64 * 1024 + 1);
    assert.equal(oversized.indexRemainingBytes, -1);
    assert.ok(oversized.failures.includes('llms.txt exceeds 64 KiB'));
    writeFileSync(join(root, 'llms.txt'), index);
    writeFileSync(join(root, 'guides/install.md'), '<!doctype html><div id="root"></div>');
    const broken = await checkMarkdownGuidance(root);
    assert.ok(broken.failures.includes('not Markdown/text over HTTP: /guides/install.md'));
    assert.ok(broken.failures.includes('HTTP source mismatch: /guides/install.md'));
    publishGuidance(join(root, 'guides'), guides);
    writeFileSync(join(root, 'llms.txt'), 'No guidance links');
    assert.ok((await checkMarkdownGuidance(root)).failures.includes('not discoverable from llms.txt: install.md'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
