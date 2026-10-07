import type { ColorMode } from '../palette.ts';
import { modeResolver, type ThemeDraft, type TokenTable } from './draft.ts';
import { PAIRINGS, type Pairing } from './gate.ts';
import { contrastRatio, hexToOklch, oklchToHex } from './recipe.ts';

const DERIVED_ONLY = new Set(['--ult-color-surface-overlay']);

const STEPS = 1000;

export type ClosestPassingValue = { value: string } | { reason: string };

function overridden(draft: ThemeDraft, token: string): boolean {
  return draft.overrides.dark[token] !== undefined || draft.overrides.light[token] !== undefined;
}

function samePairing(a: Pairing, b: Pairing): boolean {
  return a.foreground === b.foreground && a.background === b.background;
}

function ratio(table: TokenTable, pairing: Pairing): number {
  return contrastRatio(table[pairing.foreground] ?? '', table[pairing.background] ?? '');
}

/** The token a fix changes: the overridden one, else the foreground, unless that one is not directly editable. */
export function fixTarget(draft: ThemeDraft, pairing: Pairing): string {
  const preferred =
    overridden(draft, pairing.background) && !overridden(draft, pairing.foreground)
      ? pairing.background
      : pairing.foreground;
  if (!DERIVED_ONLY.has(preferred)) return preferred;
  return preferred === pairing.foreground ? pairing.background : pairing.foreground;
}

export function closestPassingValue(draft: ThemeDraft, pairing: Pairing, mode: ColorMode): ClosestPassingValue {
  const target = fixTarget(draft, pairing);
  const reason = `No lightness at this hue passes every pairing for ${target.replace(/^--ult-color-/, '')}.`;
  const resolve = modeResolver(draft, mode);
  const before = resolve(draft.overrides[mode]);
  const current = before[target];
  if (current === undefined || !/^#[0-9a-f]{6}$/i.test(current)) return { reason };
  const { L, C, h } = hexToOklch(current);
  // The target's own pairings must pass, and a derived on-color that follows the target must not break one that passed.
  const checks = [
    pairing,
    ...PAIRINGS.filter(
      (other) =>
        !samePairing(other, pairing) &&
        (other.foreground === target || other.background === target || ratio(before, other) >= other.minimum),
    ),
  ];

  const scoreByHex = new Map<string, number | null>();
  const scoreHex = (value: string): number | null => {
    if (!scoreByHex.has(value)) {
      const table = resolve({ ...draft.overrides[mode], [target]: value });
      scoreByHex.set(value, checks.every((check) => ratio(table, check) >= check.minimum) ? ratio(table, pairing) : null);
    }
    return scoreByHex.get(value) ?? null;
  };

  for (let k = 0; k <= STEPS; k++) {
    let best: { value: string; ratio: number } | null = null;
    for (const lightness of k === 0 ? [L] : [L - k / STEPS, L + k / STEPS]) {
      if (lightness < 0 || lightness > 1) continue;
      const value = oklchToHex(lightness, C, h);
      const passing = scoreHex(value);
      if (passing !== null && (best === null || passing > best.ratio)) best = { value, ratio: passing };
    }
    if (best) return { value: best.value };
  }
  return { reason };
}

/**
 * Writes the closest passing value in each mode where the pairing fails, as one draft. A linked row
 * whose one written mode lands on the other mode's resolved value pins that value too, so it stays linked.
 */
export function applyClosestPassingValue(draft: ThemeDraft, pairing: Pairing): { draft: ThemeDraft } | { reason: string } {
  const target = fixTarget(draft, pairing);
  const next: ThemeDraft = { ...draft, overrides: { dark: { ...draft.overrides.dark }, light: { ...draft.overrides.light } } };
  const resolved = { dark: modeResolver(draft, 'dark')(draft.overrides.dark), light: modeResolver(draft, 'light')(draft.overrides.light) };
  const written: ColorMode[] = [];
  for (const mode of ['dark', 'light'] as const) {
    if (ratio(resolved[mode], pairing) >= pairing.minimum) continue;
    const result = closestPassingValue(draft, pairing, mode);
    if ('reason' in result) return result;
    next.overrides[mode][target] = result.value;
    written.push(mode);
  }
  const [only] = written;
  if (written.length === 1 && only && draft.overrides.dark[target] === draft.overrides.light[target]) {
    const other = only === 'dark' ? 'light' : 'dark';
    if (resolved[other][target] === next.overrides[only][target]) next.overrides[other][target] = resolved[other][target];
  }
  return { draft: next };
}
