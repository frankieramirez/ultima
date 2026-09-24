'use client';

import * as stylex from '@stylexjs/stylex';

const method = 'create';
const styles = stylex[method]({ root: { margin: 0 } });

function tables(engine: typeof stylex) {
  return engine;
}

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  tables(stylex);
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
