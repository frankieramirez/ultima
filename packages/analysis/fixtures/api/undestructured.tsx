'use client';

import { Separator as BaseSeparator } from '@base-ui/react/separator';
import * as stylex from '@stylexjs/stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({ root: { margin: 0 } });

type SeparatorProps = PartProps<ComponentProps<typeof BaseSeparator>>;

/**
 * The whole props object reaches the primitive, so the caller's StyleX slot lands on Base UI's native
 * style prop unmerged and the part's own table never applies.
 */
function Separator(props: SeparatorProps) {
  const unused = stylex.props(styles.root);
  return <BaseSeparator {...props} {...unused} />;
}

export { Separator };
