import * as stylex from '@stylexjs/stylex';
import { border, space } from '@ultima/tokens/tokens.stylex';

export const shell = stylex.defineVars({
  chromeBlock: `calc(2 * ${space['--ult-space-8']} + ${space['--ult-space-10']} + ${border.hairline})`,
});
