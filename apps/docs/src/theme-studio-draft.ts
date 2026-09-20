import type { CSSProperties } from 'react';
import {
  STOCK_MONO,
  STOCK_SANS,
  stockDraft,
  type GuidedGroup,
  type ThemeDraft,
  type TokenTable,
} from '@ultima/tokens';

export const GROUPS = [
  { id: 'color', label: 'Color' },
  { id: 'typography', label: 'Typography' },
  { id: 'density', label: 'Density' },
  { id: 'shape', label: 'Shape' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'motion', label: 'Motion' },
] as const satisfies readonly { id: GuidedGroup; label: string }[];

export type GroupId = (typeof GROUPS)[number]['id'];

export const SCALE_ROLES = {
  mithril: 'Neutral',
  arcane: 'Accent',
  mana: 'Action',
  verdant: 'Success',
  ember: 'Warning',
  ruin: 'Danger',
} as const;

export const SANS_PRESETS = [
  { label: 'IBM Plex Sans', value: STOCK_SANS },
  {
    label: 'System',
    value: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  { label: 'Serif', value: "Georgia, 'Times New Roman', Times, serif" },
  { label: 'Humanist', value: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" },
] as const;

export const MONO_PRESETS = [
  { label: 'IBM Plex Mono', value: STOCK_MONO },
  { label: 'System', value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
] as const;

const GROUP_PREFIX: Record<GuidedGroup, readonly string[]> = {
  color: ['--ult-color-'],
  typography: ['--ult-text-', '--ult-font-'],
  density: ['--ult-space-'],
  shape: ['--ult-radius-'],
  elevation: ['--ult-shadow-'],
  motion: ['--ult-motion-'],
};

export function previewVars(table: TokenTable): CSSProperties {
  return table as CSSProperties;
}

export function presetValue(stack: string, presets: readonly { label: string; value: string }[]): string {
  return presets.some((preset) => preset.value === stack) ? stack : 'custom';
}

export function resetGroup(draft: ThemeDraft, group: GuidedGroup): ThemeDraft {
  const stock = stockDraft();
  const next: ThemeDraft = {
    ...draft,
    color: { ...draft.color },
    typography: { ...draft.typography },
    overrides: { dark: { ...draft.overrides.dark }, light: { ...draft.overrides.light } },
    locks: { ...draft.locks },
  };

  switch (group) {
    case 'color':
      next.color = stock.color;
      break;
    case 'typography':
      next.typography = stock.typography;
      break;
    case 'density':
      next.density = stock.density;
      break;
    case 'shape':
      next.shape = stock.shape;
      break;
    case 'elevation':
      next.elevation = stock.elevation;
      break;
    case 'motion':
      next.motion = stock.motion;
      break;
  }

  for (const prefix of GROUP_PREFIX[group]) {
    for (const mode of ['dark', 'light'] as const) {
      for (const token of Object.keys(next.overrides[mode])) {
        if (token.startsWith(prefix)) delete next.overrides[mode][token];
      }
    }
  }
  return next;
}

export function keepOne(next: string[], cancel: () => void): string | undefined {
  const [selected] = next;
  if (!selected) {
    cancel();
    return undefined;
  }
  return selected;
}

export function sliderNumber(value: number | readonly number[]): number {
  return typeof value === 'number' ? value : (value[0] ?? 0);
}
