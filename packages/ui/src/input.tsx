'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

// A field is the brightest surface and its edge meets 3:1 against the page. Hover darkens the
// edge one step on devices that hover. `:read-only` also matches a disabled input, so one key
// gives both the sunken fill and the quiet edge. Each edge key names its whole state, so an
// invalid field keeps its danger edge through hover, focus, read-only and disabled. Focus draws the
// outline outside the edge with a gap, in the focus color even when invalid: the edge already
// carries the error, so one red mark is enough.
const styles = stylex.create({
  root: {
    appearance: 'none',
    backgroundColor: { default: color['--ult-color-field'], ':read-only': color['--ult-color-surface-sunken'] },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':read-only:not([aria-invalid="true"], [data-invalid])': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger'],
      [HOVER]: {
        ':hover:not(:read-only, [aria-invalid="true"], [data-invalid])': color['--ult-color-border-hover'],
      },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':disabled': color['--ult-color-text-disabled'] },
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    minWidth: 0,
    outline: {
      default: 'none',
      ':focus-visible': `${border.focus} solid ${color['--ult-color-border-focus']}`,
    },
    outlineOffset: border.focusOffset,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: '100%',
    // A disabled field's placeholder takes the disabled ink too, so an empty field doesn't look editable.
    '::placeholder': {
      color: { default: color['--ult-color-text-subtle'], ':disabled': color['--ult-color-text-disabled'] },
      opacity: 1,
    },
  },
});

// Field text is text step 4, and rises to step 5 under a coarse pointer so iOS doesn't zoom on focus.
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    height: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
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
