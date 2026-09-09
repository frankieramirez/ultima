/**
 * The semantic groups are `defineVars` keyed by their full custom property
 * name so StyleX emits `--ult-<group>-<name>` verbatim (ADR 0004).
 *
 * StyleX rule: a `.stylex.ts` file may export nothing but `defineVars` and
 * `defineConsts` calls.
 */
import * as stylex from '@stylexjs/stylex';

const LIGHT = '@media (prefers-color-scheme: light)';
const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

export const mithril = stylex.defineConsts({
  dark1: '#0b0d17',
  dark2: '#111324',
  dark3: '#181c33',
  dark4: '#212540',
  dark5: '#2a2f4d',
  dark6: '#353a5a',
  dark7: '#454b6b',
  dark8: '#5a6183',
  dark9: '#777ea2',
  dark10: '#8990b4',
  dark11: '#afb6d4',
  dark12: '#e3e7f7',
  light1: '#fdfdff',
  light2: '#f7f9ff',
  light3: '#eff1fa',
  light4: '#e7e9f3',
  light5: '#dcdfeb',
  light6: '#d0d3e2',
  light7: '#b4b7c5',
  light8: '#888b99',
  light9: '#717481',
  light10: '#60636f',
  light11: '#4f525e',
  light12: '#181a24',
});

export const arcane = stylex.defineConsts({
  dark1: '#0a0d19',
  dark2: '#0f1328',
  dark3: '#161a3d',
  dark4: '#1d2150',
  dark5: '#242a64',
  dark6: '#2d337a',
  dark7: '#3a4295',
  dark8: '#4c56b8',
  dark9: '#8394ff',
  dark10: '#96a7ff',
  dark11: '#aab9ff',
  dark12: '#c3ceff',
  light1: '#fdfdff',
  light2: '#f7f9ff',
  light3: '#eef1ff',
  light4: '#e3e8ff',
  light5: '#d6deff',
  light6: '#c7d2ff',
  light7: '#b3c0ff',
  light8: '#92a3ff',
  light9: '#565fde',
  light10: '#494fcc',
  light11: '#4042bf',
  light12: '#343997',
});

export const mana = stylex.defineConsts({
  dark1: '#051011',
  dark2: '#02191b',
  dark3: '#002327',
  dark4: '#002e32',
  dark5: '#00393e',
  dark6: '#00464c',
  dark7: '#00585f',
  dark8: '#00717a',
  dark9: '#44d4e1',
  dark10: '#59e4f2',
  dark11: '#79f0fc',
  dark12: '#8ff5ff',
  light1: '#faffff',
  light2: '#effcfe',
  light3: '#dcf8fb',
  light4: '#caf2f6',
  light5: '#b6ebf0',
  light6: '#a0e2e8',
  light7: '#85d3db',
  light8: '#55bdc7',
  light9: '#00818b',
  light10: '#00717a',
  light11: '#00646c',
  light12: '#00585f',
});

export const verdant = stylex.defineConsts({
  dark1: '#06100b',
  dark2: '#061910',
  dark3: '#002516',
  dark4: '#00311e',
  dark5: '#003c26',
  dark6: '#004a30',
  dark7: '#005c3d',
  dark8: '#00764f',
  dark9: '#56cb98',
  dark10: '#67dba7',
  dark11: '#81e6b6',
  dark12: '#9becc4',
  light1: '#fafffc',
  light2: '#f0fdf6',
  light3: '#defaeb',
  light4: '#cef4e0',
  light5: '#bbedd3',
  light6: '#a7e5c5',
  light7: '#8dd7b2',
  light8: '#62c195',
  light9: '#008359',
  light10: '#00734d',
  light11: '#006644',
  light12: '#005c3d',
});

export const ember = stylex.defineConsts({
  dark1: '#120d05',
  dark2: '#1d1304',
  dark3: '#2a1b00',
  dark4: '#372400',
  dark5: '#432d00',
  dark6: '#523700',
  dark7: '#664600',
  dark8: '#835b00',
  dark9: '#eab352',
  dark10: '#f8c060',
  dark11: '#ffcf80',
  dark12: '#ffd898',
  light1: '#fffdfa',
  light2: '#fff8ee',
  light3: '#fff0d8',
  light4: '#fce6c5',
  light5: '#f7dcb1',
  light6: '#f0cf9b',
  light7: '#e4be7f',
  light8: '#d1a252',
  light9: '#e7ac3e',
  light10: '#d39923',
  light11: '#bf8600',
  light12: '#714e00',
});

export const ruin = stylex.defineConsts({
  dark1: '#160a09',
  dark2: '#230d0d',
  dark3: '#351011',
  dark4: '#461517',
  dark5: '#561a1d',
  dark6: '#6a2024',
  dark7: '#822b2f',
  dark8: '#a23c40',
  dark9: '#df6769',
  dark10: '#f07778',
  dark11: '#fb8c8c',
  dark12: '#ffaaa8',
  light1: '#fffdfd',
  light2: '#fff7f6',
  light3: '#ffedec',
  light4: '#ffe1e0',
  light5: '#ffd4d2',
  light6: '#ffc3c1',
  light7: '#ffaaa8',
  light8: '#f58585',
  light9: '#cb454c',
  light10: '#ba343e',
  light11: '#a82131',
  light12: '#88222b',
});

export const color = stylex.defineVars({
  '--ult-color-surface': { default: mithril.dark1, [LIGHT]: mithril.light1 },
  '--ult-color-surface-raised': { default: mithril.dark2, [LIGHT]: mithril.light2 },
  '--ult-color-surface-sunken': { default: mithril.dark3, [LIGHT]: mithril.light3 },
  '--ult-color-surface-hover': { default: mithril.dark4, [LIGHT]: mithril.light4 },
  '--ult-color-surface-overlay': { default: `${mithril.dark2}99`, [LIGHT]: `${mithril.light2}cc` },
  '--ult-color-text': { default: mithril.dark12, [LIGHT]: mithril.light12 },
  '--ult-color-text-muted': { default: mithril.dark11, [LIGHT]: mithril.light11 },
  '--ult-color-text-subtle': { default: mithril.dark10, [LIGHT]: mithril.light10 },
  '--ult-color-text-inverse': { default: mithril.dark1, [LIGHT]: mithril.light1 },
  '--ult-color-border': { default: mithril.dark6, [LIGHT]: mithril.light6 },
  '--ult-color-border-strong': { default: mithril.dark8, [LIGHT]: mithril.light8 },
  '--ult-color-border-focus': { default: arcane.dark9, [LIGHT]: arcane.light9 },

  '--ult-color-accent': { default: arcane.dark9, [LIGHT]: arcane.light9 },
  '--ult-color-accent-hover': { default: arcane.dark10, [LIGHT]: arcane.light10 },
  '--ult-color-accent-active': { default: arcane.dark11, [LIGHT]: arcane.light11 },
  '--ult-color-accent-subtle': { default: arcane.dark3, [LIGHT]: arcane.light3 },
  '--ult-color-accent-border': { default: arcane.dark7, [LIGHT]: arcane.light7 },
  '--ult-color-accent-text': { default: arcane.dark12, [LIGHT]: arcane.light12 },
  '--ult-color-accent-contrast': { default: mithril.dark1, [LIGHT]: mithril.light1 },

  '--ult-color-highlight': { default: mana.dark9, [LIGHT]: mana.light9 },
  '--ult-color-highlight-hover': { default: mana.dark10, [LIGHT]: mana.light10 },
  '--ult-color-highlight-active': { default: mana.dark11, [LIGHT]: mana.light11 },
  '--ult-color-highlight-subtle': { default: mana.dark3, [LIGHT]: mana.light3 },
  '--ult-color-highlight-border': { default: mana.dark7, [LIGHT]: mana.light7 },
  '--ult-color-highlight-text': { default: mana.dark12, [LIGHT]: mana.light12 },
  '--ult-color-highlight-contrast': { default: mithril.dark1, [LIGHT]: mithril.light1 },

  '--ult-color-success': { default: verdant.dark9, [LIGHT]: verdant.light9 },
  '--ult-color-success-hover': { default: verdant.dark10, [LIGHT]: verdant.light10 },
  '--ult-color-success-active': { default: verdant.dark11, [LIGHT]: verdant.light11 },
  '--ult-color-success-subtle': { default: verdant.dark3, [LIGHT]: verdant.light3 },
  '--ult-color-success-border': { default: verdant.dark7, [LIGHT]: verdant.light7 },
  '--ult-color-success-text': { default: verdant.dark12, [LIGHT]: verdant.light12 },
  '--ult-color-success-contrast': { default: mithril.dark1, [LIGHT]: mithril.light1 },

  '--ult-color-warning': { default: ember.dark9, [LIGHT]: ember.light9 },
  '--ult-color-warning-hover': { default: ember.dark10, [LIGHT]: ember.light10 },
  '--ult-color-warning-active': { default: ember.dark11, [LIGHT]: ember.light11 },
  '--ult-color-warning-subtle': { default: ember.dark3, [LIGHT]: ember.light3 },
  '--ult-color-warning-border': { default: ember.dark7, [LIGHT]: ember.light7 },
  '--ult-color-warning-text': { default: ember.dark12, [LIGHT]: ember.light12 },
  '--ult-color-warning-contrast': { default: mithril.dark1, [LIGHT]: mithril.light12 },

  '--ult-color-danger': { default: ruin.dark9, [LIGHT]: ruin.light9 },
  '--ult-color-danger-hover': { default: ruin.dark10, [LIGHT]: ruin.light10 },
  '--ult-color-danger-active': { default: ruin.dark11, [LIGHT]: ruin.light11 },
  '--ult-color-danger-subtle': { default: ruin.dark3, [LIGHT]: ruin.light3 },
  '--ult-color-danger-border': { default: ruin.dark7, [LIGHT]: ruin.light7 },
  '--ult-color-danger-text': { default: ruin.dark12, [LIGHT]: ruin.light12 },
  '--ult-color-danger-contrast': { default: mithril.dark1, [LIGHT]: mithril.light1 },
});

export const space = stylex.defineVars({
  '--ult-space-1': '0.125rem',
  '--ult-space-2': '0.25rem',
  '--ult-space-3': '0.375rem',
  '--ult-space-4': '0.5rem',
  '--ult-space-5': '0.75rem',
  '--ult-space-6': '1rem',
  '--ult-space-7': '1.25rem',
  '--ult-space-8': '1.5rem',
  '--ult-space-9': '2rem',
  '--ult-space-10': '2.5rem',
  '--ult-space-11': '3rem',
  '--ult-space-12': '4rem',
});

export const text = stylex.defineVars({
  '--ult-text-1': '0.6875rem',
  '--ult-text-2': '0.75rem',
  '--ult-text-3': '0.8125rem',
  '--ult-text-4': '0.875rem',
  '--ult-text-5': '1rem',
  '--ult-text-6': '1.125rem',
  '--ult-text-7': '1.25rem',
  '--ult-text-8': '1.5rem',
  '--ult-text-9': '1.875rem',
  '--ult-text-10': '2.25rem',
  '--ult-text-11': '3rem',
});

export const font = stylex.defineVars({
  '--ult-font-sans':
    "'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  '--ult-font-mono': "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  '--ult-font-weight-regular': 400,
  '--ult-font-weight-medium': 500,
  '--ult-font-weight-semibold': 600,
  '--ult-font-leading-none': 1,
  '--ult-font-leading-tight': 1.2,
  '--ult-font-leading-snug': 1.35,
  '--ult-font-leading-normal': 1.55,
  '--ult-font-leading-relaxed': 1.75,
  '--ult-font-tracking-tight': '-0.02em',
  '--ult-font-tracking-normal': 0,
  '--ult-font-tracking-wide': '0.08em',
  '--ult-font-tracking-wider': '0.14em',
});

export const radius = stylex.defineVars({
  '--ult-radius-xs': '2px',
  '--ult-radius-sm': '4px',
  '--ult-radius-md': '10px',
  '--ult-radius-lg': '12px',
  '--ult-radius-full': '9999px',
});

export const shadow = stylex.defineVars({
  '--ult-shadow-sm': {
    default: '0 1px 2px rgba(0,0,0,.30), 0 1px 3px rgba(0,0,0,.40)',
    [LIGHT]: '0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.10)',
  },
  '--ult-shadow-md': {
    default: '0 4px 8px rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.45)',
    [LIGHT]: '0 4px 8px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.12)',
  },
  '--ult-shadow-lg': {
    default: '0 12px 24px rgba(0,0,0,.40), 0 24px 48px rgba(0,0,0,.50)',
    [LIGHT]: '0 12px 24px rgba(0,0,0,.12), 0 24px 48px rgba(0,0,0,.18)',
  },
});

export const motion = stylex.defineVars({
  '--ult-motion-fast': { default: '120ms', [REDUCED_MOTION]: '1ms' },
  '--ult-motion-base': { default: '200ms', [REDUCED_MOTION]: '1ms' },
  '--ult-motion-slow': { default: '300ms', [REDUCED_MOTION]: '1ms' },
});

export const easing = stylex.defineConsts({
  standard: 'cubic-bezier(.2, 0, 0, 1)',
  enter: 'cubic-bezier(0, 0, .2, 1)',
  exit: 'cubic-bezier(.4, 0, 1, 1)',
});

export const border = stylex.defineConsts({
  hairline: '1px',
  focus: '2px',
  focusOffset: '2px',
});

export const z = stylex.defineConsts({
  popup: 50,
  toast: 60,
});
