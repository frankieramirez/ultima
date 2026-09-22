import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

const WIDE = '@media (min-width: 48rem)';

export const layoutStyles = stylex.create({
  gutter: {
    paddingInline: { default: space['--ult-space-6'], [WIDE]: space['--ult-space-9'] },
  },
  gutterWide: {
    paddingInline: { default: space['--ult-space-6'], [WIDE]: space['--ult-space-12'] },
  },
});
