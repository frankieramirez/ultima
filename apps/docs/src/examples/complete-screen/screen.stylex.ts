import * as stylex from '@stylexjs/stylex';

export const screen = stylex.defineVars({
  '--app-size-content-max': '72rem',
  /** The narrowest the project table reads well; below it the table scrolls inside its region. */
  '--app-size-table-min': '28rem',
});
