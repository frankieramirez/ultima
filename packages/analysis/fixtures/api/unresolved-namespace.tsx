'use client';

import { Separator as BaseSeparator } from '@base-ui/react/separator';
import * as stylex from '@stylexjs/stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({ root: { margin: 0 } });

type SeparatorRootProps = PartProps<ComponentProps<typeof BaseSeparator>>;

function Root({ style, ...props }: SeparatorRootProps) {
  return <BaseSeparator {...props} {...stylex.props(styles.root, style)} />;
}

const parts = { Root };
// A spread member: the checker cannot name the parts it adds, so their props go unchecked.
const Separator = { Root, ...parts };

export { Separator };
