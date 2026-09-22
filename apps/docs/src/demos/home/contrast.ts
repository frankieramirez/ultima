import * as stylex from '@stylexjs/stylex';
import { color, space } from '@ultima/tokens/tokens.stylex';

export const contrastStyles = stylex.create({
  root: {
    backgroundColor: {
      default: color['--ult-color-text'],
      ':hover': color['--ult-color-text-muted'],
      ':active': color['--ult-color-text-subtle'],
    },
    borderColor: 'transparent',
    color: color['--ult-color-text-inverse'],
  },
  mark: {
    backgroundColor: color['--ult-color-text'],
    color: color['--ult-color-text-inverse'],
    marginInline: `calc(${space['--ult-space-5']} * -1)`,
    paddingBlockStart: space['--ult-space-2'],
    paddingBlockEnd: space['--ult-space-4'],
    paddingInline: space['--ult-space-5'],
  },
});
