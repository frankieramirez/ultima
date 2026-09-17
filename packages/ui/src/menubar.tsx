'use client';

import { Menubar as BaseMenubar } from '@base-ui/react/menubar';
import * as stylex from '@stylexjs/stylex';
import { border, color, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    display: 'flex',
    gap: space['--ult-space-1'],
    // The bar's own box is the cutout of the backdrop a modal menu renders, so a
    // full-width div would leave a strip where clicks neither dismiss nor land.
    inlineSize: 'fit-content',
    padding: space['--ult-space-1'],
  },
  horizontal: { flexDirection: 'row' },
  vertical: { flexDirection: 'column' },
});

type MenubarOrientation = 'horizontal' | 'vertical';
type MenubarProps = Omit<PartProps<ComponentProps<typeof BaseMenubar>>, 'orientation'> & {
  orientation?: MenubarOrientation;
} & ({ 'aria-label': string } | { 'aria-labelledby': string });

function Menubar({ orientation = 'horizontal', style, ...props }: MenubarProps) {
  return <BaseMenubar {...props} orientation={orientation} {...stylex.props(styles.root, styles[orientation], style)} />;
}

export { Menubar, type MenubarOrientation, type MenubarProps };
