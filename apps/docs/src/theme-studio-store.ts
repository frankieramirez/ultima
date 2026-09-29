import {
  canRedo,
  canUndo,
  commit as commitHistory,
  createHistory,
  draftFingerprint,
  redo as redoHistory,
  SHUFFLE_ATTEMPT_LIMIT,
  shuffleDraft,
  presetDraft,
  undo as undoHistory,
  type DraftHistory,
  type ShuffleExhaustion,
  type ShuffleTarget,
  type ShuffleVariation,
  type ThemeDraft,
} from '@ultima/tokens';
import { useState } from 'react';

import { draftSummary, groupLabel } from './theme-studio-draft';

// Word Joiner: invisible and zero-width. Same string twice is not a live-region change; this is.
const WORD_JOINER = '\u2060';

export type DraftEdit = (draft: ThemeDraft) => ThemeDraft;

export function useStudioDraft() {
  const [{ draft, history }, setState] = useState<{ draft: ThemeDraft; history: DraftHistory }>(
    () => {
      const initial = presetDraft('neutral');
      return { draft: initial, history: createHistory(initial) };
    },
  );
  const [variation, setVariation] = useState<ShuffleVariation>('broad');
  const [exhaustion, setExhaustion] = useState<ShuffleExhaustion | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const announce = (text: string) =>
    setAnnouncement((current) => (text !== '' && current === text ? `${text}${WORD_JOINER}` : text));

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
      announce(draftSummary(result.draft));
    } else if (result.kind === 'exhausted') {
      setExhaustion(result.report);
      announce(`No passing palette in ${SHUFFLE_ATTEMPT_LIMIT} attempts`);
    } else {
      announce(target === 'global' ? 'All groups are locked' : `${groupLabel(target)} is locked`);
    }
  };

  return {
    draft,
    committedDraft: history.committed,
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
    announcement,
    announce,
    fingerprint: draftFingerprint(draft),
  };
}
