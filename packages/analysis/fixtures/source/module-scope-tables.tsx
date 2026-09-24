'use client';

import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const spin = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

export const styles = stylex.create({
  root: { animationName: spin, padding: space['--ult-space-2'] },
}) satisfies Record<string, unknown>;

const sizes = (stylex.create({ sm: { margin: 0 } }));

function Separator({ style, ...props }: PartProps<ComponentProps<'hr'>>) {
  return <hr {...props} {...stylex.props(styles.root, sizes.sm, style)} />;
}

export { Separator };
