import './theme-contrast.css';

import * as stylex from '@stylexjs/stylex';

import { darkTheme, lightTheme } from '@/lib/themes';
import { color } from '@/lib/tokens.stylex';

// #555555 as subtle text fails on the dark surfaces and passes on the light ones.
export const quiet = stylex.createTheme(color, {
  '--ult-color-text-subtle': '#555555',
});

export const quietDark = stylex.createTheme(color, {
  '--ult-color-text-subtle': '#555555',
});

export const quietLight = stylex.createTheme(color, {
  '--ult-color-text-subtle': '#555555',
});

export function Panels() {
  return (
    <>
      <p {...stylex.props(quiet)} />
      <p {...stylex.props(darkTheme, quietDark)} />
      <p {...stylex.props(lightTheme, quietLight)} />
    </>
  );
}
