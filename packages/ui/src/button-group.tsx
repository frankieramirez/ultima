'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  horizontal: { flexDirection: 'row' },
  vertical: { flexDirection: 'column' },
  item: {
    alignItems: 'center',
    appearance: 'none',
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontWeight: font['--ult-font-weight-medium'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    textDecoration: 'none',
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, color',
    transitionTimingFunction: easing.standard,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

// A disabled button still matches `:hover` and `:active`, so each pointer value is restated
// inside `[data-disabled]` at its resting value: the dimmed button does not answer the pointer.
const solid = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent'],
      ':hover': color['--ult-color-accent-hover'],
      ':active': color['--ult-color-accent-active'],
      ':is([data-disabled])': {
        default: color['--ult-color-accent'],
        ':hover': color['--ult-color-accent'],
        ':active': color['--ult-color-accent'],
      },
    },
    borderColor: 'transparent',
    color: color['--ult-color-accent-contrast'],
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger'],
      ':hover': color['--ult-color-danger-hover'],
      ':active': color['--ult-color-danger-active'],
      ':is([data-disabled])': {
        default: color['--ult-color-danger'],
        ':hover': color['--ult-color-danger'],
        ':active': color['--ult-color-danger'],
      },
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-contrast'],
  },
});

const outline = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      ':active': color['--ult-color-surface-active'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent', ':active': 'transparent' },
    },
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text'],
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-danger-subtle'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent' },
    },
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

const ghost = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      ':active': color['--ult-color-surface-active'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent', ':active': 'transparent' },
    },
    borderColor: 'transparent',
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
      ':is([data-disabled])': { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text-muted'] },
    },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-danger-subtle'],
      ':is([data-disabled])': { default: 'transparent', ':hover': 'transparent' },
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-text'],
  },
});

const variants = { solid, outline, ghost };

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-5'],
  },
  md: {
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-7'],
  },
});

const joined = stylex.create({
  horizontal: {
    borderEndEndRadius: { ':not(:last-child)': 0 },
    borderEndStartRadius: { ':not(:first-child)': 0 },
    borderInlineStartWidth: { ':not(:first-child)': 0 },
    borderStartEndRadius: { ':not(:last-child)': 0 },
    borderStartStartRadius: { ':not(:first-child)': 0 },
  },
  vertical: {
    borderBlockStartWidth: { ':not(:first-child)': 0 },
    borderEndEndRadius: { ':not(:last-child)': 0 },
    borderEndStartRadius: { ':not(:last-child)': 0 },
    borderStartEndRadius: { ':not(:first-child)': 0 },
    borderStartStartRadius: { ':not(:first-child)': 0 },
  },
});

type ButtonGroupVariant = keyof typeof variants;
type ButtonGroupSize = keyof typeof sizes;
type ButtonGroupTone = keyof typeof solid;
type ButtonGroupOrientation = 'horizontal' | 'vertical';

type ButtonGroupContextValue = {
  variant: ButtonGroupVariant;
  size: ButtonGroupSize;
  tone: ButtonGroupTone;
  orientation: ButtonGroupOrientation;
};

const ButtonGroupContext = createContext<ButtonGroupContextValue>({
  variant: 'solid',
  size: 'md',
  tone: 'accent',
  orientation: 'horizontal',
});

type ButtonGroupRootProps = PartProps<useRender.ComponentProps<'div'>> & {
  variant?: ButtonGroupVariant;
  size?: ButtonGroupSize;
  tone?: ButtonGroupTone;
  orientation?: ButtonGroupOrientation;
};

type ButtonGroupItemProps = PartProps<ComponentProps<typeof BaseButton>> & {
  variant?: ButtonGroupVariant;
  tone?: ButtonGroupTone;
};

/** `aria-label` or `aria-labelledby` names the group; no child part can. */
function Root({
  variant = 'solid',
  size = 'md',
  tone = 'accent',
  orientation = 'horizontal',
  ref,
  render,
  style,
  ...props
}: ButtonGroupRootProps) {
  return (
    <ButtonGroupContext value={{ variant, size, tone, orientation }}>
      {useRender({
        defaultTagName: 'div',
        ref,
        render,
        props: { role: 'group', ...props, ...stylex.props(styles.root, styles[orientation], style) },
      })}
    </ButtonGroupContext>
  );
}

function Item({ variant, tone, style, ...props }: ButtonGroupItemProps) {
  const inherited = use(ButtonGroupContext);
  return (
    <BaseButton
      {...props}
      {...stylex.props(
        styles.item,
        variants[variant ?? inherited.variant][tone ?? inherited.tone],
        sizes[inherited.size],
        joined[inherited.orientation],
        style,
      )}
    />
  );
}

const ButtonGroup = { Root, Item };

export {
  ButtonGroup,
  type ButtonGroupRootProps,
  type ButtonGroupItemProps,
  type ButtonGroupVariant,
  type ButtonGroupSize,
  type ButtonGroupTone,
  type ButtonGroupOrientation,
};
