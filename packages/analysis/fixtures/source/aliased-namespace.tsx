'use client';

import * as stylex from '@stylexjs/stylex';

const sx = stylex;
const build = sx.create;
const { keyframes } = stylex;

const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const base = build({ root: { animationName: fade } });

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  const late = build({ root: { margin: 0 } });
  return <hr {...rest} {...sx.props(base.root, late.root, style)} />;
}

export { Separator };
