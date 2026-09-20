import type { ColorMode, ScaleName } from '../palette.ts';

export type { ColorMode, ScaleName };

export const SCALE_NAMES = ['mithril', 'arcane', 'mana', 'verdant', 'ember', 'ruin'] as const;

export const RECIPE_VERSION = 1;

export type ScaleSeed = {
  hue: number;
  saturation: number;
};

export type ScaleSeeds = Record<ScaleName, ScaleSeed>;

export type GeneratedScales = Record<ScaleName, Record<ColorMode, string[]>>;

export const STOCK_SEEDS: ScaleSeeds = {
  mithril: { hue: 276, saturation: 1 },
  arcane: { hue: 275, saturation: 1 },
  mana: { hue: 204, saturation: 1 },
  verdant: { hue: 162, saturation: 1 },
  ember: { hue: 79, saturation: 1 },
  ruin: { hue: 21, saturation: 1 },
};

const PEAK: Record<ScaleName, Record<ColorMode, number>> = {
  mithril: { dark: 0.005, light: 0.02 },
  arcane: { dark: 0.17, light: 0.19 },
  mana: { dark: 0.12, light: 0.12 },
  verdant: { dark: 0.13, light: 0.14 },
  ember: { dark: 0.13, light: 0.14 },
  ruin: { dark: 0.15, light: 0.17 },
};

const L_DARK_BG = [0.162, 0.195, 0.235, 0.275, 0.315, 0.36, 0.42, 0.5];
const L_LIGHT_BG = [0.995, 0.982, 0.96, 0.935, 0.905, 0.87, 0.82, 0.74];

const L_TOP: Record<ScaleName, Record<ColorMode, number[]>> = {
  mithril: { dark: [0.6, 0.66, 0.78, 0.93], light: [0.56, 0.5, 0.44, 0.22] },
  arcane: { dark: [0.7, 0.75, 0.8, 0.86], light: [0.55, 0.5, 0.46, 0.4] },
  mana: { dark: [0.8, 0.85, 0.89, 0.912], light: [0.55, 0.5, 0.46, 0.42] },
  verdant: { dark: [0.76, 0.81, 0.85, 0.88], light: [0.54, 0.49, 0.45, 0.42] },
  ember: { dark: [0.8, 0.84, 0.88, 0.9], light: [0.78, 0.72, 0.66, 0.45] },
  ruin: { dark: [0.66, 0.71, 0.76, 0.82], light: [0.58, 0.53, 0.48, 0.42] },
};

const L78: Partial<Record<ScaleName, Partial<Record<ColorMode, [number, number]>>>> = {
  mithril: { light: [0.78, 0.64] },
};

const CF: Record<ColorMode, number[]> = {
  dark: [0.15, 0.25, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.75],
  light: [0.05, 0.12, 0.25, 0.35, 0.45, 0.55, 0.65, 0.8, 1, 1, 1, 0.8],
};

const CF_OVR: Partial<Record<ScaleName, Partial<Record<ColorMode, number[]>>>> = {
  mithril: {
    dark: [0.4, 0.6, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 0.8, 0.4],
    light: [0.3, 0.45, 0.6, 0.7, 0.85, 1, 1, 1, 1, 1, 1, 1],
  },
};

function linToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(rgb: readonly number[]): boolean {
  return rgb.every((c) => -1e-4 <= c && c <= 1 + 1e-4);
}

/** Python 3 `round()`: ties round to even. Channels are non-negative. */
function pythonRound(value: number): number {
  if (value < 0) return -pythonRound(-value);
  const integer = Math.trunc(value);
  const fraction = value - integer;
  if (fraction > 0.5) return integer + 1;
  if (fraction < 0.5) return integer;
  return integer % 2 === 0 ? integer : integer + 1;
}

function oklchToHex(L: number, C: number, H: number): string {
  let chroma = C;
  if (!inGamut(oklchToRgb(L, C, H))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgb(L, mid, H))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  return `#${oklchToRgb(L, chroma, H)
    .map((c) => {
      const channel = pythonRound(linToSrgb(Math.min(1, Math.max(0, c))) * 255);
      return Math.min(255, Math.max(0, channel)).toString(16).padStart(2, '0');
    })
    .join('')}`;
}

export function generateScales(seeds: ScaleSeeds): GeneratedScales {
  const out = {} as GeneratedScales;
  for (const name of SCALE_NAMES) {
    const seed = seeds[name];
    out[name] = { dark: [], light: [] };
    for (const mode of ['dark', 'light'] as const) {
      const lightness = [...(mode === 'dark' ? L_DARK_BG : L_LIGHT_BG), ...L_TOP[name][mode]];
      const override = L78[name]?.[mode];
      if (override) {
        lightness[6] = override[0];
        lightness[7] = override[1];
      }
      const fractions = CF_OVR[name]?.[mode] ?? CF[mode];
      const peak = PEAK[name][mode] * seed.saturation;
      out[name][mode] = lightness.map((L, i) => oklchToHex(L, peak * (fractions[i] ?? 0), seed.hue));
    }
  }
  return out;
}

export function srgbToLin(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const digits = hex.replace('#', '');
    const r = srgbToLin(Number.parseInt(digits.slice(0, 2), 16) / 255);
    const g = srgbToLin(Number.parseInt(digits.slice(2, 4), 16) / 255);
    const b = srgbToLin(Number.parseInt(digits.slice(4, 6), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = lum(a);
  const second = lum(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
