'use client';

import { create as make, keyframes as frames, props } from '@stylexjs/stylex';

const spin = frames({ from: { opacity: 0 }, to: { opacity: 1 } });

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  const styles = make({ root: { animationName: spin } });
  return <hr {...rest} {...props(styles.root, style)} />;
}

export { Separator };
