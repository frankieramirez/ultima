'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  positioner: {
    outline: '0',
  },
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: shadow['--ult-shadow-sm'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    maxWidth: `calc(${space['--ult-space-12']} * 5)`,
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outline: { default: 'none', ':focus': 'none', ':focus-visible': 'none' },
    outlineWidth: { default: 0, ':focus': 0, ':focus-visible': 0 },
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-3'],
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
});

type TooltipTriggerProps = PartProps<ComponentProps<typeof BaseTooltip.Trigger>> & { 'aria-label': string };
type TooltipPositionerProps = PartProps<ComponentProps<typeof BaseTooltip.Positioner>>;
type TooltipPopupProps = PartProps<ComponentProps<typeof BaseTooltip.Popup>>;
type TooltipArrowProps = PartProps<ComponentProps<typeof BaseTooltip.Arrow>>;

function Trigger({ style, ...props }: TooltipTriggerProps) {
  return <BaseTooltip.Trigger {...props} {...stylex.props(style)} />;
}

function Positioner({ style, ...props }: TooltipPositionerProps) {
  return <BaseTooltip.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: TooltipPopupProps) {
  return <BaseTooltip.Popup role="tooltip" {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: TooltipArrowProps) {
  return <BaseTooltip.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

const Tooltip = {
  Provider: BaseTooltip.Provider,
  Root: BaseTooltip.Root,
  Trigger,
  Portal: BaseTooltip.Portal,
  Positioner,
  Popup,
  Arrow,
  Viewport: BaseTooltip.Viewport,
};

export { Tooltip, type TooltipTriggerProps, type TooltipPositionerProps, type TooltipPopupProps, type TooltipArrowProps };
