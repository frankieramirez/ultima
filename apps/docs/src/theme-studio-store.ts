import {
  canRedo,
  canUndo,
  commit as commitHistory,
  createHistory,
  draftFingerprint,
  redo as redoHistory,
  shuffleDraft,
  stockDraft,
  undo as undoHistory,
  type DraftHistory,
  type ShuffleExhaustion,
  type ShuffleTarget,
  type ShuffleVariation,
  type ThemeDraft,
} from '@ultima/tokens';
import { useState } from 'react';

export type DraftEdit = (draft: ThemeDraft) => ThemeDraft;

export function useStudioDraft() {
  const [{ draft, history }, setState] = useState<{ draft: ThemeDraft; history: DraftHistory }>(
    () => {
      const initial = stockDraft();
      return { draft: initial, history: createHistory(initial) };
    },
  );
  const [variation, setVariation] = useState<ShuffleVariation>('broad');
  const [exhaustion, setExhaustion] = useState<ShuffleExhaustion | null>(null);

  const update = (edit: DraftEdit) => setState((state) => ({ ...state, draft: edit(state.draft) }));

  const replace = (next: ThemeDraft) => {
    setExhaustion(null);
    setState({ draft: next, history: createHistory(next) });
  };

  const commit = (edit: DraftEdit) => {
    setExhaustion(null);
    setState((state) => {
      const next = edit(state.draft);
      const nextHistory = commitHistory(state.history, next);
      return nextHistory === state.history ? state : { draft: next, history: nextHistory };
    });
  };

  const undo = () => {
    setExhaustion(null);
    setState((state) => {
      const nextHistory = undoHistory(state.history);
      return nextHistory === state.history
        ? state
        : { draft: nextHistory.committed, history: nextHistory };
    });
  };

  const redo = () => {
    setExhaustion(null);
    setState((state) => {
      const nextHistory = redoHistory(state.history);
      return nextHistory === state.history
        ? state
        : { draft: nextHistory.committed, history: nextHistory };
    });
  };

  const shuffle = (target: ShuffleTarget) => {
    const result = shuffleDraft(draft, target, variation);
    if (result.kind === 'applied') {
      setState((state) => ({
        draft: result.draft,
        history: commitHistory(state.history, result.draft),
      }));
      setExhaustion(null);
    } else if (result.kind === 'exhausted') {
      setExhaustion(result.report);
    }
  };

  return {
    draft,
    update,
    replace,
    commit,
    undo,
    redo,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    variation,
    setVariation,
    shuffle,
    exhaustion,
    fingerprint: draftFingerprint(draft),
  };
}
