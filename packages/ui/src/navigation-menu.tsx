'use client';

import { NavigationMenu as BaseNavigationMenu } from '@base-ui/react/navigation-menu';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
// Base UI marks the anchored Popup with its side, and nothing in the List carries one.
const IN_POPUP = ':is([data-side] *)';
const IN_POPUP_HOVER = ':is([data-side] *):hover';

const UP = ':is([data-side="bottom"])';
const DOWN = ':is([data-side="top"])';
// The `dir` attribute rather than `:dir()`, which the CSS pipeline lowers to language matching.
const RIGHTWARD = ':is([data-side="left"], [data-side="inline-start"]:not([dir="rtl"] *), [data-side="inline-end"]:is([dir="rtl"] *))';
const LEFTWARD = ':is([data-side="right"], [data-side="inline-end"]:not([dir="rtl"] *), [data-side="inline-start"]:is([dir="rtl"] *))';
const ARROW_OFFSET = `calc(-0.5 * ${space['--ult-space-4']})`;

const styles = stylex.create({
  /**
   * `display: flex` is load-bearing for a state rather than for appearance. Base UI gates
   * `data-activation-direction` on the two triggers' rects differing on the menu's axis, so a
   * list of block `<li>` elements leaves it `null` forever and `Content`'s slide never runs.
   */
  list: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-1'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      [HOVER]: { ':hover': color['--ult-color-surface-hover'] },
      ':is([data-popup-open])': color['--ult-color-surface-hover'],
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    cursor: 'default',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-2'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    // Button's `sm` height and padding, so a trigger lines up with a ghost Button beside it.
    minHeight: space['--ult-space-9'],
    paddingInline: space['--ult-space-5'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  icon: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    flexShrink: 0,
  },
  content: {
    boxSizing: 'border-box',
    fontFamily: font['--ult-font-sans'],
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    padding: space['--ult-space-2'],
    transform: {
      default: 'none',
      ':is([data-starting-style][data-activation-direction="left"])': 'translateX(-50%)',
      ':is([data-starting-style][data-activation-direction="right"])': 'translateX(50%)',
      ':is([data-ending-style][data-activation-direction="left"])': 'translateX(50%)',
      ':is([data-ending-style][data-activation-direction="right"])': 'translateX(-50%)',
    },
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
  },
  /**
   * The anchored box. `--positioner-width` and `--positioner-height` are written imperatively
   * from the trigger, first to `auto` and then to measured pixels; unread, the menu snaps
   * between items instead of morphing. `data-instant` is cancelled with the longhand, because
   * the `transition` shorthand compiles into an earlier cascade layer and silently loses.
   */
  positioner: {
    height: 'var(--positioner-height)',
    maxWidth: 'var(--available-width)',
    outline: '0',
    transitionDuration: { default: motion['--ult-motion-base'], ':is([data-instant])': '0s' },
    transitionProperty: 'top, left, right, bottom',
    transitionTimingFunction: easing.standard,
    width: 'var(--positioner-width)',
  },
  /**
   * `--ult-motion-base` is a ceiling rather than a preference: Base UI's `data-instant` resize
   * window is a fixed 100ms constant that does not scale with the token, so a longer duration
   * resumes the morph mid-resize.
   */
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    height: 'var(--popup-height)',
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outlineStyle: 'none',
    outlineWidth: 0,
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'opacity, width, height',
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
    width: 'var(--popup-width)',
    zIndex: z.popup,
  },
  viewport: {
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  /**
   * A square turned 45deg, half outside the popup's edge on the side that faces the anchor.
   * Base UI places only the cross axis; the side offset and the two outward hairlines are set
   * here, so the arrow continues the popup's border and covers it where they meet.
   */
  arrow: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderBottomColor: { default: 'transparent', [DOWN]: color['--ult-color-border'], [LEFTWARD]: color['--ult-color-border'] },
    borderLeftColor: { default: 'transparent', [UP]: color['--ult-color-border'], [LEFTWARD]: color['--ult-color-border'] },
    borderRightColor: { default: 'transparent', [DOWN]: color['--ult-color-border'], [RIGHTWARD]: color['--ult-color-border'] },
    borderTopColor: { default: 'transparent', [UP]: color['--ult-color-border'], [RIGHTWARD]: color['--ult-color-border'] },
    borderStyle: 'solid',
    borderWidth: border.fine,
    bottom: { default: null, [DOWN]: ARROW_OFFSET },
    boxSizing: 'border-box',
    height: space['--ult-space-4'],
    left: { default: null, [LEFTWARD]: ARROW_OFFSET },
    right: { default: null, [RIGHTWARD]: ARROW_OFFSET },
    top: { default: null, [UP]: ARROW_OFFSET },
    transform: 'rotate(45deg)',
    width: space['--ult-space-4'],
  },
  // In the popup a link is a menu row: 32px, the small radius nested in the content's 4px inset,
  // and the hover ground every popup item takes. A link set straight in the List keeps the plain
  // colour-only treatment, since a bar of links reads by its underline and colour, not by pills.
  link: {
    alignItems: 'center',
    backgroundColor: { default: 'transparent', [HOVER]: { [IN_POPUP_HOVER]: color['--ult-color-surface-hover'] } },
    borderRadius: radius['--ult-radius-sm'],
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text-muted'],
      [HOVER]: { ':hover': color['--ult-color-text'] },
      ':is([data-active], [aria-current="page"])': color['--ult-color-text'],
    },
    display: { default: 'block', [IN_POPUP]: 'flex' },
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-regular'],
    lineHeight: font['--ult-font-leading-normal'],
    minHeight: { default: null, [IN_POPUP]: space['--ult-space-9'] },
    paddingBlock: space['--ult-space-2'],
    paddingInline: { default: space['--ult-space-3'], [IN_POPUP]: space['--ult-space-4'] },
    textDecoration: 'none',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

type NavigationMenuRootProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Root>>;
type NavigationMenuListProps = PartProps<ComponentProps<typeof BaseNavigationMenu.List>>;
type NavigationMenuItemProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Item>>;
type NavigationMenuTriggerProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Trigger>>;
type NavigationMenuIconProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Icon>>;
type NavigationMenuContentProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Content>>;
type NavigationMenuPortalProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Portal>>;
type NavigationMenuPositionerProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Positioner>>;
type NavigationMenuPopupProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Popup>>;
type NavigationMenuViewportProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Viewport>>;
type NavigationMenuBackdropProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Backdrop>>;
type NavigationMenuArrowProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Arrow>>;
type NavigationMenuLinkProps = PartProps<ComponentProps<typeof BaseNavigationMenu.Link>>;

function ChevronDown() {
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
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Root({ style, ...props }: NavigationMenuRootProps) {
  return <BaseNavigationMenu.Root {...props} {...stylex.props(style)} />;
}

function List({ style, ...props }: NavigationMenuListProps) {
  return <BaseNavigationMenu.List {...props} {...stylex.props(styles.list, style)} />;
}

function Item({ style, ...props }: NavigationMenuItemProps) {
  return <BaseNavigationMenu.Item {...props} {...stylex.props(style)} />;
}

function Trigger({ style, ...props }: NavigationMenuTriggerProps) {
  return <BaseNavigationMenu.Trigger {...props} {...stylex.props(styles.trigger, style)} />;
}

function Icon({ style, children, ...props }: NavigationMenuIconProps) {
  return (
    <BaseNavigationMenu.Icon {...props} {...stylex.props(styles.icon, style)}>
      {children ?? <ChevronDown />}
    </BaseNavigationMenu.Icon>
  );
}

function Content({ style, ...props }: NavigationMenuContentProps) {
  return <BaseNavigationMenu.Content {...props} {...stylex.props(styles.content, style)} />;
}

function Portal({ style, ...props }: NavigationMenuPortalProps) {
  return <BaseNavigationMenu.Portal {...props} {...stylex.props(style)} />;
}

function Positioner({ style, ...props }: NavigationMenuPositionerProps) {
  return <BaseNavigationMenu.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: NavigationMenuPopupProps) {
  const hasAccessibleName = props['aria-label'] != null || props['aria-labelledby'] != null;

  return (
    <BaseNavigationMenu.Popup
      {...props}
      {...(hasAccessibleName ? {} : { 'aria-label': 'Submenu' })}
      {...stylex.props(styles.popup, style)}
    />
  );
}

function Viewport({ style, ...props }: NavigationMenuViewportProps) {
  return <BaseNavigationMenu.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

function Backdrop({ style, ...props }: NavigationMenuBackdropProps) {
  return <BaseNavigationMenu.Backdrop {...props} {...stylex.props(style)} />;
}

function Arrow({ style, ...props }: NavigationMenuArrowProps) {
  return <BaseNavigationMenu.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function Link({ style, ...props }: NavigationMenuLinkProps) {
  return <BaseNavigationMenu.Link {...props} {...stylex.props(styles.link, style)} />;
}

const NavigationMenu = {
  Root,
  List,
  Item,
  Trigger,
  Icon,
  Content,
  Portal,
  Positioner,
  Popup,
  Viewport,
  Backdrop,
  Arrow,
  Link,
};

export {
  NavigationMenu,
  type NavigationMenuRootProps,
  type NavigationMenuListProps,
  type NavigationMenuItemProps,
  type NavigationMenuTriggerProps,
  type NavigationMenuIconProps,
  type NavigationMenuContentProps,
  type NavigationMenuPortalProps,
  type NavigationMenuPositionerProps,
  type NavigationMenuPopupProps,
  type NavigationMenuViewportProps,
  type NavigationMenuBackdropProps,
  type NavigationMenuArrowProps,
  type NavigationMenuLinkProps,
};
