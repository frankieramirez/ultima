'use client';

import * as stylex from '@stylexjs/stylex';
import { border, color, filter, shadow } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  floating: {
    boxShadow: shadow['--ult-shadow-md'],
  },
  ring: {
    borderColor: color['--ult-color-border'],
    boxShadow: { default: 'none', ':focus-visible': `0 0 0 ${border.focus} ${color['--ult-color-border-focus']}` },
  },
  frame: {
    outline: `${border.hairline} solid ${color['--ult-color-border']}`,
  },
  frosted: {
    backdropFilter: filter['--ult-filter-backdrop'],
    backgroundColor: color['--ult-color-surface-raised'],
  },
  loading: {
    filter: filter['--ult-filter-backdrop'],
  },
  control: {
    borderColor: color['--ult-color-border-strong'],
    borderStyle: 'solid',
    borderWidth: border.fine,
  },
  heavy: {
    borderColor: color['--ult-color-border'],
    borderStyle: 'solid',
    borderWidth: border.focus,
  },
});

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return (
    <hr
      {...rest}
      {...stylex.props(styles.floating, styles.ring, styles.frame, styles.frosted, styles.loading, styles.control, styles.heavy, style)}
    />
  );
}

export { Separator };
