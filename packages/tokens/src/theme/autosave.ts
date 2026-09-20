import { parseDraft, serializeDraft } from './codec.ts';
import type { ThemeDraft } from './draft.ts';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const AUTOSAVE_KEY = 'ultima-theme-studio-draft';
export const AUTOSAVE_BACKUP_KEY = 'ultima-theme-studio-draft.backup';

export type AutosaveResult =
  | { status: 'empty' }
  | { status: 'restored'; draft: ThemeDraft }
  | { status: 'quarantined'; backup: string };

export function saveAutosave(draft: ThemeDraft, storage: StorageLike): void {
  storage.setItem(AUTOSAVE_KEY, serializeDraft(draft));
}

export function restoreAutosave(storage: StorageLike): AutosaveResult {
  const raw = storage.getItem(AUTOSAVE_KEY);
  if (raw === null || raw === '') return { status: 'empty' };
  const parsed = parseDraft(raw);
  if (parsed.ok) return { status: 'restored', draft: parsed.draft };
  storage.setItem(AUTOSAVE_BACKUP_KEY, raw);
  storage.removeItem(AUTOSAVE_KEY);
  return { status: 'quarantined', backup: raw };
}
