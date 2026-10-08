import type { ColorMode } from '../palette.ts';
import {
  BASE_RECIPE_VERSION,
  contrastRatio,
  generateInkStates,
  generateScales,
  RECIPE_VERSION,
  type InkStates,
  SCALE_NAMES,
  STOCK_SEEDS,
  type ScaleName,
  type ScaleSeeds,
} from './recipe.ts';

export const THEME_DRAFT_VERSION = 3;

export const THEME_PRESETS = [
  { id: 'neutral', label: 'Neutral', description: 'Achromatic · balanced' },
  { id: 'ultima', label: 'Ultima', description: 'Indigo / cyan · balanced' },
  { id: 'grove', label: 'Grove', description: 'Green / earthy · serif · roomy' },
  { id: 'cinder', label: 'Cinder', description: 'Copper · compact · sharp' },
] as const;

export type ThemePresetId = (typeof THEME_PRESETS)[number]['id'];
export type ThemePresetRevision = 1 | 2;
export type ThemePresetOrigin = { id: ThemePresetId; revision: ThemePresetRevision };

export type GuidedGroup = 'color' | 'typography' | 'density' | 'shape' | 'elevation' | 'motion';

export type TypeScale = 'stock' | 1.125 | 1.2 | 1.25 | 1.333;
export type MeasurePreset = 'compact' | 'default' | 'loose';
export type DensityFactor = 0.75 | 1 | 1.25;
export type ShapePreset = 'sharp' | 'default' | 'soft' | 'round';
export type AccentFill = 'hue' | 'ink';

export type TokenTable = Record<string, string>;

export type ThemeDraft = {
  version: 1 | 2 | typeof THEME_DRAFT_VERSION;
  preset?: ThemePresetOrigin | null;
  accentFill?: AccentFill;
  recipeVersion: number;
  color: ScaleSeeds;
  typography: {
    sans: string;
    mono: string;
    baseSizePx: number;
    scale: TypeScale;
    leading: MeasurePreset;
    tracking: MeasurePreset;
  };
  density: DensityFactor;
  shape: ShapePreset;
  elevation: number;
  motion: number;
  overrides: { dark: Partial<TokenTable>; light: Partial<TokenTable> };
  locks: Record<GuidedGroup, boolean>;
  shuffleSeeds: Partial<Record<GuidedGroup | 'global', number>>;
};

export type ResolvedDraft = { dark: TokenTable; light: TokenTable };

export const STOCK_SANS =
  "'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
export const STOCK_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const SPACE_PX = [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];
const TEXT_PX = [11, 12, 13, 14, 16, 18, 20, 24, 30, 36, 48, 52];

const LEADING: Record<MeasurePreset, Record<string, number>> = {
  default: { none: 1, tight: 1.2, snug: 1.35, normal: 1.55, relaxed: 1.75 },
  compact: { none: 1, tight: 1.15, snug: 1.3, normal: 1.45, relaxed: 1.6 },
  loose: { none: 1, tight: 1.3, snug: 1.45, normal: 1.65, relaxed: 1.85 },
};

const TRACKING: Record<MeasurePreset, Record<string, string>> = {
  default: { tightest: '-0.04em', tighter: '-0.03em', tight: '-0.02em', normal: '0', wide: '0.08em', wider: '0.14em' },
  compact: { tightest: '-0.05em', tighter: '-0.04em', tight: '-0.03em', normal: '-0.01em', wide: '0.06em', wider: '0.12em' },
  loose: { tightest: '-0.03em', tighter: '-0.02em', tight: '-0.01em', normal: '0.01em', wide: '0.1em', wider: '0.18em' },
};

type RadiusTable = Partial<Record<ShapePreset, Record<'xs' | 'sm' | 'md' | 'lg', number>>>;

const RADIUS: RadiusTable = {
  sharp: { xs: 0, sm: 0, md: 0, lg: 0 },
  default: { xs: 1, sm: 2, md: 4, lg: 6 },
  soft: { xs: 2, sm: 4, md: 10, lg: 12 },
  round: { xs: 6, sm: 10, md: 16, lg: 24 },
};

const RADIUS_V1_V2: RadiusTable = {
  sharp: { xs: 0, sm: 2, md: 4, lg: 6 },
  default: { xs: 2, sm: 4, md: 10, lg: 12 },
  round: { xs: 6, sm: 10, md: 16, lg: 24 },
};

function radiusTable(version: ThemeDraft['version']): RadiusTable {
  return version === THEME_DRAFT_VERSION ? RADIUS : RADIUS_V1_V2;
}

export function shapePresets(version: ThemeDraft['version']): ShapePreset[] {
  return Object.keys(radiusTable(version)) as ShapePreset[];
}

const REVISION_2_SHAPES: Record<ThemePresetId, ShapePreset> = {
  neutral: 'default',
  ultima: 'soft',
  grove: 'round',
  cinder: 'sharp',
};

const SHADOW_LAYERS: Record<ColorMode, Record<'sm' | 'md' | 'lg', [number, number]>> = {
  dark: { sm: [0.3, 0.4], md: [0.35, 0.45], lg: [0.4, 0.5] },
  light: { sm: [0.06, 0.1], md: [0.08, 0.12], lg: [0.12, 0.18] },
};

const SHADOW_GEOMETRY: Record<'sm' | 'md' | 'lg', [string, string]> = {
  sm: ['0 1px 2px', '0 1px 3px'],
  md: ['0 4px 8px', '0 8px 24px'],
  lg: ['0 12px 24px', '0 24px 48px'],
};

const HUE_ROLES: Record<string, ScaleName> = {
  accent: 'arcane',
  highlight: 'mana',
  success: 'verdant',
  warning: 'ember',
  danger: 'ruin',
};

const CONTRAST_ROLES = [...Object.keys(HUE_ROLES), 'action'] as const;

const OVERLAY_ALPHA: Record<ColorMode, string> = { dark: 'b3', light: 'cc' };

function step(scales: ReturnType<typeof generateScales>, scale: ScaleName, mode: ColorMode, n: number): string {
  return scales[scale][mode][n - 1] ?? '#000000';
}

function pickContrast(fills: [string, string, string], mithril1: string, mithril12: string): string {
  const score = (candidate: string) => Math.min(...fills.map((fill) => contrastRatio(candidate, fill)));
  return score(mithril12) > score(mithril1) ? mithril12 : mithril1;
}

function snapHalfPx(px: number): number {
  return Math.max(1, Math.round(px * 2) / 2);
}

function formatRem(px: number): string {
  return `${px / 16}rem`;
}

function formatAlpha(value: number): string {
  const clamped = Math.min(1, Math.max(0, value));
  const fixed = clamped.toFixed(2);
  return fixed.startsWith('0.') ? fixed.slice(1) : fixed;
}

function shadowValue(mode: ColorMode, strength: number, size: 'sm' | 'md' | 'lg'): string {
  if (strength === 0) return 'none';
  const [a, b] = SHADOW_LAYERS[mode][size];
  const [first, second] = SHADOW_GEOMETRY[size];
  return `${first} rgba(0,0,0,${formatAlpha(a * strength)}), ${second} rgba(0,0,0,${formatAlpha(b * strength)})`;
}

function snapMs(ms: number): string {
  return `${Math.round(ms / 10) * 10}ms`;
}

function colorTable(
  scales: ReturnType<typeof generateScales>,
  mode: ColorMode,
  ink: Record<ColorMode, InkStates> | null,
): TokenTable {
  const m = (scale: ScaleName, n: number) => step(scales, scale, mode, n);
  const table: TokenTable = {
    '--ult-color-surface': m('mithril', 1),
    '--ult-color-surface-raised': m('mithril', 2),
    '--ult-color-surface-sunken': m('mithril', 3),
    '--ult-color-surface-hover': m('mithril', 4),
    '--ult-color-surface-active': m('mithril', 5),
    '--ult-color-text': m('mithril', 12),
    '--ult-color-text-muted': m('mithril', 11),
    '--ult-color-text-subtle': m('mithril', 10),
    '--ult-color-text-inverse': m('mithril', 1),
    '--ult-color-border': m('mithril', 6),
    '--ult-color-border-strong': m('mithril', 8),
    '--ult-color-border-focus': m('arcane', 9),
    '--ult-color-action': m('mana', 9),
    '--ult-color-action-hover': m('mana', 10),
    '--ult-color-action-active': m('mana', 11),
  };

  for (const [role, scale] of Object.entries(HUE_ROLES)) {
    table[`--ult-color-${role}`] = m(scale, 9);
    table[`--ult-color-${role}-hover`] = m(scale, 10);
    table[`--ult-color-${role}-active`] = m(scale, 11);
    table[`--ult-color-${role}-subtle`] = m(scale, 3);
    table[`--ult-color-${role}-border`] = m(scale, 7);
    table[`--ult-color-${role}-text`] = m(scale, 12);
  }

  if (ink) {
    table['--ult-color-accent'] = m('mithril', 12);
    table['--ult-color-accent-hover'] = ink[mode].hover;
    table['--ult-color-accent-active'] = ink[mode].active;
    table['--ult-color-accent-subtle'] = m('mithril', 3);
    table['--ult-color-accent-border'] = m('mithril', 7);
    table['--ult-color-accent-text'] = m('mithril', 12);
  }

  assignContrast(table);
  table['--ult-color-surface-overlay'] = `${table['--ult-color-surface-raised']}${OVERLAY_ALPHA[mode]}`;
  return table;
}

function assignContrast(table: TokenTable): void {
  const mithril1 = table['--ult-color-surface'] ?? '#000000';
  const mithril12 = table['--ult-color-text'] ?? '#ffffff';
  for (const role of CONTRAST_ROLES) {
    const fills: [string, string, string] = [
      table[`--ult-color-${role}`] ?? mithril1,
      table[`--ult-color-${role}-hover`] ?? mithril1,
      table[`--ult-color-${role}-active`] ?? mithril1,
    ];
    table[`--ult-color-${role}-contrast`] = pickContrast(fills, mithril1, mithril12);
  }
}

function nonColorTable(draft: ThemeDraft, mode: ColorMode): TokenTable {
  const table: TokenTable = {};
  SPACE_PX.forEach((px, i) => {
    table[`--ult-space-${i + 1}`] = formatRem(snapHalfPx(px * draft.density));
  });

  TEXT_PX.forEach((px, i) => {
    const sized =
      draft.typography.scale === 'stock'
        ? (px * draft.typography.baseSizePx) / 16
        : draft.typography.baseSizePx * draft.typography.scale ** (i - 4);
    table[`--ult-text-${i + 1}`] = formatRem(Math.round(sized * 4) / 4);
  });

  table['--ult-font-sans'] = draft.typography.sans;
  table['--ult-font-mono'] = draft.typography.mono;
  table['--ult-font-weight-regular'] = '400';
  table['--ult-font-weight-medium'] = '500';
  table['--ult-font-weight-semibold'] = '600';
  for (const [name, value] of Object.entries(LEADING[draft.typography.leading])) {
    table[`--ult-font-leading-${name}`] = String(value);
  }
  for (const [name, value] of Object.entries(TRACKING[draft.typography.tracking])) {
    table[`--ult-font-tracking-${name}`] = value;
  }

  for (const [name, value] of Object.entries(radiusTable(draft.version)[draft.shape] ?? {})) {
    table[`--ult-radius-${name}`] = `${value}px`;
  }
  table['--ult-radius-full'] = '9999px';

  for (const size of ['sm', 'md', 'lg'] as const) {
    table[`--ult-shadow-${size}`] = shadowValue(mode, draft.elevation, size);
  }

  table['--ult-filter-backdrop'] = 'blur(4px)';

  table['--ult-motion-fast'] = snapMs(120 * draft.motion);
  table['--ult-motion-base'] = snapMs(200 * draft.motion);
  table['--ult-motion-slow'] = snapMs(300 * draft.motion);
  table['--ult-motion-loop'] = snapMs(1000 * draft.motion);
  return table;
}

function applyOverrides(table: TokenTable, overrides: Partial<TokenTable>, mode: ColorMode): TokenTable {
  const next: TokenTable = { ...table };
  for (const [name, value] of Object.entries(overrides)) {
    if (value !== undefined) next[name] = value;
  }
  const raised = next['--ult-color-surface-raised'];
  if (raised) next['--ult-color-surface-overlay'] = `${raised}${OVERLAY_ALPHA[mode]}`;

  const contrastOverrides = new Set(
    CONTRAST_ROLES.filter((role) => `--ult-color-${role}-contrast` in overrides),
  );
  assignContrast(next);
  for (const role of CONTRAST_ROLES) {
    const token = `--ult-color-${role}-contrast`;
    const pinned = overrides[token];
    if (contrastOverrides.has(role) && pinned !== undefined) next[token] = pinned;
  }
  return next;
}

function legacyStockDraft(): ThemeDraft {
  return {
    version: 1,
    recipeVersion: RECIPE_VERSION,
    color: Object.fromEntries(SCALE_NAMES.map((name) => [name, { ...STOCK_SEEDS[name] }])) as ScaleSeeds,
    typography: {
      sans: STOCK_SANS,
      mono: STOCK_MONO,
      baseSizePx: 16,
      scale: 'stock',
      leading: 'default',
      tracking: 'default',
    },
    density: 1,
    shape: 'default',
    elevation: 1,
    motion: 1,
    overrides: { dark: {}, light: {} },
    locks: {
      color: false,
      typography: false,
      density: false,
      shape: false,
      elevation: false,
      motion: false,
    },
    shuffleSeeds: {},
  };
}

/** A preset id gives its current revision 2; `{ id, revision: 1 }` gives the version-2 definition. */
export function presetDraft(preset: ThemePresetId | ThemePresetOrigin): ThemeDraft {
  const { id, revision }: ThemePresetOrigin = typeof preset === 'string' ? { id: preset, revision: 2 } : preset;
  const draft = legacyStockDraft();
  draft.version = revision === 1 ? 2 : THEME_DRAFT_VERSION;
  draft.recipeVersion = 2;
  draft.preset = { id, revision };
  if (id === 'neutral') {
    for (const scale of ['mithril', 'arcane', 'mana'] as const) draft.color[scale].saturation = 0;
  }
  if (id === 'grove' || id === 'cinder') {
    const grove = id === 'grove';
    draft.color.mithril = { hue: grove ? 145 : 32, saturation: 0.15 };
    draft.color.arcane = { hue: grove ? 140 : 28, saturation: grove ? 0.8 : 0.85 };
    draft.color.mana = { hue: grove ? 75 : 45, saturation: 0.75 };
    draft.typography.sans = grove
      ? "Georgia, 'Times New Roman', Times, serif"
      : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    draft.typography.mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    draft.typography.scale = grove ? 1.2 : 1.125;
    draft.typography.leading = grove ? 'loose' : 'compact';
    draft.typography.tracking = grove ? 'default' : 'compact';
    draft.density = grove ? 1.25 : 0.75;
    draft.shape = grove ? 'round' : 'sharp';
    draft.elevation = grove ? 0.5 : 1.5;
    draft.motion = grove ? 1.5 : 0.6;
  }
  if (revision === 2) {
    draft.shape = REVISION_2_SHAPES[id];
    draft.accentFill = id === 'neutral' ? 'ink' : 'hue';
  }
  return draft;
}

export function stockDraft(): ThemeDraft {
  const draft = presetDraft('neutral');
  draft.recipeVersion = BASE_RECIPE_VERSION;
  return draft;
}

export function presetRevision(version: 2 | typeof THEME_DRAFT_VERSION): ThemePresetRevision {
  return version === 2 ? 1 : 2;
}

export function resetDraft(draft: ThemeDraft): ThemeDraft {
  if (draft.version === 1) return legacyStockDraft();
  if (draft.recipeVersion === BASE_RECIPE_VERSION) return stockDraft();
  return presetDraft(draft.preset ?? { id: 'neutral', revision: presetRevision(draft.version) });
}

export function presetLabel(draft: ThemeDraft): string {
  if (draft.version === 1) return 'Legacy Ultima';
  return THEME_PRESETS.find((preset) => preset.id === draft.preset?.id)?.label ?? 'Custom';
}

export function isPresetEdited(draft: ThemeDraft): boolean {
  const baseline = resetDraft(draft);
  return (['color', 'accentFill', 'typography', 'density', 'shape', 'elevation', 'motion', 'overrides', 'locks'] as const)
    .some((key) => JSON.stringify(draft[key]) !== JSON.stringify(baseline[key]));
}

function derivedTables(draft: ThemeDraft): ResolvedDraft {
  const scales = generateScales(draft.color, draft.recipeVersion, draft.preset?.id === 'ultima');
  const ink = draft.accentFill === 'ink' ? generateInkStates(draft.color.mithril) : null;
  const derive = (mode: ColorMode): TokenTable => ({ ...colorTable(scales, mode, ink), ...nonColorTable(draft, mode) });
  return { dark: derive('dark'), light: derive('light') };
}

export function modeResolver(draft: ThemeDraft, mode: ColorMode): (overrides: Partial<TokenTable>) => TokenTable {
  const derived = derivedTables(draft)[mode];
  return (overrides) => applyOverrides(derived, overrides, mode);
}

export function resolveDraft(draft: ThemeDraft): ResolvedDraft {
  const derived = derivedTables(draft);
  return {
    dark: applyOverrides(derived.dark, draft.overrides.dark, 'dark'),
    light: applyOverrides(derived.light, draft.overrides.light, 'light'),
  };
}
