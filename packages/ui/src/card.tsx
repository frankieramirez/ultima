'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-xl'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-sm'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    margin: 0,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
    padding: space['--ult-space-8'],
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
  body: {
    paddingBlockEnd: space['--ult-space-8'],
    paddingInline: space['--ult-space-8'],
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    paddingBlockEnd: space['--ult-space-8'],
    paddingInline: space['--ult-space-8'],
  },
});

type CardRootProps = PartProps<useRender.ComponentProps<'div'>>;
type CardHeaderProps = PlainProps<'div'>;
type CardTitleProps = PartProps<useRender.ComponentProps<'h3'>>;
type CardDescriptionProps = PlainProps<'div'>;
type CardBodyProps = PlainProps<'div'>;
type CardFooterProps = PlainProps<'div'>;

function Root({ ref, render, style, ...props }: CardRootProps) {
  return useRender({ defaultTagName: 'div', ref, render, props: { ...props, ...stylex.props(styles.root, style) } });
}

function Header({ style, ...props }: CardHeaderProps) {
  return <div {...props} {...stylex.props(styles.header, style)} />;
}

function Title({ ref, render, style, ...props }: CardTitleProps) {
  return useRender({ defaultTagName: 'h3', ref, render, props: { ...props, ...stylex.props(styles.title, style) } });
}

function Description({ style, ...props }: CardDescriptionProps) {
  return <div {...props} {...stylex.props(styles.description, style)} />;
}

function Body({ style, ...props }: CardBodyProps) {
  return <div {...props} {...stylex.props(styles.body, style)} />;
}

function Footer({ style, ...props }: CardFooterProps) {
  return <div {...props} {...stylex.props(styles.footer, style)} />;
}

const Card = { Root, Header, Title, Description, Body, Footer };

export {
  Card,
  type CardRootProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardBodyProps,
  type CardFooterProps,
};
