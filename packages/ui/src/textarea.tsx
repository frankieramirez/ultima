'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    appearance: 'none',
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger-border'],
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    opacity: { default: 1, ':disabled': 0.5, ':is([data-disabled])': 0.5 },
    resize: 'vertical',
    width: '100%',
    '::placeholder': { color: color['--ult-color-text-subtle'] },
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-4'],
    minHeight: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-10'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-6'],
  },
});

type TextareaSize = keyof typeof sizes;

/**
 * The accessible name comes from the consumer: `<label htmlFor>`, `aria-label`, or `aria-labelledby`.
 * `size` is the axis, not the native `<input size>` character count on the Input primitive, so that attribute is dropped.
 */
type TextareaProps = Omit<PartProps<ComponentProps<typeof BaseInput>>, 'size'> & {
  size?: TextareaSize;
};

function Textarea({ size = 'md', style, render = <textarea />, ...props }: TextareaProps) {
  return <BaseInput {...props} render={render} {...stylex.props(styles.root, sizes[size], style)} />;
}

export { Textarea, type TextareaProps, type TextareaSize };
