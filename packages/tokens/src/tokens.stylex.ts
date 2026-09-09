/**
 * PROVISIONAL tokens. Placeholders so the prototypes have something to render.
 *
 * The real token layers, naming grammar, and color-mode switch are decided in
 * ULT-9; the palette itself in ULT-10. Do not treat anything here as settled.
 *
 * StyleX rule: a `.stylex.ts` file may export nothing but `defineVars` and
 * `defineConsts` calls. Themes live in `themes.ts`.
 */
import * as stylex from '@stylexjs/stylex';

const LIGHT = '@media (prefers-color-scheme: light)';

export const color = stylex.defineVars({
  surface: { default: '#0b0d12', [LIGHT]: '#ffffff' },
  surfaceRaised: { default: '#151922', [LIGHT]: '#f4f5f7' },
  text: { default: '#e8eaf0', [LIGHT]: '#12151c' },
  textMuted: { default: '#9aa3b5', [LIGHT]: '#5b6474' },
  border: { default: '#242a36', [LIGHT]: '#dfe2e8' },
  accent: { default: '#7c6cff', [LIGHT]: '#5b4ae0' },
  accentText: { default: '#ffffff', [LIGHT]: '#ffffff' },
});

export const space = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
});

export const radius = stylex.defineVars({
  sm: '4px',
  md: '8px',
  lg: '12px',
});

export const font = stylex.defineVars({
  sans: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});
