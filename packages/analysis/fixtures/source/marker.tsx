'use client';

import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({ root: { margin: 0 } });

// @ultima-scaffold-incomplete: name the separator's orientation contract.
function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
