'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-2'],
    margin: 0,
  },
  label: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-snug'],
    textTransform: 'uppercase',
  },
  /**
   * A headline number can't wrap, so it holds 24px where stat cards sit two-up on a phone and steps
   * up to 30px from the desktop breakpoint, where it has the room to stand clear of a Card title.
   */
  value: {
    color: color['--ult-color-text'],
    fontSize: { default: text['--ult-text-8'], [DESKTOP]: text['--ult-text-9'] },
    fontVariantNumeric: 'tabular-nums',
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-none'],
  },
  /** A Badge's type role without the pill: a short figure tagged onto the value above it. */
  delta: {
    alignItems: 'center',
    display: 'flex',
    fontSize: text['--ult-text-2'],
    fontVariantNumeric: 'tabular-nums',
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-2'],
    lineHeight: font['--ult-font-leading-snug'],
  },
});

/** Tone follows what the change means, never its sign: a rising refund rate is `warning`. */
const deltaTones = stylex.create({
  neutral: { color: color['--ult-color-text-muted'] },
  success: { color: color['--ult-color-success-text'] },
  warning: { color: color['--ult-color-warning-text'] },
  danger: { color: color['--ult-color-danger-text'] },
});

type StatRootProps = PartProps<useRender.ComponentProps<'div'>>;
type StatLabelProps = PlainProps<'span'>;
type StatValueProps = PlainProps<'span'>;
type StatDeltaTone = keyof typeof deltaTones;
type StatDeltaTrend = 'up' | 'down';
type StatDeltaProps = PlainProps<'span'> & {
  tone?: StatDeltaTone;
  /** Draws a trend glyph before the text. Decorative: the text carries the sign. */
  trend?: StatDeltaTrend;
};

// Lucide's trending-up and trending-down on its 24 grid at Ultima's 1.5 stroke. A trend line, not an
// arrow: an arrow pointing up and right is the external-link glyph.
const TREND_PATHS: Record<StatDeltaTrend, readonly [string, string]> = {
  up: ['M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'],
  down: ['M16 17h6v-6', 'm22 17-8.5-8.5-5 5L2 7'],
};

function TrendGlyph({ trend }: { trend: StatDeltaTrend }) {
  const [head, line] = TREND_PATHS[trend];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" aria-hidden="true">
      <path d={head} />
      <path d={line} />
    </svg>
  );
}

/** Reading order is the DOM order: put `Stat.Label` before `Stat.Value`. */
function Root({ ref, render, style, ...props }: StatRootProps) {
  return useRender({ defaultTagName: 'div', ref, render, props: { ...props, ...stylex.props(styles.root, style) } });
}

function Label({ style, ...props }: StatLabelProps) {
  return <span {...props} {...stylex.props(styles.label, style)} />;
}

function Value({ style, ...props }: StatValueProps) {
  return <span {...props} {...stylex.props(styles.value, style)} />;
}

/** Put the change in the text (`+12%`), so the sign never depends on the tone or the glyph. */
function Delta({ tone = 'neutral', trend, children, style, ...props }: StatDeltaProps) {
  return (
    <span {...props} {...stylex.props(styles.delta, deltaTones[tone], style)}>
      {trend ? <TrendGlyph trend={trend} /> : null}
      {children}
    </span>
  );
}

const Stat = { Root, Label, Value, Delta };

export {
  Stat,
  type StatRootProps,
  type StatLabelProps,
  type StatValueProps,
  type StatDeltaProps,
  type StatDeltaTone,
  type StatDeltaTrend,
};
