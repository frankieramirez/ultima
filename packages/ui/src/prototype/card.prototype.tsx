/**
 * PROTOTYPE (ULT-7). Throwaway. A static component with no Base UI primitive
 * behind it, to feel the boilerplate on the plain-element side.
 *
 * What it probes:
 * - slot composition (Root, Header, Title, Description, Body, Footer)
 * - whether Base UI's `useRender` earns its keep on a non-Base-UI component
 *   (Root uses it; the other slots are plain elements, for contrast)
 * - the same `style` escape hatch as Button
 */
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { color, radius, space } from '@ultima/tokens/tokens.stylex';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    padding: space['--ult-space-6'],
  },
  header: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-2'] },
  title: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.3, margin: 0 },
  description: { color: color['--ult-color-text-muted'], fontSize: '0.875rem', lineHeight: 1.5, margin: 0 },
  body: { fontSize: '0.875rem', lineHeight: 1.5 },
  footer: { alignItems: 'center', display: 'flex', gap: space['--ult-space-4'], justifyContent: 'flex-end' },
});

type Slot<E extends keyof React.JSX.IntrinsicElements> = Omit<ComponentProps<E>, 'className' | 'style'> & {
  style?: stylex.StyleXStyles;
};

// Root goes through useRender so a consumer can do <Card.Root render={<article />} />
// and so the composition contract matches Base UI parts exactly.
// Note the friction: useRender.ComponentProps already types `style` as
// React CSSProperties, so the StyleX `style` has to Omit it first. And
// `props` is one object, so StyleX output and caller props get spread together.
type RootProps = Omit<useRender.ComponentProps<'div'>, 'className' | 'style'> & {
  style?: stylex.StyleXStyles;
};

function Root({ render, style, ...props }: RootProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: { ...props, ...stylex.props(styles.root, style) },
  });
}

// The remaining slots are plain elements. Compare the weight against Root.
function Header({ style, ...props }: Slot<'div'>) {
  return <div {...props} {...stylex.props(styles.header, style)} />;
}
function Title({ style, ...props }: Slot<'h3'>) {
  return <h3 {...props} {...stylex.props(styles.title, style)} />;
}
function Description({ style, ...props }: Slot<'p'>) {
  return <p {...props} {...stylex.props(styles.description, style)} />;
}
function Body({ style, ...props }: Slot<'div'>) {
  return <div {...props} {...stylex.props(styles.body, style)} />;
}
function Footer({ style, ...props }: Slot<'div'>) {
  return <div {...props} {...stylex.props(styles.footer, style)} />;
}

export const Card = { Root, Header, Title, Description, Body, Footer };
