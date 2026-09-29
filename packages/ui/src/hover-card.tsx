'use client';

import { PreviewCard } from '@base-ui/react/preview-card';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  /**
   * `inherit` rather than a token, so the trigger takes the prose around it instead of asserting
   * `--ult-color-text` over a muted paragraph. Omitting `color` entirely does not reach that: an
   * `<a href>` carries the UA's own link colour, which wins over the parent the same way the UA
   * margins and `appearance` that every Ultima root already resets do.
   */
  trigger: {
    borderRadius: radius['--ult-radius-sm'],
    color: 'inherit',
    textDecorationLine: 'underline',
    textUnderlineOffset: space['--ult-space-1'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  positioner: {
    outline: 0,
    zIndex: z.popup,
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

export type HoverCardRootProps = ComponentProps<typeof PreviewCard.Root>;

export type HoverCardPortalProps = ComponentProps<typeof PreviewCard.Portal>;

export type HoverCardBackdropProps = ComponentProps<typeof PreviewCard.Backdrop>;

export type HoverCardTriggerProps = PartProps<ComponentProps<typeof PreviewCard.Trigger>>;

export type HoverCardPositionerProps = PartProps<ComponentProps<typeof PreviewCard.Positioner>>;

export type HoverCardPopupProps = PartProps<ComponentProps<typeof PreviewCard.Popup>>;

export type HoverCardArrowProps = PartProps<ComponentProps<typeof PreviewCard.Arrow>>;

export type HoverCardViewportProps = PartProps<ComponentProps<typeof PreviewCard.Viewport>>;

function Trigger({ style, ...props }: HoverCardTriggerProps) {
  return <PreviewCard.Trigger {...props} {...stylex.props(styles.trigger, style)} />;
}

function Positioner({ style, ...props }: HoverCardPositionerProps) {
  return <PreviewCard.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: HoverCardPopupProps) {
  return <PreviewCard.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: HoverCardArrowProps) {
  return <PreviewCard.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function Viewport({ style, ...props }: HoverCardViewportProps) {
  return <PreviewCard.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

const HoverCard = {
  Root: PreviewCard.Root,
  Trigger,
  Portal: PreviewCard.Portal,
  Positioner,
  Popup,
  Arrow,
  Backdrop: PreviewCard.Backdrop,
  Viewport,
  Handle: PreviewCard.Handle,
  createHandle: PreviewCard.createHandle,
};

export { HoverCard };
