import { stockDraft, type ThemeDraft } from '../../../packages/tokens/src/theme/draft.ts';
import { shuffleDraft } from '../../../packages/tokens/src/theme/shuffle.ts';

/**
 * The non-stock passing Studio draft: Neutral, shuffled globally from a fixed seed. The installed-consumer
 * proof installs it (scripts/consumer-proof.ts) and Build a screen renders its product-token lesson in it.
 */
export function proofDraft(): ThemeDraft {
  const shuffled = shuffleDraft(stockDraft(), 'global', 'broad', 20260920);
  if (shuffled.kind !== 'applied') throw new Error('the proof draft shuffle no longer applies');
  return shuffled.draft;
}
