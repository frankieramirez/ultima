import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

import { breakpoints } from './breakpoints.stylex';

export const layoutStyles = stylex.create({
  gutter: {
    paddingInline: { default: space['--ult-space-6'], [breakpoints.DESKTOP]: space['--ult-space-9'] },
  },
  gutterWide: {
    paddingInline: { default: space['--ult-space-6'], [breakpoints.DESKTOP]: space['--ult-space-12'] },
  },
});
