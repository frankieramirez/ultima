import * as stylex from '@stylexjs/stylex';
'use client';

const styles = stylex.create({ root: { margin: 0 } });

function Separator() {
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
