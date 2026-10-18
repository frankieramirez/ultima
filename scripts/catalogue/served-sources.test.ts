import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sourcesFault } from './served-sources.ts';

const checkout = new Set(['packages/ui/src/button.tsx', 'packages/blocks/src/sign-in-01/brand.tsx']);
const exists = (path: string) => checkout.has(path);

test('accepts sources that name one checked-out path for each served file', () => {
  const ultima = { files: { 'button.tsx': 'c1:0123456789abcdef' }, sources: { 'button.tsx': 'packages/ui/src/button.tsx' } };
  assert.equal(sourcesFault(ultima, exists), undefined);
});

test('names a lost sources key', () => {
  assert.equal(sourcesFault({ files: { 'button.tsx': 'c1:0123456789abcdef' } }, exists), 'lost meta.ultima.sources');
  assert.equal(sourcesFault(undefined, exists), 'lost meta.ultima.sources');
});

test('names the files sources leaves out or adds', () => {
  const ultima = {
    files: { 'sign-in-01.tsx': 'c1:1', 'brand.tsx': 'c1:2' },
    sources: { 'brand.tsx': 'packages/blocks/src/sign-in-01/brand.tsx', 'extra.tsx': 'packages/ui/src/button.tsx' },
  };
  assert.equal(sourcesFault(ultima, exists), 'meta.ultima.sources does not match meta.ultima.files: missing sign-in-01.tsx, extra extra.tsx');
});

test('names a source path the checkout does not hold', () => {
  const ultima = { files: { 'button.tsx': 'c1:1' }, sources: { 'button.tsx': 'packages/ui/src/buton.tsx' } };
  assert.equal(sourcesFault(ultima, exists), 'meta.ultima.sources names packages/ui/src/buton.tsx, which is not in the checkout');
});
