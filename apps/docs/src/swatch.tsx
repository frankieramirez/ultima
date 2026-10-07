import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { ReactNode } from 'react';

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-2'], minWidth: 0 },
  chip: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-xs'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    height: space['--ult-space-11'],
  },
  anchor: { borderColor: color['--ult-color-text'] },
  caption: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    lineHeight: font['--ult-font-leading-tight'],
  },
  note: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
    lineHeight: font['--ult-font-leading-tight'],
  },
});

const fill = stylex.create({ chip: (value: string) => ({ backgroundColor: value }) });

const rampChip = stylex.create({ chip: { height: '2.125rem' } });

const square = stylex.create({
  chip: { display: 'block', height: space['--ult-space-9'], width: space['--ult-space-9'] },
});

const split = stylex.create({
  chip: {
    display: 'flex',
    flexShrink: 0,
    height: '1.75rem',
    overflow: 'hidden',
    width: '2.75rem',
  },
  half: { flexGrow: 1 },
});

export function SwatchChip({ value, style }: { value: string; style?: stylex.StyleXStyles }) {
  return <span aria-hidden {...stylex.props(styles.chip, square.chip, fill.chip(value), style)} />;
}

export function SplitSwatch({ dark, light }: { dark: string; light: string }) {
  return (
    <span aria-hidden {...stylex.props(styles.chip, split.chip)}>
      <span {...stylex.props(split.half, fill.chip(dark))} />
      <span {...stylex.props(split.half, fill.chip(light))} />
    </span>
  );
}

export function Swatch({
  value,
  caption,
  note,
  anchor = false,
  noteStyle,
}: {
  value: string;
  caption: string;
  note?: ReactNode;
  anchor?: boolean;
  noteStyle?: stylex.StyleXStyles;
}) {
  return (
    <div {...stylex.props(styles.root)}>
      <div aria-hidden {...stylex.props(styles.chip, rampChip.chip, anchor && styles.anchor, fill.chip(value))} />
      <span {...stylex.props(styles.caption)}>{caption}</span>
      {note ? <span {...stylex.props(styles.note, noteStyle)}>{note}</span> : null}
    </div>
  );
}
