'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    padding: space['--ult-space-9'],
    textAlign: 'center',
  },
  title: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  description: {
    fontSize: text['--ult-text-4'],
  },
  icon: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    flexShrink: 0,
    fontSize: text['--ult-text-9'],
    height: '1em',
    width: '1em',
  },
});

type EmptyRootProps = PartProps<useRender.ComponentProps<'div'>>;
type EmptyTitleProps = PartProps<useRender.ComponentProps<'h3'>>;
type EmptyDescriptionProps = PlainProps<'div'>;
type EmptyIconProps = PlainProps<'span'>;

/** An action is children, a catalogue Button, rather than a fifth part or a plain element. */
function Root({ ref, render, style, ...props }: EmptyRootProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.root, style) },
  });
}

function Title({ ref, render, style, ...props }: EmptyTitleProps) {
  return useRender({
    defaultTagName: 'h3',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.title, style) },
  });
}

function Description({ style, ...props }: EmptyDescriptionProps) {
  return <div {...props} {...stylex.props(styles.description, style)} />;
}

function Icon({ style, children, ...props }: EmptyIconProps) {
  if (children == null) return null;
  return (
    <span {...props} {...stylex.props(styles.icon, style)} aria-hidden="true">
      {children}
    </span>
  );
}

const Empty = { Root, Title, Description, Icon };

export { Empty, type EmptyRootProps, type EmptyTitleProps, type EmptyDescriptionProps, type EmptyIconProps };
