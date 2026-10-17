'use client';

import { Toast as BaseToast } from '@base-ui/react/toast';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const UP = ':is([data-side="bottom"])';
const DOWN = ':is([data-side="top"])';
// The `dir` attribute rather than `:dir()`, which the CSS pipeline lowers to language matching.
const RIGHTWARD = ':is([data-side="left"], [data-side="inline-start"]:not([dir="rtl"] *), [data-side="inline-end"]:is([dir="rtl"] *))';
const LEFTWARD = ':is([data-side="right"], [data-side="inline-end"]:not([dir="rtl"] *), [data-side="inline-start"]:is([dir="rtl"] *))';

const stackWidth = `calc(6 * ${space['--ult-space-12']})`;

/**
 * A Root inside a Positioner, which Base UI renders with `data-side` whatever route the anchor took.
 * The Root itself carries no anchored attribute.
 */
const ANCHORED = ':is([data-side] > *)';
/** One attribute more specific than the stack's slide, so it wins the enter and exit outright. */
const ANCHORED_MOTION = ':is([data-side] > *):is([data-starting-style], [data-ending-style])';
/** Popover's cap: an anchored toast is a popup tied to its trigger. */
const popupWidth = `min(calc(5 * ${space['--ult-space-12']}), var(--available-width))`;

const scaleStep = 0.1;
const slideDistance = '150%';

const swipeX = 'var(--toast-swipe-movement-x)';
const swipeY = 'var(--toast-swipe-movement-y)';
const clampedHeight = 'var(--toast-frontmost-height, var(--toast-height))';
/** The same clamp inside a `calc`, where an unset variable would void the whole transform. */
const shrunkHeight = 'var(--toast-frontmost-height, var(--toast-height, 0px))';
const stackScale = `max(0, 1 - (var(--toast-index) * ${scaleStep}))`;
const stackShrink = `(1 - ${stackScale})`;

const collapsedY = `calc(${swipeY} - (var(--toast-index) * ${space['--ult-space-5']}) - (${stackShrink} * ${shrunkHeight}))`;
const collapsedTransform = `translateX(${swipeX}) translateY(${collapsedY}) scale(${stackScale})`;
const expandedY = `calc(${swipeY} - var(--toast-offset-y) - (var(--toast-index) * ${space['--ult-space-5']}))`;
const expandedTransform = `translateX(${swipeX}) translateY(${expandedY})`;

const styles = stylex.create({
  viewport: {
    insetBlockEnd: space['--ult-space-6'],
    insetInlineEnd: space['--ult-space-6'],
    position: 'fixed',
    width: `min(calc(100% - 2 * ${space['--ult-space-6']}), ${stackWidth})`,
    zIndex: z.toast,
  },
  positioner: {
    outline: '0',
  },
  root: {
    backgroundColor: {
      default: color['--ult-color-surface-raised'],
      ':is([data-type="accent"])': color['--ult-color-accent-subtle'],
      ':is([data-type="highlight"])': color['--ult-color-highlight-subtle'],
      ':is([data-type="success"])': color['--ult-color-success-subtle'],
      ':is([data-type="warning"])': color['--ult-color-warning-subtle'],
      ':is([data-type="danger"], [data-type="error"])': color['--ult-color-danger-subtle'],
    },
    borderColor: {
      default: color['--ult-color-border'],
      ':is([data-type="accent"])': color['--ult-color-accent-border'],
      ':is([data-type="highlight"])': color['--ult-color-highlight-border'],
      ':is([data-type="success"])': color['--ult-color-success-border'],
      ':is([data-type="warning"])': color['--ult-color-warning-border'],
      ':is([data-type="danger"], [data-type="error"])': color['--ult-color-danger-border'],
    },
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text'],
      ':is([data-type="accent"])': color['--ult-color-accent-text'],
      ':is([data-type="highlight"])': color['--ult-color-highlight-text'],
      ':is([data-type="success"])': color['--ult-color-success-text'],
      ':is([data-type="warning"])': color['--ult-color-warning-text'],
      ':is([data-type="danger"], [data-type="error"])': color['--ult-color-danger-text'],
    },
    fontFamily: font['--ult-font-sans'],
    height: { default: clampedHeight, ':is([data-expanded]):not([data-side] > *)': 'var(--toast-height)', [ANCHORED]: 'auto' },
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxWidth: { default: null, [ANCHORED]: popupWidth },
    opacity: {
      default: 1,
      ':is([data-starting-style], [data-ending-style], [data-limited])': 0,
    },
    position: { default: 'absolute', [ANCHORED]: 'relative' },
    transform: {
      default: collapsedTransform,
      ':is([data-expanded]):not([data-starting-style], [data-ending-style], [data-side] > *)': expandedTransform,
      ':is([data-starting-style], [data-ending-style])': `translateY(${slideDistance})`,
      ':is([data-ending-style][data-swipe-direction="up"])': `translateY(calc(${swipeY} - ${slideDistance}))`,
      ':is([data-ending-style][data-swipe-direction="down"])': `translateY(calc(${swipeY} + ${slideDistance}))`,
      ':is([data-ending-style][data-swipe-direction="left"])': `translateX(calc(${swipeX} - ${slideDistance})) translateY(${expandedY})`,
      ':is([data-ending-style][data-swipe-direction="right"])': `translateX(calc(${swipeX} + ${slideDistance})) translateY(${expandedY})`,
      [ANCHORED]: 'none',
      [ANCHORED_MOTION]: 'scale(0.96)',
    },
    transformOrigin: { default: 'bottom center', [ANCHORED]: 'var(--transform-origin)' },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'height, opacity, transform',
    transitionTimingFunction: easing.standard,
    userSelect: 'none',
    width: { default: '100%', [ANCHORED]: 'max-content' },
    zIndex: `calc(${z.toast} - var(--toast-index))`,
  },
  content: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: space['--ult-space-5'],
    opacity: {
      default: 1,
      ':is([data-behind])': 0,
      ':is([data-behind][data-expanded])': 1,
    },
    overflow: 'hidden',
    padding: space['--ult-space-6'],
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity',
    transitionTimingFunction: easing.standard,
  },
  title: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  /**
   * Popover's arrow: a square turned 45deg, half outside the toast on the side that faces the
   * anchor. It inherits the Root's fill and edge, so a toned toast's arrow takes its tone.
   */
  arrow: {
    backgroundColor: 'inherit',
    borderBottomColor: { default: 'transparent', [DOWN]: 'inherit', [LEFTWARD]: 'inherit' },
    borderLeftColor: { default: 'transparent', [UP]: 'inherit', [LEFTWARD]: 'inherit' },
    borderRightColor: { default: 'transparent', [DOWN]: 'inherit', [RIGHTWARD]: 'inherit' },
    borderTopColor: { default: 'transparent', [UP]: 'inherit', [RIGHTWARD]: 'inherit' },
    borderStyle: 'solid',
    borderWidth: border.fine,
    bottom: { default: null, [DOWN]: `calc(-0.5 * ${space['--ult-space-4']})` },
    boxSizing: 'border-box',
    height: space['--ult-space-4'],
    left: { default: null, [LEFTWARD]: `calc(-0.5 * ${space['--ult-space-4']})` },
    right: { default: null, [RIGHTWARD]: `calc(-0.5 * ${space['--ult-space-4']})` },
    top: { default: null, [UP]: `calc(-0.5 * ${space['--ult-space-4']})` },
    transform: 'rotate(45deg)',
    width: space['--ult-space-4'],
  },
});

type ToastViewportProps = PartProps<ComponentProps<typeof BaseToast.Viewport>>;
type ToastRootProps = PartProps<ComponentProps<typeof BaseToast.Root>>;
type ToastContentProps = PartProps<ComponentProps<typeof BaseToast.Content>>;
type ToastTitleProps = PartProps<ComponentProps<typeof BaseToast.Title>>;
type ToastDescriptionProps = PartProps<ComponentProps<typeof BaseToast.Description>>;
type ToastPositionerProps = PartProps<ComponentProps<typeof BaseToast.Positioner>>;
type ToastArrowProps = PartProps<ComponentProps<typeof BaseToast.Arrow>>;

function Viewport({ style, ...props }: ToastViewportProps) {
  return <BaseToast.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

function Root({ style, ...props }: ToastRootProps) {
  return <BaseToast.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Content({ style, ...props }: ToastContentProps) {
  return <BaseToast.Content {...props} {...stylex.props(styles.content, style)} />;
}

function Title({ style, ...props }: ToastTitleProps) {
  return <BaseToast.Title {...props} {...stylex.props(styles.title, style)} />;
}

function Description({ style, ...props }: ToastDescriptionProps) {
  return <BaseToast.Description {...props} {...stylex.props(styles.description, style)} />;
}

function Positioner({ style, ...props }: ToastPositionerProps) {
  return <BaseToast.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Arrow({ style, ...props }: ToastArrowProps) {
  return <BaseToast.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

const Toast = {
  Provider: BaseToast.Provider,
  Portal: BaseToast.Portal,
  Viewport,
  Positioner,
  Root,
  Content,
  Title,
  Description,
  Action: BaseToast.Action,
  Close: BaseToast.Close,
  Arrow,
  useToastManager: BaseToast.useToastManager,
  createToastManager: BaseToast.createToastManager,
};

export {
  Toast,
  type ToastViewportProps,
  type ToastRootProps,
  type ToastContentProps,
  type ToastTitleProps,
  type ToastDescriptionProps,
  type ToastPositionerProps,
  type ToastArrowProps,
};
