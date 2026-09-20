import { expect, test } from 'vitest';

import { stockDraft, type ThemeDraft } from '../theme/draft.ts';
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  HISTORY_LIMIT,
  redo,
  undo,
} from '../theme/history.ts';
import { shuffleDraft } from '../theme/shuffle.ts';

function edited(base: ThemeDraft, motion: number): ThemeDraft {
  return { ...base, motion };
}

test('every committed mutation pushes one entry that undo restores and redo reapplies', () => {
  const base = stockDraft();
  const next = edited(base, 1.4);
  let history = createHistory(base);

  expect(canUndo(history)).toBe(false);
  expect(canRedo(history)).toBe(false);

  history = commit(history, next);
  expect(history.committed).toEqual(next);
  expect(canUndo(history)).toBe(true);

  history = undo(history);
  expect(history.committed).toEqual(base);
  expect(canUndo(history)).toBe(false);
  expect(canRedo(history)).toBe(true);

  history = redo(history);
  expect(history.committed).toEqual(next);
  expect(canRedo(history)).toBe(false);
});

test('editing after undo truncates the redo tail', () => {
  const base = stockDraft();
  let history = commit(createHistory(base), edited(base, 1.4));
  history = commit(history, edited(base, 1.6));
  history = undo(history);
  history = commit(history, edited(base, 0.8));
  expect(history.committed.motion).toBe(0.8);
  expect(canRedo(history)).toBe(false);
});

test('the history caps at 100 entries', () => {
  let history = createHistory(stockDraft());
  for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
    history = commit(history, edited(history.committed, 0.5 + i));
  }
  expect(history.past).toHaveLength(HISTORY_LIMIT);
});

test('a commit that changes nothing pushes no entry', () => {
  const base = stockDraft();
  const history = commit(createHistory(base), stockDraft());
  expect(history.past).toHaveLength(0);
  expect(canUndo(history)).toBe(false);
});

test('reset restores the stock draft as one entry and undo returns the whole draft', () => {
  const draft = stockDraft();
  draft.locks.color = true;
  draft.density = 0.75;
  draft.overrides.dark['--ult-color-accent'] = '#ff00aa';
  draft.overrides.light['--ult-color-accent'] = '#00ffaa';

  let history = commit(createHistory(draft), stockDraft());
  expect(history.committed).toEqual(stockDraft());

  history = undo(history);
  expect(history.committed).toEqual(draft);
  expect(history.committed.locks.color).toBe(true);
  expect(history.committed.overrides.dark['--ult-color-accent']).toBe('#ff00aa');

  history = redo(history);
  expect(history.committed).toEqual(stockDraft());
});

test('a shuffle seed replays identically through undo and redo', () => {
  const draft = stockDraft();
  draft.locks.color = true;
  const result = shuffleDraft(draft, 'typography', 'broad', 21);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') return;

  let history = commit(createHistory(draft), result.draft);
  history = undo(history);
  expect(history.committed).toEqual(draft);
  history = redo(history);
  expect(history.committed).toEqual(result.draft);
  expect(history.committed.shuffleSeeds.typography).toBe(21);
});
