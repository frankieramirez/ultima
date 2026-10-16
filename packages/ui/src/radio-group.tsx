'use client';

import { Radio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  // Checkbox's treatment: the sunken fill, a step on hover and press with the checked steps in their own keys, and a
  // checked border that follows the fill unless the item is invalid.
  item: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: color['--ult-color-surface-sunken'],
      ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      ':is([data-checked])': color['--ult-color-accent'],
      ':is([data-checked]):hover:not([data-disabled])': color['--ult-color-accent-hover'],
      ':is([data-checked]):active:not([data-disabled])': color['--ult-color-accent-active'],
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger-border'],
      ':is([data-checked]):not([aria-invalid="true"], [data-invalid])': color['--ult-color-accent'],
      ':is([data-checked]):not([aria-invalid="true"], [data-invalid]):hover:not([data-disabled])': color['--ult-color-accent-hover'],
      ':is([data-checked]):not([aria-invalid="true"], [data-invalid]):active:not([data-disabled])': color['--ult-color-accent-active'],
    },
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-accent-contrast'],
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    // The dot is drawn in a `1em` box, so the item sets its own size rather than inheriting the page's.
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-6'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    padding: 0,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: space['--ult-space-6'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  indicator: {
    display: { default: 'inline-flex', ':is([data-unchecked])': 'none' },
    flexShrink: 0,
  },
});

function Dot() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}

type RadioGroupRootProps<Value = string> = PartProps<BaseRadioGroup.Props<Value>>;
type RadioGroupItemProps<Value = string> = PartProps<Radio.Root.Props<Value>>;
type RadioGroupIndicatorProps = PartProps<ComponentProps<typeof Radio.Indicator>>;

/** The accessible name comes from `aria-label`, `aria-labelledby`, or a `Fieldset.Legend`. */
function Root<Value = string>({ style, ...props }: RadioGroupRootProps<Value>) {
  return <BaseRadioGroup<Value> {...props} {...stylex.props(styles.root, style)} />;
}

function Item<Value = string>({ style, ...props }: RadioGroupItemProps<Value>) {
  return <Radio.Root<Value> {...props} {...stylex.props(styles.item, style)} />;
}

function Indicator({ style, children, ...props }: RadioGroupIndicatorProps) {
  return (
    <Radio.Indicator {...props} {...stylex.props(styles.indicator, style)}>
      {children ?? <Dot />}
    </Radio.Indicator>
  );
}

const RadioGroup = { Root, Item, Indicator };

export { RadioGroup, type RadioGroupRootProps, type RadioGroupItemProps, type RadioGroupIndicatorProps };
