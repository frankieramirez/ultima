import { expect, test } from 'vitest';

import { stockDraft } from '../theme/draft.ts';
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
  payload.version = 2;
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
