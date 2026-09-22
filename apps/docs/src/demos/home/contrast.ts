import * as stylex from '@stylexjs/stylex';
import { color, space } from '@ultima/tokens/tokens.stylex';

export const contrastStyles = stylex.create({
  root: {
    backgroundColor: {
      default: color['--ult-color-text'],
      ':active': color['--ult-color-text-inverse'],
    },
    borderColor: {
      default: 'transparent',
      ':hover': color['--ult-color-text-inverse'],
      ':active': color['--ult-color-text'],
    },
    color: {
      default: color['--ult-color-text-inverse'],
      ':active': color['--ult-color-text'],
    },
  },
  mark: {
    backgroundColor: color['--ult-color-text'],
    color: color['--ult-color-text-inverse'],
    marginBlockStart: space['--ult-space-8'],
    paddingBlockStart: space['--ult-space-2'],
    paddingBlockEnd: space['--ult-space-4'],
    paddingInline: space['--ult-space-5'],
  },
});
