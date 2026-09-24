'use client';

import * as stylex from '@stylexjs/stylex';

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  const styles = stylex.create({ root: { margin: 0 } });
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
