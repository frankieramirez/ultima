import type { ColorMode } from './palette';

/** A token's value in one mode, with the palette step behind it when it has one. */
export type TokenValue = { scale?: string; step?: number; value: string };

export type TokenEntry = { group: string } & Record<ColorMode, TokenValue>;

/** One row of the Contrast gate table, measured in both modes. */
export type ContrastResult = {
  foreground: string;
  background: string;
  minimum: number;
} & Record<ColorMode, number> & { pass: boolean };

export type TokensJson = {
  version: number;
  tokens: Record<string, TokenEntry>;
  contrast: ContrastResult[];
};
