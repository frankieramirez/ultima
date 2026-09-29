import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';

import { themeRegistry } from '../../apps/docs/server/theme-registry.ts';
import worker from '../../apps/docs/server/worker.ts';
import { stockDraft } from '../../packages/tokens/src/theme/draft.ts';
import { toRegistryItem } from '../../packages/tokens/src/theme/export.ts';
import { createRegistryUrl, THEME_REGISTRY_PATH } from '../../packages/tokens/src/theme/registry-url.ts';

const origin = 'https://ultima.systems';
const urlFor = (json: string) => `${origin}${THEME_REGISTRY_PATH}?theme=${deflateSync(json).toString('base64url')}`;

test('the install URL returns the same complete registry as the file export', async () => {
  const draft = stockDraft();
  draft.typography.sans = 'Roboto, sans-serif';
  draft.overrides.light['--ult-color-accent'] = '#123456';
  draft.locks.typography = true;
  const { url, tooLong } = await createRegistryUrl(draft, origin);
  assert.equal(tooLong, false);
  assert.equal(new URL(url).hash, '');
  const response = await themeRegistry(new Request(url));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(await response.text(), toRegistryItem(draft));
  const head = await themeRegistry(new Request(url, { method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('a highly compressible oversized draft uses the download fallback before reaching the endpoint', async () => {
  const draft = stockDraft();
  draft.typography.sans = 'a'.repeat(100_000);
  assert.equal((await createRegistryUrl(draft, origin)).tooLong, true);
});

test('malformed themes, unsupported versions and oversized drafts fail without a registry item', async () => {
  const malformed = [
    `${origin}${THEME_REGISTRY_PATH}`,
    `${origin}${THEME_REGISTRY_PATH}?theme=abc&theme=def`,
    `${origin}${THEME_REGISTRY_PATH}?theme=bad%24value`,
    `${origin}${THEME_REGISTRY_PATH}?theme=abc`,
    urlFor('{'),
    urlFor(JSON.stringify({ ...stockDraft(), version: 999 })),
    urlFor(JSON.stringify({ ...stockDraft(), typography: { ...stockDraft().typography, sans: 'a'.repeat(100_000) } })),
  ];
  for (const url of malformed) {
    const response = await themeRegistry(new Request(url));
    assert.equal(response.status, 400, url);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  const tooLong = await themeRegistry(new Request(`${origin}${THEME_REGISTRY_PATH}?theme=${'a'.repeat(3000)}`));
  assert.equal(tooLong.status, 414);
  const post = await themeRegistry(new Request(`${origin}${THEME_REGISTRY_PATH}`, { method: 'POST' }));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('the Pages worker forwards ordinary requests and handles only the theme endpoint', async () => {
  const response = new Response('asset');
  const request = new Request(`${origin}/components/button`);
  let forwarded: Request | null = null;
  const ASSETS = { async fetch(incoming: Request) { forwarded = incoming; return response; } };
  assert.equal(await worker.fetch(request, { ASSETS }), response);
  assert.equal(forwarded, request);
  forwarded = null;
  const { url } = await createRegistryUrl(stockDraft(), origin);
  assert.equal((await worker.fetch(new Request(url), { ASSETS })).status, 200);
  assert.equal(forwarded, null);
});
