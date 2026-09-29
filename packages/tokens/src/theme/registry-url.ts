import { encodeFragment, FRAGMENT_SAFE_LENGTH, serializeDraft } from './codec.ts';
import type { ThemeDraft } from './draft.ts';

export const THEME_REGISTRY_PATH = '/r/theme.json';
export const REGISTRY_URL_MAX_LENGTH = FRAGMENT_SAFE_LENGTH;
export const REGISTRY_DRAFT_MAX_BYTES = 64 * 1024;

export async function createRegistryUrl(draft: ThemeDraft, origin: string): Promise<{ url: string; tooLong: boolean }> {
  if (new TextEncoder().encode(serializeDraft(draft)).byteLength > REGISTRY_DRAFT_MAX_BYTES) return { url: '', tooLong: true };
  const encoded = await encodeFragment(draft);
  const url = new URL(THEME_REGISTRY_PATH, origin);
  url.searchParams.set('theme', encoded.fragment.slice('#theme='.length));
  return { url: url.href, tooLong: encoded.tooLong || url.href.length > REGISTRY_URL_MAX_LENGTH };
}
