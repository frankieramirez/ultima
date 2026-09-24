'use client';

import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({ root: { margin: 0 } });
const name = './dialog';

async function load() {
  const literal = await import('./dialog');
  const computed = await import(name);
  const common = require('@base-ui/react/dialog');
  return [literal, computed, common];
}

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  void load;
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
