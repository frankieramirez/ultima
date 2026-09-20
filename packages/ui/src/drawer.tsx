'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, filter, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

/** The dismiss direction the drawer is anchored to, as Base UI writes it onto Popup and SwipeArea. */
const DOWN = ':is([data-swipe-direction="down"])';
const UP = ':is([data-swipe-direction="up"])';
const LEFT = ':is([data-swipe-direction="left"])';
const RIGHT = ':is([data-swipe-direction="right"])';
const HORIZONTAL = ':is([data-swipe-direction="left"], [data-swipe-direction="right"])';

const TRANSITIONING = ':is([data-starting-style], [data-ending-style])';

const PANEL = `min(calc(4 * ${space['--ult-space-12']}), 100%)`;

const styles = stylex.create({
  /**
   * The gesture root, and the placement Dialog's viewport does with a grid. It takes no
   * `overflow`: the gesture walks from the touched node up to this element, so a scroller on
   * the swipe axis would hand it away before it arrives.
   */
  viewport: {
    alignItems: {
      default: 'stretch',
      [`:has(${DOWN})`]: 'flex-end',
      [`:has(${UP})`]: 'flex-start',
    },
    display: 'flex',
    inset: 0,
    justifyContent: {
      default: 'flex-start',
      [`:has(${RIGHT})`]: 'flex-end',
    },
    position: 'fixed',
    zIndex: z.popup,
  },
  /**
   * `--drawer-swipe-progress` is what makes the scrim track the finger, and the zero duration
   * under `[data-swiping]` is what lets it: Base UI writes no inline `transition: none` here the
   * way it does on the popup.
   */
  backdrop: {
    backdropFilter: filter['--ult-filter-backdrop'],
    backgroundColor: color['--ult-color-surface-overlay'],
    inset: 0,
    opacity: {
      default: 'calc(1 - var(--drawer-swipe-progress))',
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    position: 'fixed',
    transitionDuration: {
      default: motion['--ult-motion-base'],
      ':is([data-ending-style])': `calc(var(--drawer-swipe-strength) * ${motion['--ult-motion-base']})`,
      ':is([data-swiping])': '0s',
    },
    transitionProperty: 'opacity',
    zIndex: z.popup,
  },
  /**
   * The overlay surface, sliding from its edge instead of scaling. Two of its declarations are
   * the primitive's rather than Ultima's taste: the resting `transform` reads the movement
   * variables because Base UI drops its inline drag styles on release and a `transform: none`
   * underneath would snap the panel back for a frame, and `--drawer-height` is absent unless a
   * nested drawer is open or this one is exiting, so it needs the `auto` fallback.
   */
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderBottomLeftRadius: { default: radius['--ult-radius-lg'], [`:is(${DOWN}, ${LEFT})`]: 0 },
    borderBottomRightRadius: { default: radius['--ult-radius-lg'], [`:is(${DOWN}, ${RIGHT})`]: 0 },
    borderColor: color['--ult-color-border'],
    borderStyle: 'solid',
    borderTopLeftRadius: { default: radius['--ult-radius-lg'], [`:is(${UP}, ${LEFT})`]: 0 },
    borderTopRightRadius: { default: radius['--ult-radius-lg'], [`:is(${UP}, ${RIGHT})`]: 0 },
    borderWidth: border.hairline,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    height: 'var(--drawer-height, auto)',
    margin: 0,
    maxHeight: '100%',
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outline: { default: 'none', ':focus': 'none', ':focus-visible': 'none' },
    outlineWidth: { default: 0, ':focus': 0, ':focus-visible': 0 },
    padding: space['--ult-space-6'],
    transform: {
      default: 'translate(var(--drawer-swipe-movement-x), calc(var(--drawer-snap-point-offset) + var(--drawer-swipe-movement-y)))',
      [`${DOWN}${TRANSITIONING}`]: 'translateY(100%)',
      [`${UP}${TRANSITIONING}`]: 'translateY(-100%)',
      [`${LEFT}${TRANSITIONING}`]: 'translateX(-100%)',
      [`${RIGHT}${TRANSITIONING}`]: 'translateX(100%)',
    },
    // The strength lands between 0.1 and 1 after a flick and is exactly 1 for every other close,
    // so one declaration covers a flick, a slow release, and a press on Close.
    transitionDuration: {
      default: motion['--ult-motion-base'],
      ':is([data-ending-style])': `calc(var(--drawer-swipe-strength) * ${motion['--ult-motion-base']})`,
    },
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
    width: { default: '100%', [HORIZONTAL]: PANEL },
    willChange: 'transform',
    zIndex: z.popup,
  },
  title: {
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
  },
  /**
   * Base UI supplies this part's `touch-action` inline and nothing dimensional, so an unstyled
   * swipe area is a zero-area element and swipe-to-open does not exist. Its attribute is the
   * direction that *opens* the drawer, so the strip sits on the opposite edge.
   */
  swipeArea: {
    height: { default: space['--ult-space-10'], [HORIZONTAL]: 'auto' },
    inset: {
      default: 'auto 0 0 0',
      [DOWN]: '0 0 auto 0',
      [LEFT]: '0 0 0 auto',
      [RIGHT]: '0 auto 0 0',
    },
    position: 'fixed',
    width: { default: 'auto', [HORIZONTAL]: space['--ult-space-10'] },
    zIndex: z.popup,
  },
});

export type DrawerRootProps = ComponentProps<typeof BaseDrawer.Root>;

export type DrawerProviderProps = ComponentProps<typeof BaseDrawer.Provider>;

export type DrawerTriggerProps = ComponentProps<typeof BaseDrawer.Trigger>;

export type DrawerPortalProps = ComponentProps<typeof BaseDrawer.Portal>;

export type DrawerCloseProps = ComponentProps<typeof BaseDrawer.Close>;

export type DrawerContentProps = ComponentProps<typeof BaseDrawer.Content>;

export type DrawerIndentProps = ComponentProps<typeof BaseDrawer.Indent>;

export type DrawerIndentBackgroundProps = ComponentProps<typeof BaseDrawer.IndentBackground>;

export type DrawerVirtualKeyboardProviderProps = ComponentProps<typeof BaseDrawer.VirtualKeyboardProvider>;

export type DrawerBackdropProps = PartProps<ComponentProps<typeof BaseDrawer.Backdrop>>;

export type DrawerViewportProps = PartProps<ComponentProps<typeof BaseDrawer.Viewport>>;

export type DrawerPopupProps = PartProps<ComponentProps<typeof BaseDrawer.Popup>>;

export type DrawerTitleProps = PartProps<ComponentProps<typeof BaseDrawer.Title>>;

export type DrawerDescriptionProps = PartProps<ComponentProps<typeof BaseDrawer.Description>>;

export type DrawerSwipeAreaProps = PartProps<ComponentProps<typeof BaseDrawer.SwipeArea>>;

function Viewport({ style, ...props }: DrawerViewportProps) {
  return <BaseDrawer.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

function Backdrop({ style, ...props }: DrawerBackdropProps) {
  return <BaseDrawer.Backdrop {...props} {...stylex.props(styles.backdrop, style)} />;
}

function Popup({ style, ...props }: DrawerPopupProps) {
  return <BaseDrawer.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Title({ style, ...props }: DrawerTitleProps) {
  return <BaseDrawer.Title {...props} {...stylex.props(styles.title, style)} />;
}

function Description({ style, ...props }: DrawerDescriptionProps) {
  return <BaseDrawer.Description {...props} {...stylex.props(styles.description, style)} />;
}

function SwipeArea({ style, ...props }: DrawerSwipeAreaProps) {
  return <BaseDrawer.SwipeArea {...props} {...stylex.props(styles.swipeArea, style)} />;
}

const Drawer = {
  Root: BaseDrawer.Root,
  Provider: BaseDrawer.Provider,
  Trigger: BaseDrawer.Trigger,
  Portal: BaseDrawer.Portal,
  Backdrop,
  Viewport,
  Popup,
  Content: BaseDrawer.Content,
  Title,
  Description,
  Close: BaseDrawer.Close,
  Indent: BaseDrawer.Indent,
  IndentBackground: BaseDrawer.IndentBackground,
  SwipeArea,
  VirtualKeyboardProvider: BaseDrawer.VirtualKeyboardProvider,
  Handle: BaseDrawer.Handle,
  createHandle: BaseDrawer.createHandle,
};

export { Drawer };
