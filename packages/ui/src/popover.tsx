'use client';

import { Popover as BasePopover } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  positioner: {
    outline: 0,
  },
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxWidth: `calc(${space['--ult-space-12']} * 5)`,
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outline: { default: 'none', ':focus': 'none', ':focus-visible': 'none' },
    outlineWidth: { default: 0, ':focus': 0, ':focus-visible': 0 },
    padding: space['--ult-space-5'],
    transform: {
      default: 'none',
      ':is([data-starting-style])': 'scale(0.98)',
      ':is([data-ending-style])': 'scale(0.98)',
    },
    transformOrigin: 'var(--transform-origin)',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
    zIndex: z.popup,
  },
  title: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    margin: 0,
  },
  arrow: {
    height: space['--ult-space-4'],
    width: space['--ult-space-4'],
    '::before': {
      backgroundColor: color['--ult-color-surface-raised'],
      borderColor: color['--ult-color-border'],
      borderStyle: 'solid',
      borderWidth: border.hairline,
      content: '""',
      display: 'block',
      height: space['--ult-space-4'],
      transform: 'rotate(45deg)',
      width: space['--ult-space-4'],
    },
  },
  /**
   * During a trigger change Base UI renders the outgoing content as an absolutely positioned
   * snapshot, which rides the page flow from an unpositioned container.
   */
  viewport: {
    position: 'relative',
  },
});

export type PopoverRootProps = ComponentProps<typeof BasePopover.Root>;

export type PopoverTriggerProps = ComponentProps<typeof BasePopover.Trigger>;

export type PopoverPortalProps = ComponentProps<typeof BasePopover.Portal>;

export type PopoverBackdropProps = ComponentProps<typeof BasePopover.Backdrop>;

export type PopoverCloseProps = ComponentProps<typeof BasePopover.Close>;

export type PopoverPositionerProps = PartProps<ComponentProps<typeof BasePopover.Positioner>>;

export type PopoverPopupProps = PartProps<ComponentProps<typeof BasePopover.Popup>>;

export type PopoverTitleProps = PartProps<ComponentProps<typeof BasePopover.Title>>;

export type PopoverDescriptionProps = PartProps<ComponentProps<typeof BasePopover.Description>>;

export type PopoverArrowProps = PartProps<ComponentProps<typeof BasePopover.Arrow>>;

export type PopoverViewportProps = PartProps<ComponentProps<typeof BasePopover.Viewport>>;

function Positioner({ style, ...props }: PopoverPositionerProps) {
  return <BasePopover.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: PopoverPopupProps) {
  return <BasePopover.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Title({ style, ...props }: PopoverTitleProps) {
  return <BasePopover.Title {...props} {...stylex.props(styles.title, style)} />;
}

function Description({ style, ...props }: PopoverDescriptionProps) {
  return <BasePopover.Description {...props} {...stylex.props(styles.description, style)} />;
}

function Arrow({ style, ...props }: PopoverArrowProps) {
  return <BasePopover.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function Viewport({ style, ...props }: PopoverViewportProps) {
  return <BasePopover.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

const Popover = {
  Root: BasePopover.Root,
  Trigger: BasePopover.Trigger,
  Portal: BasePopover.Portal,
  Positioner,
  Popup,
  Arrow,
  Backdrop: BasePopover.Backdrop,
  Title,
  Description,
  Close: BasePopover.Close,
  Viewport,
  Handle: BasePopover.Handle,
  createHandle: BasePopover.createHandle,
};

export { Popover };
