import * as stylex from '@stylexjs/stylex';
import { color } from '@ultima/tokens/tokens.stylex';

export const actionStyles = stylex.create({
  root: {
    backgroundColor: {
      default: color['--ult-color-action'],
      ':hover': color['--ult-color-action-hover'],
      ':active': color['--ult-color-action-active'],
    },
    color: color['--ult-color-action-contrast'],
  },
});
