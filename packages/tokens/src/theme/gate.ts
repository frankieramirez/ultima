import type { ColorMode } from '../palette.ts';
import type { ResolvedDraft, TokenTable } from './draft.ts';
import { contrastRatio } from './recipe.ts';

export type Pairing = {
  foreground: string;
  background: string;
  minimum: number;
};

export type PairingModeResult = {
  ratio: number;
  pass: boolean;
};

export type PairingResult = Pairing & Record<ColorMode, PairingModeResult>;

const HUE_ROLES = ['accent', 'highlight', 'success', 'warning', 'danger'] as const;

function pairing(foreground: string, background: string, minimum: number): Pairing {
  return {
    foreground: `--ult-color-${foreground}`,
    background: `--ult-color-${background}`,
    minimum,
  };
}

export const PAIRINGS: Pairing[] = [
  ...['text', 'text-muted', 'text-subtle'].flatMap((foreground) =>
    ['surface', 'surface-raised', 'surface-sunken', 'surface-hover'].map((background) =>
      pairing(foreground, background, 4.5),
    ),
  ),
  ...['surface', 'surface-raised'].flatMap((background) => [
    pairing('border-strong', background, 3),
    pairing('border-focus', background, 3),
  ]),
  ...HUE_ROLES.flatMap((role) => [
    ...['surface', 'surface-raised', `${role}-subtle`].map((background) =>
      pairing(`${role}-text`, background, 4.5),
    ),
    ...[role, `${role}-hover`, `${role}-active`].map((background) =>
      pairing(`${role}-contrast`, background, 4.5),
    ),
  ]),
  ...['action', 'action-hover', 'action-active'].map((background) =>
    pairing('action-contrast', background, 4.5),
  ),
];

function modeResult(table: TokenTable, pairing: Pairing): PairingModeResult {
  const ratio = contrastRatio(table[pairing.foreground] ?? '', table[pairing.background] ?? '');
  return { ratio, pass: ratio >= pairing.minimum };
}

export function gate(tables: ResolvedDraft): PairingResult[] {
  return PAIRINGS.map((pairing) => ({
    ...pairing,
    dark: modeResult(tables.dark, pairing),
    light: modeResult(tables.light, pairing),
  }));
}
