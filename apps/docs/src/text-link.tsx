import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, motion, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  link: {
    color: color['--ult-color-highlight-text'],
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  muted: {
    alignItems: 'center',
    color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] },
    display: 'inline-flex',
    gap: space['--ult-space-1'],
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
  },
});

type TextLinkProps = PartProps<useRender.ComponentProps<'a'>> & { variant?: 'muted' };

export function TextLink({ ref, render, style, variant, ...props }: TextLinkProps) {
  return useRender({
    defaultTagName: 'a',
    ref,
    render,
    props: {
      ...props,
      ...stylex.props(styles.link, variant === 'muted' && styles.muted, style),
    },
  });
}
