import {
  resolveDraft,
  shapePresets,
  type DensityFactor,
  type GuidedGroup,
  type MeasurePreset,
  type ThemeDraft,
  type TypeScale,
} from './draft.ts';
import { gate, type PairingResult } from './gate.ts';
import { SCALE_NAMES, type ScaleSeeds } from './recipe.ts';

export const SHUFFLE_ATTEMPT_LIMIT = 50;

export type ShuffleVariation = 'broad' | 'subtle';
export type ShuffleTarget = GuidedGroup | 'global';

export type ShuffleExhaustion = {
  failures: PairingResult[];
  locks: GuidedGroup[];
};

export type ShuffleResult =
  | { kind: 'applied'; draft: ThemeDraft; seed: number }
  | { kind: 'locked' }
  | { kind: 'exhausted'; seed: number; report: ShuffleExhaustion };

const GROUPS: GuidedGroup[] = ['color', 'typography', 'density', 'shape', 'elevation', 'motion'];

const DENSITIES: DensityFactor[] = [0.75, 1, 1.25];
const TYPE_SCALES: TypeScale[] = ['stock', 1.125, 1.2, 1.25, 1.333];
const MEASURES: MeasurePreset[] = ['compact', 'default', 'loose'];
const SIZE_STEPS = [-1, -0.5, 0.5, 1];

export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] ?? (items[0] as T);
}

function adjacent<T>(rng: () => number, items: readonly T[], current: T): T {
  const index = items.indexOf(current);
  if (index < 0 || items.length < 2) return current;
  if (index === 0) return items[1] as T;
  if (index === items.length - 1) return items[items.length - 2] as T;
  return (items[index + (rng() < 0.5 ? -1 : 1)] ?? current) as T;
}

function tenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function drawSeeds(rng: () => number, variation: ShuffleVariation, current: ScaleSeeds): ScaleSeeds {
  const seeds = {} as ScaleSeeds;
  for (const name of SCALE_NAMES) {
    const seed = current[name];
    seeds[name] =
      variation === 'broad'
        ? { hue: Math.floor(rng() * 360), saturation: rng() * 1.5 }
        : {
            hue: (Math.round(seed.hue + rng() * 30 - 15) + 360) % 360,
            saturation: clamp(seed.saturation + rng() * 0.3 - 0.15, 0, 1.5),
          };
  }
  return seeds;
}

function drawTypography(
  rng: () => number,
  variation: ShuffleVariation,
  current: ThemeDraft['typography'],
): ThemeDraft['typography'] {
  if (variation === 'broad') {
    return {
      ...current,
      baseSizePx: Math.round((14 + rng() * 4) * 2) / 2,
      scale: pick(rng, TYPE_SCALES),
      leading: pick(rng, MEASURES),
      tracking: pick(rng, MEASURES),
    };
  }
  return {
    ...current,
    baseSizePx: clamp(current.baseSizePx + pick(rng, SIZE_STEPS), 14, 18),
    scale: adjacent(rng, TYPE_SCALES, current.scale),
    leading: adjacent(rng, MEASURES, current.leading),
    tracking: adjacent(rng, MEASURES, current.tracking),
  };
}

function drawFactor(
  rng: () => number,
  variation: ShuffleVariation,
  current: number,
  min: number,
  max: number,
): number {
  if (variation === 'broad') return tenth(min + rng() * (max - min));
  return clamp(tenth(current + (rng() < 0.5 ? -0.1 : 0.1)), min, max);
}

function applyGroup(
  draft: ThemeDraft,
  group: Exclude<GuidedGroup, 'color'>,
  rng: () => number,
  variation: ShuffleVariation,
): void {
  switch (group) {
    case 'typography':
      draft.typography = drawTypography(rng, variation, draft.typography);
      break;
    case 'density':
      draft.density =
        variation === 'broad' ? pick(rng, DENSITIES) : adjacent(rng, DENSITIES, draft.density);
      break;
    case 'shape': {
      const shapes = shapePresets(draft.version);
      draft.shape = variation === 'broad' ? pick(rng, shapes) : adjacent(rng, shapes, draft.shape);
      break;
    }
    case 'elevation':
      draft.elevation = drawFactor(rng, variation, draft.elevation, 0, 2);
      break;
    case 'motion':
      draft.motion = drawFactor(rng, variation, draft.motion, 0.5, 2);
      break;
  }
}

export function shuffleDraft(
  draft: ThemeDraft,
  target: ShuffleTarget,
  variation: ShuffleVariation,
  seed: number = Math.floor(Math.random() * 2 ** 32),
): ShuffleResult {
  const scope = target === 'global' ? GROUPS : [target];
  const open = scope.filter((group) => !draft.locks[group]);
  if (open.length === 0) return { kind: 'locked' };

  const rng = createRng(seed);
  const drawn: ThemeDraft = {
    ...draft,
    color: { ...draft.color },
    typography: { ...draft.typography },
    overrides: { dark: { ...draft.overrides.dark }, light: { ...draft.overrides.light } },
    locks: { ...draft.locks },
    shuffleSeeds: { ...draft.shuffleSeeds },
  };

  for (const group of open) {
    if (group !== 'color') applyGroup(drawn, group, rng, variation);
  }

  if (!open.includes('color')) {
    drawn.shuffleSeeds[target] = seed;
    return { kind: 'applied', draft: drawn, seed };
  }

  let failures: PairingResult[] = [];
  for (let attempt = 0; attempt < SHUFFLE_ATTEMPT_LIMIT; attempt++) {
    const candidate: ThemeDraft = { ...drawn, color: drawSeeds(rng, variation, draft.color) };
    const failing = gate(resolveDraft(candidate)).filter((row) => !row.dark.pass || !row.light.pass);
    if (failing.length === 0) {
      candidate.shuffleSeeds[target] = seed;
      return { kind: 'applied', draft: candidate, seed };
    }
    failures = failing;
  }

  return {
    kind: 'exhausted',
    seed,
    report: { failures, locks: scope.filter((group) => draft.locks[group]) },
  };
}
