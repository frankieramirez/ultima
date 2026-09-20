import { expect, test } from 'vitest';

import { stockDraft } from '../theme/draft.ts';
import {
  AUTOSAVE_BACKUP_KEY,
  AUTOSAVE_KEY,
  restoreAutosave,
  saveAutosave,
  type StorageLike,
} from '../theme/autosave.ts';

function memoryStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

test('saveAutosave restores silently on the next visit', () => {
  const storage = memoryStorage();
  const draft = stockDraft();
  draft.locks.motion = true;
  saveAutosave(draft, storage);
  expect(restoreAutosave(storage)).toEqual({ status: 'restored', draft });
});

test('a corrupt autosave is quarantined to the backup key', () => {
  const storage = memoryStorage({ [AUTOSAVE_KEY]: '{not-a-draft' });
  expect(restoreAutosave(storage)).toEqual({
    status: 'quarantined',
    backup: '{not-a-draft',
  });
  expect(storage.getItem(AUTOSAVE_KEY)).toBeNull();
  expect(storage.getItem(AUTOSAVE_BACKUP_KEY)).toBe('{not-a-draft');
});

test('restoreAutosave reports empty when nothing is stored', () => {
  expect(restoreAutosave(memoryStorage())).toEqual({ status: 'empty' });
});
