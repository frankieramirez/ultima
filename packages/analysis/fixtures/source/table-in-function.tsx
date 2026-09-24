'use client';

import * as stylex from '@stylexjs/stylex';

function Separator() {
  const styles = stylex.create({ root: { margin: 0 } });
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
