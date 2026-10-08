import { presetDraft } from '../../../packages/tokens/src/theme/draft.ts';
import { createRegistryUrl } from '../../../packages/tokens/src/theme/registry-url.ts';

export function ultimaPresetUrl() {
  return createRegistryUrl(presetDraft({ id: 'ultima', revision: 2 }), 'https://ultima.systems');
}
