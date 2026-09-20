'use client';

import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, filter, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  viewport: {
    boxSizing: 'border-box',
    display: 'grid',
    inset: 0,
    overflow: 'auto',
    padding: space['--ult-space-6'],
    placeItems: 'center',
    position: 'fixed',
    zIndex: z.popup,
  },
  backdrop: {
    backdropFilter: filter['--ult-filter-backdrop'],
    backgroundColor: color['--ult-color-surface-overlay'],
    inset: 0,
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    position: 'fixed',
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'opacity',
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
    margin: 0,
    maxHeight: '100%',
    maxWidth: `min(calc(7 * ${space['--ult-space-12']}), 100%)`,
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outline: { default: 'none', ':focus': 'none', ':focus-visible': 'none' },
    outlineWidth: { default: 0, ':focus': 0, ':focus-visible': 0 },
    overflow: 'auto',
    padding: space['--ult-space-6'],
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
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
  },
});

type AlertDialogViewportProps = PartProps<ComponentProps<typeof BaseAlertDialog.Viewport>>;
type AlertDialogBackdropProps = PartProps<ComponentProps<typeof BaseAlertDialog.Backdrop>>;
type AlertDialogPopupProps = PartProps<ComponentProps<typeof BaseAlertDialog.Popup>>;
type AlertDialogTitleProps = PartProps<ComponentProps<typeof BaseAlertDialog.Title>>;
type AlertDialogDescriptionProps = PartProps<ComponentProps<typeof BaseAlertDialog.Description>>;

function Viewport({ style, ...props }: AlertDialogViewportProps) {
  return <BaseAlertDialog.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

function Backdrop({ style, ...props }: AlertDialogBackdropProps) {
  return <BaseAlertDialog.Backdrop {...props} {...stylex.props(styles.backdrop, style)} />;
}

function Popup({ style, ...props }: AlertDialogPopupProps) {
  return <BaseAlertDialog.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Title({ style, ...props }: AlertDialogTitleProps) {
  return <BaseAlertDialog.Title {...props} {...stylex.props(styles.title, style)} />;
}

function Description({ style, ...props }: AlertDialogDescriptionProps) {
  return <BaseAlertDialog.Description {...props} {...stylex.props(styles.description, style)} />;
}

const AlertDialog = {
  Root: BaseAlertDialog.Root,
  Trigger: BaseAlertDialog.Trigger,
  Portal: BaseAlertDialog.Portal,
  Backdrop,
  Viewport,
  Popup,
  Title,
  Description,
  Close: BaseAlertDialog.Close,
  Handle: BaseAlertDialog.Handle,
  createHandle: BaseAlertDialog.createHandle,
};

export {
  AlertDialog,
  type AlertDialogViewportProps,
  type AlertDialogBackdropProps,
  type AlertDialogPopupProps,
  type AlertDialogTitleProps,
  type AlertDialogDescriptionProps,
};
