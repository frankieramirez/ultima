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
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':disabled': 0.5, ':is([data-disabled])': 0.5 },
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
    height: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
});

type InputSize = keyof typeof sizes;

/**
 * The accessible name comes from the consumer: `<label htmlFor>`, `aria-label`, or `aria-labelledby`.
 * `size` is the axis, not the native `<input size>` character count, so the native attribute is dropped.
 */
type InputProps = Omit<PartProps<ComponentProps<typeof BaseInput>>, 'size'> & {
  size?: InputSize;
};

function Input({ size = 'md', style, ...props }: InputProps) {
  return <BaseInput {...props} {...stylex.props(styles.root, sizes[size], style)} />;
}

export { Input, type InputProps, type InputSize };
