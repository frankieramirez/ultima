import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

export const shell = stylex.defineVars({
  chromeBlock: space['--ult-space-12'],
  edge: space['--ult-space-8'],
  narrowEdge: space['--ult-space-7'],
  narrowChromeBlock: `calc(${space['--ult-space-12']} - ${space['--ult-space-4']})`,
});
