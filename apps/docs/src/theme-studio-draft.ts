import type { CSSProperties } from 'react';
import {
  STOCK_MONO,
  STOCK_SANS,
  resetDraft,
  type ColorMode,
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

export function groupLabel(id: GuidedGroup): string {
  return GROUPS.find((item) => item.id === id)?.label ?? id;
}

export function draftSummary(draft: ThemeDraft): string {
  const overrides =
    Object.keys(draft.overrides.dark).length + Object.keys(draft.overrides.light).length;
  const locked = Object.values(draft.locks).filter(Boolean).length;
  return `${overrides} overrides · ${locked} locked group${locked === 1 ? '' : 's'}`;
}

export const SCALE_ROLES = {
  mithril: 'Neutral',
  arcane: 'Accent',
  mana: 'Action',
  verdant: 'Success',
  ember: 'Warning',
  ruin: 'Danger',
} as const;

export const SANS_PRESETS = [
  { label: 'Figtree', value: STOCK_SANS },
  { label: 'Geist', value: "'Geist', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Inter', value: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Roboto', value: "'Roboto', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Source Sans 3', value: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif" },
  { label: 'IBM Plex Sans', value: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" },
  {
    label: 'System',
    value: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  { label: 'Serif', value: "Georgia, 'Times New Roman', Times, serif" },
  { label: 'Humanist', value: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" },
] as const;

export const MONO_PRESETS = [
  { label: 'IBM Plex Mono', value: STOCK_MONO },
  { label: 'Geist Mono', value: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: 'Roboto Mono', value: "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
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
  const stock = resetDraft(draft);
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

const FIXED_TOKENS = new Set(['--ult-color-surface-overlay', '--ult-radius-full']);

export function groupTokens(table: TokenTable, group: GuidedGroup): string[] {
  return Object.keys(table).filter(
    (name) => !FIXED_TOKENS.has(name) && GROUP_PREFIX[group].some((prefix) => name.startsWith(prefix)),
  );
}

function withOverrides(draft: ThemeDraft): ThemeDraft {
  return {
    ...draft,
    overrides: { dark: { ...draft.overrides.dark }, light: { ...draft.overrides.light } },
  };
}

export function setTokenOverride(
  draft: ThemeDraft,
  token: string,
  modes: 'both' | ColorMode,
  value: string,
): ThemeDraft {
  const next = withOverrides(draft);
  if (modes !== 'light') next.overrides.dark[token] = value;
  if (modes !== 'dark') next.overrides.light[token] = value;
  return next;
}

export function resetTokenOverride(draft: ThemeDraft, token: string): ThemeDraft {
  const next = withOverrides(draft);
  delete next.overrides.dark[token];
  delete next.overrides.light[token];
  return next;
}

export function linkTokenOverride(draft: ThemeDraft, token: string): ThemeDraft {
  const next = withOverrides(draft);
  const dark = draft.overrides.dark[token];
  if (dark === undefined) delete next.overrides.light[token];
  else next.overrides.light[token] = dark;
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
