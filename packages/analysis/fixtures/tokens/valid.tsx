'use client';

import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';

// Every structural category of the value grammar, and token reads through supported expressions.
const VERTICAL = ':is([data-orientation="vertical"])';
const step = '--ult-space-4';
const inset = `calc(${space['--ult-space-2']} + ${border.hairline})`;
const width = 25;

const pulse = stylex.keyframes({
  '0%': { opacity: 0.4 },
  '100%': { opacity: 1, transform: 'translateX(-100%) scale(0.95) rotate(45deg)' },
});

const styles = stylex.create({
  root: {
    alignItems: 'center',
    animationIterationCount: 'infinite',
    animationName: pulse,
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: { default: shadow['--ult-shadow-sm'], ':focus-visible': `0 0 0 ${border.focus} ${color['--ult-color-border-focus']}` },
    color: 'currentColor',
    display: 'grid',
    flexGrow: 1,
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space[step],
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    height: { default: space['--ult-space-9'], [VERTICAL]: '100%' },
    inset: 0,
    insetInlineStart: inset,
    lineHeight: font['--ult-font-leading-tight'],
    maxHeight: 'min(100%, 50vh)',
    opacity: { default: 1, [stylex.when.ancestor(':is([data-disabled])')]: 0.5 },
    outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
    padding: `calc(2 * ${space['--ult-space-2']})`,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: easing.standard,
    width: `${width}%`,
    zIndex: { default: 1, ':is([data-popup])': z.popup },
    '::before': { content: '""', inset: 0, position: 'absolute' },
  },
  glyph: { flexShrink: 0, height: '1em', width: '1em' },
  hidden: { clipPath: 'inset(50%)', height: '1px', overflow: 'hidden', position: 'absolute', whiteSpace: 'nowrap', width: '1px' },
  thumb: (x: number) => ({ insetInlineStart: `${x}%` }),
  icon: { blockSize: '1em' },
});

function Separator({ x }: { x: number }) {
  return (
    <div {...stylex.props(styles.root, styles.thumb(x))}>
      <svg viewBox="0 0 24 24" {...stylex.props(styles.icon)} />
      <span {...stylex.props(styles.glyph)} />
      <span {...stylex.props(styles.hidden)} />
    </div>
  );
}

export { Separator };
