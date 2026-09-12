'use client';

import { Separator as BaseSeparator } from '@base-ui/react/separator';
import * as stylex from '@stylexjs/stylex';
import { border, color, font } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    appearance: 'none',
    blockSize: 0,
    borderBlockEndStyle: 'none',
    borderBlockStartColor: color['--ult-color-border'],
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: border.hairline,
    borderInlineEndStyle: 'none',
    borderInlineStartStyle: 'none',
    boxSizing: 'border-box',
    fontFamily: font['--ult-font-sans'],
    inlineSize: '100%',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  horizontal: {},
  vertical: {
    blockSize: '100%',
    borderBlockStartStyle: 'none',
    borderInlineEndStyle: 'none',
    borderInlineStartColor: color['--ult-color-border'],
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: border.hairline,
    inlineSize: 0,
  },
});

type SeparatorOrientation = 'horizontal' | 'vertical';
type SeparatorProps = Omit<PartProps<ComponentProps<typeof BaseSeparator>>, 'orientation'> & {
  orientation?: SeparatorOrientation;
};

function Separator({ orientation = 'horizontal', style, ...props }: SeparatorProps) {
  return <BaseSeparator {...props} orientation={orientation} {...stylex.props(styles.root, styles[orientation], style)} />;
}

export { Separator, type SeparatorOrientation, type SeparatorProps };
