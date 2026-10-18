import { readStamp } from './stamp.ts';

export const BASE_THEME = 'neutral-tight';
export const BASE_THEME_MARKER = `@ultima-base ${BASE_THEME}`;
/** The base the tokens shipped before Neutral, which no marker names. */
export const LEGACY_BASE_THEME = 'ultima';

// Neutral shipped in #747 before the marker; retain those identities across later releases.
export const UNMARKED_NEUTRAL_HASHES = [
  'c1:1c6cb8e234999610',
  'c1:dfa4ffe539e68f4e',
  'c1:af35cf25640f91fa',
  'c1:b034ecd8f51bede6',
  'b1:a017b2da94928ac1',
];

export const MARKER = /^(?:\/\/ @ultima-base (\S+)|\/\* @ultima-base (\S+) \*\/)$/;

/**
 * The base theme a `tokens` or `tokens-css` file holds: its `@ultima-base` marker, else Neutral when its stamp or
 * its `local` content hash is a pre-marker Neutral one, else the legacy base.
 */
export function fileBaseTheme(text: string, local?: string | null): string {
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const [, ts, css] = line.trim().match(MARKER) ?? [];
    if (ts ?? css) return (ts ?? css) as string;
  }
  const stamp = readStamp(text);
  const hashes = [local, stamp && `${stamp.scheme}:${stamp.hash}`];
  return hashes.some((hash) => hash && UNMARKED_NEUTRAL_HASHES.includes(hash)) ? BASE_THEME : LEGACY_BASE_THEME;
}
