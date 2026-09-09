'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-sunken'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-4'],
    margin: 0,
  },
});

const variants = stylex.create({
  inline: {
    borderRadius: radius['--ult-radius-sm'],
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-2'],
  },
  block: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    lineHeight: font['--ult-font-leading-normal'],
    overflowWrap: 'anywhere',
    padding: space['--ult-space-5'],
    whiteSpace: 'pre-wrap',
  },
});

type CodeVariant = keyof typeof variants;

type CodeProps = PartProps<useRender.ComponentProps<'code'>> & { variant?: CodeVariant };

function Code({ variant = 'inline', ref, render, style, children, ...props }: CodeProps) {
  return useRender({
    defaultTagName: variant === 'block' ? 'pre' : 'code',
    ref,
    render,
    props: {
      ...props,
      ...stylex.props(styles.root, variants[variant], style),
      children: variant === 'block' ? <code>{children}</code> : children,
    },
  });
}

export { Code, type CodeProps, type CodeVariant };
