'use client';

import { create as make, keyframes as frames, props } from '@stylexjs/stylex';

const spin = frames({ from: { opacity: 0 }, to: { opacity: 1 } });

function Separator() {
  const styles = make({ root: { animationName: spin } });
  return <hr {...props(styles.root)} />;
}

export { Separator };
