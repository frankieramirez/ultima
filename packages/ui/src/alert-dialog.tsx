'use client';

import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, filter, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';
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
    borderRadius: radius['--ult-radius-xl'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-lg'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-8'],
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
    padding: space['--ult-space-8'],
    transform: {
      default: 'none',
      ':is([data-starting-style])': 'scale(0.96)',
      ':is([data-ending-style])': 'scale(0.96)',
    },
    transformOrigin: 'var(--transform-origin)',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
    // The panel's width whatever it holds, so a short form does not shrink it into a popover.
    width: '100%',
    zIndex: z.popup,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    margin: 0,
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
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    justifyContent: 'flex-end',
    margin: 0,
  },
});

type AlertDialogViewportProps = PartProps<ComponentProps<typeof BaseAlertDialog.Viewport>>;
type AlertDialogBackdropProps = PartProps<ComponentProps<typeof BaseAlertDialog.Backdrop>>;
type AlertDialogPopupProps = PartProps<ComponentProps<typeof BaseAlertDialog.Popup>>;
type AlertDialogHeaderProps = PlainProps<'div'>;
type AlertDialogTitleProps = PartProps<ComponentProps<typeof BaseAlertDialog.Title>>;
type AlertDialogDescriptionProps = PartProps<ComponentProps<typeof BaseAlertDialog.Description>>;
type AlertDialogFooterProps = PlainProps<'div'>;

function Viewport({ style, ...props }: AlertDialogViewportProps) {
  return <BaseAlertDialog.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

function Backdrop({ style, ...props }: AlertDialogBackdropProps) {
  return <BaseAlertDialog.Backdrop {...props} {...stylex.props(styles.backdrop, style)} />;
}

function Popup({ style, ...props }: AlertDialogPopupProps) {
  return <BaseAlertDialog.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Header({ style, ...props }: AlertDialogHeaderProps) {
  return <div {...props} {...stylex.props(styles.header, style)} />;
}

function Title({ style, ...props }: AlertDialogTitleProps) {
  return <BaseAlertDialog.Title {...props} {...stylex.props(styles.title, style)} />;
}

function Description({ style, ...props }: AlertDialogDescriptionProps) {
  return <BaseAlertDialog.Description {...props} {...stylex.props(styles.description, style)} />;
}

function Footer({ style, ...props }: AlertDialogFooterProps) {
  return <div {...props} {...stylex.props(styles.footer, style)} />;
}

const AlertDialog = {
  Root: BaseAlertDialog.Root,
  Trigger: BaseAlertDialog.Trigger,
  Portal: BaseAlertDialog.Portal,
  Backdrop,
  Viewport,
  Popup,
  Header,
  Title,
  Description,
  Footer,
  Close: BaseAlertDialog.Close,
  Handle: BaseAlertDialog.Handle,
  createHandle: BaseAlertDialog.createHandle,
};

export {
  AlertDialog,
  type AlertDialogViewportProps,
  type AlertDialogBackdropProps,
  type AlertDialogPopupProps,
  type AlertDialogHeaderProps,
  type AlertDialogTitleProps,
  type AlertDialogDescriptionProps,
  type AlertDialogFooterProps,
};
