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

function Separator() {
  void load;
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
