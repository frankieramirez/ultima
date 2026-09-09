'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-2'],
    margin: 0,
  },
  label: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  value: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-none'],
  },
});

type StatRootProps = PartProps<useRender.ComponentProps<'div'>>;
type StatLabelProps = PlainProps<'span'>;
type StatValueProps = PlainProps<'span'>;

/** Reading order is the DOM order: put `Stat.Label` before `Stat.Value`. */
function Root({ ref, render, style, ...props }: StatRootProps) {
  return useRender({ defaultTagName: 'div', ref, render, props: { ...props, ...stylex.props(styles.root, style) } });
}

function Label({ style, ...props }: StatLabelProps) {
  return <span {...props} {...stylex.props(styles.label, style)} />;
}

function Value({ style, ...props }: StatValueProps) {
  return <span {...props} {...stylex.props(styles.value, style)} />;
}

const Stat = { Root, Label, Value };

export { Stat, type StatRootProps, type StatLabelProps, type StatValueProps };
