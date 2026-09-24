import * as stylex from '@stylexjs/stylex';

import { darkTheme } from '@/lib/themes';
import { color } from '@/lib/tokens.stylex';

// The accent base alone leaves its hover and active fills at Ultima's default: ULT-APP-THEME-001.
export const brand = stylex.createTheme(color, {
  '--ult-color-accent': '#7b8cff',
});

// A base with both of its states passes.
export const alarm = stylex.createTheme(color, {
  '--ult-color-danger': '#df6769',
  '--ult-color-danger-hover': '#f07778',
  '--ult-color-danger-active': '#fb8c8c',
});

export function Brand() {
  return (
    <>
      <div {...stylex.props(darkTheme, brand)} />
      <div {...stylex.props(darkTheme, alarm)} />
    </>
  );
}
