'use client';

import { Fieldset as BaseFieldset } from '@base-ui/react/fieldset';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    appearance: 'none',
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    minInlineSize: 0,
    padding: 0,
  },
  legend: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    padding: 0,
    paddingBlockEnd: space['--ult-space-2'],
  },
});

type FieldsetRootProps = PartProps<ComponentProps<typeof BaseFieldset.Root>>;
type FieldsetLegendProps = PartProps<ComponentProps<typeof BaseFieldset.Legend>>;

function Root({ style, ...props }: FieldsetRootProps) {
  return <BaseFieldset.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Legend({ style, ...props }: FieldsetLegendProps) {
  return <BaseFieldset.Legend {...props} {...stylex.props(styles.legend, style)} />;
}

const Fieldset = { Root, Legend };

export { Fieldset, type FieldsetRootProps, type FieldsetLegendProps };
