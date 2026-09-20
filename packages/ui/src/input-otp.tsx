'use client';

import { OTPField as BaseOTPField } from '@base-ui/react/otp-field';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

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
  input: {
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
    padding: 0,
    textAlign: 'center',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  separator: {
    alignSelf: 'center',
    borderBlockStartColor: color['--ult-color-border-strong'],
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: border.hairline,
    boxSizing: 'border-box',
    inlineSize: space['--ult-space-4'],
    margin: 0,
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-4'],
    height: space['--ult-space-9'],
    width: space['--ult-space-9'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-10'],
    width: space['--ult-space-10'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
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
