'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':has(:is([aria-invalid="true"], [data-invalid]))': color['--ult-color-danger-border'],
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':has(:disabled)': 0.5 },
    width: '100%',
    ':focus-within': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  input: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: 0,
    color: color['--ult-color-text'],
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
    minWidth: 0,
    outline: 'none',
    padding: 0,
    '::placeholder': { color: color['--ult-color-text-subtle'] },
  },
  addon: {
    alignItems: 'center',
    color: color['--ult-color-text-subtle'],
    display: 'inline-flex',
    flexShrink: 0,
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-4'],
    minHeight: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
});

const aligns = stylex.create({
  start: { order: -1 },
  end: { order: 1 },
});

type InputGroupSize = keyof typeof sizes;
type InputGroupAlign = keyof typeof aligns;
type InputGroupRootProps = PartProps<useRender.ComponentProps<'div'>> & { size?: InputGroupSize };
type InputGroupInputProps = PartProps<ComponentProps<typeof BaseInput>>;
type InputGroupAddonProps = PartProps<useRender.ComponentProps<'div'>> & { align?: InputGroupAlign };

function Root({ size = 'md', ref, render, style, ...props }: InputGroupRootProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.root, sizes[size], style) },
  });
}

function Input({ style, ...props }: InputGroupInputProps) {
  return <BaseInput {...props} {...stylex.props(styles.input, style)} />;
}

function Addon({ align = 'start', ref, render, style, ...props }: InputGroupAddonProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.addon, aligns[align], style) },
  });
}

const InputGroup = { Root, Input, Addon };

export {
  InputGroup,
  type InputGroupSize,
  type InputGroupAlign,
  type InputGroupRootProps,
  type InputGroupInputProps,
  type InputGroupAddonProps,
};
