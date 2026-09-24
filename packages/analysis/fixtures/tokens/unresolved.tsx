'use client';

import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

function pick(): string {
  return 'padding';
}
const extra = Object.freeze({ margin: 0 });

const styles = stylex.create({
  root: {
    ...extra,
    [pick()]: space['--ult-space-4'],
    fontVariationSettings: '"wght" 500',
    gap: space[pick()],
  },
});

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
