import { serializeDraft } from './codec.ts';
import type { ThemeDraft } from './draft.ts';

export const HISTORY_LIMIT = 100;

export type DraftHistory = {
  committed: ThemeDraft;
  past: ThemeDraft[];
  future: ThemeDraft[];
};

export function createHistory(draft: ThemeDraft): DraftHistory {
  return { committed: draft, past: [], future: [] };
}

export function commit(history: DraftHistory, next: ThemeDraft): DraftHistory {
  if (serializeDraft(next) === serializeDraft(history.committed)) return history;
  const past = [...history.past, history.committed].slice(-HISTORY_LIMIT);
  return { committed: next, past, future: [] };
}

export function canUndo(history: DraftHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: DraftHistory): boolean {
  return history.future.length > 0;
}

export function undo(history: DraftHistory): DraftHistory {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    committed: previous,
    past: history.past.slice(0, -1),
    future: [...history.future, history.committed],
  };
}

export function redo(history: DraftHistory): DraftHistory {
  const next = history.future.at(-1);
  if (next === undefined) return history;
  return {
    committed: next,
    past: [...history.past, history.committed],
    future: history.future.slice(0, -1),
  };
}
