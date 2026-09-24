'use client';

import * as stylex from '@stylexjs/stylex';
import { color, mithril, space, text } from '@ultima/tokens/tokens.stylex';

const spin = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1, translate: '4px' },
});

const styles = stylex.create({
  root: {
    animationName: spin,
    backgroundColor: mithril.dark3,
    borderColor: color['--ult-color-nope'],
    fontSize: space['--ult-space-5'],
    padding: text['--ult-text-3'],
    margin: space['--ult-space-13'],
    transitionDuration: '0s',
    width: 'var(--toast-height)',
    height: 'var(--made-up)',
    minHeight: 'var(--ult-space-99)',
  },
});

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
