'use client';

import * as stylex from '@stylexjs/stylex';

const method = 'create';
const styles = stylex[method]({ root: { margin: 0 } });

function tables(engine: typeof stylex) {
  return engine;
}

function Separator() {
  tables(stylex);
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
