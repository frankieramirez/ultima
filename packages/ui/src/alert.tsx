'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    alignItems: 'flex-start',
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    padding: space['--ult-space-5'],
  },
  title: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  description: {
    fontSize: text['--ult-text-4'],
  },
  icon: {
    display: 'flex',
    flexShrink: 0,
    height: '1em',
    width: '1em',
  },
});

const tones = stylex.create({
  neutral: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text-muted'],
  },
  accent: {
    backgroundColor: color['--ult-color-accent-subtle'],
    borderColor: color['--ult-color-accent-border'],
    color: color['--ult-color-accent-text'],
  },
  highlight: {
    backgroundColor: color['--ult-color-highlight-subtle'],
    borderColor: color['--ult-color-highlight-border'],
    color: color['--ult-color-highlight-text'],
  },
  success: {
    backgroundColor: color['--ult-color-success-subtle'],
    borderColor: color['--ult-color-success-border'],
    color: color['--ult-color-success-text'],
  },
  warning: {
    backgroundColor: color['--ult-color-warning-subtle'],
    borderColor: color['--ult-color-warning-border'],
    color: color['--ult-color-warning-text'],
  },
  danger: {
    backgroundColor: color['--ult-color-danger-subtle'],
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

type AlertTone = keyof typeof tones;

type AlertRootProps = PartProps<useRender.ComponentProps<'div'>> & {
  tone?: AlertTone;
};
type AlertTitleProps = PartProps<useRender.ComponentProps<'h3'>>;
type AlertDescriptionProps = PlainProps<'div'>;
type AlertIconProps = PlainProps<'span'>;

function Root({ tone = 'neutral', ref, render, style, ...props }: AlertRootProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.root, tones[tone], style) },
  });
}

function Title({ ref, render, style, ...props }: AlertTitleProps) {
  return useRender({
    defaultTagName: 'h3',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.title, style) },
  });
}

function Description({ style, ...props }: AlertDescriptionProps) {
  return <div {...props} {...stylex.props(styles.description, style)} />;
}

function Icon({ style, children, ...props }: AlertIconProps) {
  if (children == null) return null;
  return (
    <span {...props} {...stylex.props(styles.icon, style)} aria-hidden="true">
      {children}
    </span>
  );
}

const Alert = { Root, Title, Description, Icon };

export {
  Alert,
  type AlertRootProps,
  type AlertTitleProps,
  type AlertDescriptionProps,
  type AlertIconProps,
  type AlertTone,
};
