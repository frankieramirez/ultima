import * as stylex from '@stylexjs/stylex';

/**
 * The docs site's breakpoints, as named module constants. A runtime value cannot sit in a
 * StyleX media condition, so each breakpoint is declared once here rather than restated per
 * file, and one edit moves every style that reads it. The `.stylex` suffix is what lets the
 * compiler resolve the constants into each importing file's `stylex.create`.
 */
export const breakpoints = stylex.defineConsts({
  WIDE: '@media (min-width: 48rem)',
  RAIL: '@media (min-width: 52.5rem)',
  DESKTOP: '@media (min-width: 64rem)',
  INDEX: '@media (min-width: 80rem)',
});
