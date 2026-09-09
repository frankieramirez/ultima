import type { ContrastResult, TokenEntry } from '@ultima/tokens';
import tokensJson from '@ultima/tokens/tokens.json';

export type Token = TokenEntry & { name: string };
export type TokenGroup = { name: string; tokens: Token[] };

const byGroup = new Map<string, TokenGroup>();
for (const [name, entry] of Object.entries(tokensJson.tokens)) {
  const group = byGroup.get(entry.group) ?? { name: entry.group, tokens: [] };
  group.tokens.push({ ...entry, name });
  byGroup.set(entry.group, group);
}

export const tokenGroups: TokenGroup[] = [...byGroup.values()];

export const contrast: ContrastResult[] = tokensJson.contrast;

export const tokensByName = new Map<string, Token>(
  tokenGroups.flatMap((group) => group.tokens.map((token) => [token.name, token] as const)),
);
