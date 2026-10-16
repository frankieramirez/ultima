'use client';

import { Radio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';

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
  // Checkbox's treatment on a round box: each key names its whole state, disabled is muted rather
  // than faded, and the checked item is the accent fill with a 6px dot in its contrast ink.
  item: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: color['--ult-color-field'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':is([data-checked]):not([data-disabled], :active)': color['--ult-color-accent'],
      ':is([data-checked]):active:not([data-disabled])': color['--ult-color-accent-active'],
      [HOVER]: {
        ':is([data-checked]):hover:not([data-disabled], :active)': color['--ult-color-accent-hover'],
      },
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([data-disabled]):not([aria-invalid="true"], [data-invalid])': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger'],
      ':is([data-checked]):not([aria-invalid="true"], [data-invalid], [data-disabled], :active)': color['--ult-color-accent'],
      ':is([data-checked]):active:not([aria-invalid="true"], [data-invalid], [data-disabled])': color['--ult-color-accent-active'],
      [HOVER]: {
        ':hover:not([data-checked], [aria-invalid="true"], [data-invalid], [data-disabled])': color['--ult-color-border-hover'],
        ':is([data-checked]):hover:not([aria-invalid="true"], [data-invalid], [data-disabled], :active)':
          color['--ult-color-accent-hover'],
      },
    },
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-accent-contrast'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    // The dot is drawn in a `1em` box, so the item sets its own size rather than inheriting the page's.
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-6'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
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
      fill="currentColor"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" />
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
