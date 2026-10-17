'use client';

import { OTPField as BaseOTPField } from '@base-ui/react/otp-field';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  // Input's field recipe on each slot: the field fill, the 3:1 edge that darkens on hover, the
  // outline laid over the edge (in danger on an invalid slot), and the sunken fill, quiet edge and
  // disabled ink in place of a fade. Each key names its whole state.
  input: {
    appearance: 'none',
    backgroundColor: { default: color['--ult-color-field'], ':disabled': color['--ult-color-surface-sunken'] },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':disabled:not([aria-invalid="true"], [data-invalid])': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger'],
      [HOVER]: { ':hover:not(:disabled, [aria-invalid="true"], [data-invalid])': color['--ult-color-border-hover'] },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':disabled': color['--ult-color-text-disabled'] },
    fontFamily: font['--ult-font-sans'],
    fontVariantNumeric: 'tabular-nums',
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    outline: {
      default: 'none',
      ':focus-visible:not([aria-invalid="true"], [data-invalid])': `${border.focus} solid ${color['--ult-color-border-focus']}`,
      ':is([aria-invalid="true"], [data-invalid]):focus-visible': `${border.focus} solid ${color['--ult-color-danger']}`,
    },
    outlineOffset: `calc(-1 * ${border.hairline})`,
    padding: 0,
    textAlign: 'center',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
  },
  separator: {
    alignSelf: 'center',
    borderBlockStartColor: color['--ult-color-text-subtle'],
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: border.hairline,
    boxSizing: 'border-box',
    inlineSize: space['--ult-space-4'],
    margin: 0,
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    height: space['--ult-space-9'],
    width: space['--ult-space-9'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-10'],
    width: space['--ult-space-10'],
  },
  lg: {
    fontSize: text['--ult-text-6'],
    height: space['--ult-space-11'],
    width: space['--ult-space-11'],
  },
});

type InputOTPSize = keyof typeof sizes;

const SizeContext = createContext<InputOTPSize>('md');

type InputOTPRootProps = PartProps<ComponentProps<typeof BaseOTPField.Root>> & {
  size?: InputOTPSize;
};

/**
 * The native `size` attribute is dropped: `size` sits on `Root` and the slots are
 * uniform squares, never sized per slot.
 */
type InputOTPInputProps = Omit<PartProps<ComponentProps<typeof BaseOTPField.Input>>, 'size'>;
type InputOTPSeparatorProps = PartProps<ComponentProps<typeof BaseOTPField.Separator>>;

function Root({ size = 'md', style, ...props }: InputOTPRootProps) {
  return (
    <SizeContext value={size}>
      <BaseOTPField.Root {...props} {...stylex.props(styles.root, style)} />
    </SizeContext>
  );
}

function Input({ style, ...props }: InputOTPInputProps) {
  const size = use(SizeContext);
  return <BaseOTPField.Input {...props} {...stylex.props(styles.input, sizes[size], style)} />;
}

function Separator({ style, ...props }: InputOTPSeparatorProps) {
  return <BaseOTPField.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

const InputOTP = { Root, Input, Separator };

export {
  InputOTP,
  type InputOTPSize,
  type InputOTPRootProps,
  type InputOTPInputProps,
  type InputOTPSeparatorProps,
};
