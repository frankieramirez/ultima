'use client';

import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({ root: { margin: 0 } });

// @ultima-scaffold-incomplete: name the separator's orientation contract.
function Separator() {
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
