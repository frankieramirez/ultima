import { expect, test } from 'vitest';

import { resolveDraft, stockDraft } from '../theme/draft.ts';
import {
  decodeFragment,
  encodeFragment,
  FRAGMENT_SAFE_LENGTH,
  parseDraft,
  serializeDraft,
} from '../theme/codec.ts';

test('serializeDraft round-trips through parseDraft', () => {
  const draft = stockDraft();
  draft.shuffleSeeds.global = 42;
  draft.locks.color = true;
  draft.overrides.dark['--ult-color-accent'] = '#ff00aa';

  const parsed = parseDraft(serializeDraft(draft));
  expect(parsed).toEqual({ ok: true, draft });
});

test('parseDraft refuses malformed documents with a named reason', () => {
  for (const input of ['', '{', 'null', '[]', '{"version":1}', serializeDraft(stockDraft()).slice(0, 20)]) {
    const parsed = parseDraft(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe('malformed');
  }
});

test('parseDraft refuses an unknown version without loading fields', () => {
  const payload = JSON.parse(serializeDraft(stockDraft())) as { version: number };
  payload.version = 999;
  const parsed = parseDraft(JSON.stringify(payload));
  expect(parsed).toEqual({
    ok: false,
    reason: 'unknown-version',
    message: expect.stringMatching(/version/i),
  });
});

test('encodeFragment and decodeFragment round-trip a draft', async () => {
  const draft = stockDraft();
  draft.overrides.light['--ult-space-4'] = '2rem';
  const encoded = await encodeFragment(draft);
  expect(encoded.fragment.startsWith('#theme=')).toBe(true);
  expect(encoded.tooLong).toBe(false);
  expect(encoded.fragment.length).toBeLessThanOrEqual(FRAGMENT_SAFE_LENGTH);
  await expect(decodeFragment(encoded.fragment)).resolves.toEqual({ ok: true, draft });
});

test('encodeFragment marks an oversize draft', async () => {
  const draft = stockDraft();
  draft.typography.sans = Array.from(crypto.getRandomValues(new Uint8Array(FRAGMENT_SAFE_LENGTH)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const encoded = await encodeFragment(draft);
  expect(encoded.tooLong).toBe(true);
  expect(encoded.fragment.length).toBeGreaterThan(FRAGMENT_SAFE_LENGTH);
  await expect(decodeFragment(encoded.fragment)).resolves.toEqual({ ok: true, draft });
});

test('decodeFragment refuses a malformed fragment', async () => {
  const decoded = await decodeFragment('#theme=%%%');
  expect(decoded.ok).toBe(false);
  if (!decoded.ok) expect(decoded.reason).toBe('malformed');
});

test('imports normalize opaque hex overrides before deriving overlay colors', () => {
  const draft = stockDraft();
  draft.overrides.dark['--ult-color-surface-raised'] = '#ABC';
  const parsed = parseDraft(serializeDraft(draft));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.draft.overrides.dark['--ult-color-surface-raised']).toBe('#aabbcc');
  expect(resolveDraft(parsed.draft).dark['--ult-color-surface-overlay']).toBe('#aabbccb3');
});

test('imports reject unsupported recipes, guided ranges, and token overrides', () => {
  const invalid = [
    { recipeVersion: 999 },
    ...[-1, 2.1].map((elevation) => ({ elevation })),
    ...[0, 2.1].map((motion) => ({ motion })),
    ...[13.9, 18.1].map((baseSizePx) => ({ typography: { ...stockDraft().typography, baseSizePx } })),
    ...[{ hue: -1, saturation: 1 }, { hue: 360, saturation: 1 }, { hue: 0, saturation: -0.1 }, { hue: 0, saturation: 1.6 }]
      .map((mithril) => ({ color: { ...stockDraft().color, mithril } })),
    ...[
      ['--ult-color-surface-raised', 'rgb(20, 20, 20)'],
      ['--ult-color-accent', '#ffffff80'],
      ['--ult-color-accent', 'var(--other)'],
      ['--ult-color-unknown', '#ffffff'],
      ['--ult-color-surface-overlay', '#ffffff'],
      ['--ult-radius-full', '12px'],
      ['--ult-radius-md', '97px'],
      ['--ult-radius-md', '-1px'],
      ['--ult-radius-md', '2rem'],
      ['--ult-motion-base', ''],
      ['--ult-filter-backdrop', 'blur(1px)'],
    ].map(([name, value]) => ({ overrides: { dark: { [name!]: value }, light: {} } })),
  ];
  for (const patch of invalid) {
    const result = parseDraft(JSON.stringify({ ...stockDraft(), ...patch }));
    expect(result, JSON.stringify(patch)).toMatchObject({ ok: false, message: expect.any(String) });
  }
});


test('shared drafts use the same validation and preserve contrast-failing overrides', async () => {
  const draft = stockDraft();
  draft.overrides.dark['--ult-color-surface'] = '#ffffff';
  draft.overrides.dark['--ult-color-text'] = '#ffffff';
  draft.overrides.light['--ult-color-surface-raised'] = '#123ABC';
  const decoded = await decodeFragment((await encodeFragment(draft)).fragment);
  expect(decoded.ok).toBe(true);
  if (!decoded.ok) return;
  expect(decoded.draft.overrides.dark).toEqual(draft.overrides.dark);
  expect(resolveDraft(decoded.draft).light['--ult-color-surface-overlay']).toBe('#123abccc');
  expect(parseDraft(serializeDraft(decoded.draft))).toEqual(decoded);
  draft.motion = -1;
  await expect(decodeFragment((await encodeFragment(draft)).fragment)).resolves.toMatchObject({ ok: false });
});

test('guided bounds and editable non-color overrides round-trip', () => {
  for (const upper of [false, true]) {
    const draft = stockDraft();
    draft.color.mithril = { hue: upper ? 359.9 : 0, saturation: upper ? 1.5 : 0 };
    draft.typography.baseSizePx = upper ? 18 : 14;
    draft.motion = upper ? 2 : 0.5;
    draft.elevation = upper ? 2 : 0;
    draft.overrides.dark = {
      '--ult-radius-md': upper ? '96px' : '0px',
      '--ult-font-weight-regular': '450',
      '--ult-shadow-sm': 'none',
      '--ult-motion-base': '150ms',
      '--ult-color-accent-contrast': '#ffffff',
    };
    expect(parseDraft(serializeDraft(draft))).toEqual({ ok: true, draft });
  }
});
