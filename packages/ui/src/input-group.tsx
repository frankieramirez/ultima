'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

// The group draws Input's field recipe around its parts. Its own `:read-only` would match the
// div, so the keys ask whether the input inside is read-only, which a disabled input also is.
const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: {
      default: color['--ult-color-field'],
      ':has(:is(input, textarea):read-only)': color['--ult-color-surface-sunken'],
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':has(:is(input, textarea):read-only):not(:has([aria-invalid="true"], [data-invalid]))': color['--ult-color-border'],
      ':has(:is([aria-invalid="true"], [data-invalid]))': color['--ult-color-danger'],
      [HOVER]: {
        ':hover:not(:has(:is(input, textarea):read-only, [aria-invalid="true"], [data-invalid]))':
          color['--ult-color-border-hover'],
      },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':has(:disabled)': color['--ult-color-text-disabled'] },
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    minWidth: 0,
    outline: {
      default: 'none',
      ':focus-within:not(:has([aria-invalid="true"], [data-invalid]))': `${border.focus} solid ${color['--ult-color-border-focus']}`,
      ':has(:is([aria-invalid="true"], [data-invalid])):focus-within': `${border.focus} solid ${color['--ult-color-danger']}`,
    },
    outlineOffset: `calc(-1 * ${border.hairline})`,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: '100%',
  },
  input: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: 0,
    color: 'inherit',
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
    minWidth: 0,
    outline: 'none',
    padding: 0,
    '::placeholder': { color: color['--ult-color-text-subtle'], opacity: 1 },
  },
  addon: {
    alignItems: 'center',
    color: color['--ult-color-text-subtle'],
    display: 'inline-flex',
    flexShrink: 0,
  },
});

// Field text is text step 4, and rises to step 5 under a coarse pointer so iOS doesn't zoom on focus.
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
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
