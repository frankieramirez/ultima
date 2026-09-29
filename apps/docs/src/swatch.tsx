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
  caption: {
    color: color['--ult-color-text'],
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

/** The Token row's chip: a 48x20 bar beside its hex, settled on #372. */
const inline = stylex.create({
  root: { alignItems: 'center', flexDirection: 'row', gap: space['--ult-space-4'] },
  chip: { flexShrink: 0, height: space['--ult-space-7'], width: space['--ult-space-11'] },
  caption: { fontSize: text['--ult-text-2'], overflowWrap: 'anywhere' },
});

const square = stylex.create({
  chip: { display: 'block', height: space['--ult-space-9'], width: space['--ult-space-9'] },
});

export function SwatchChip({ value, style }: { value: string; style?: stylex.StyleXStyles }) {
  return <span aria-hidden {...stylex.props(styles.chip, square.chip, fill.chip(value), style)} />;
}

/**
 * `stacked` is the chip over its caption, the Palette ramp. `inline` is the chip beside it, the
 * Token row, where `title` carries what the stacked `note` would.
 */
export function Swatch({
  value,
  caption,
  note,
  title,
  layout = 'stacked',
}: {
  value: string;
  caption: string;
  note?: ReactNode;
  title?: string;
  layout?: 'stacked' | 'inline';
}) {
  const isInline = layout === 'inline';
  return (
    <div {...stylex.props(styles.root, isInline && inline.root)}>
      <div aria-hidden title={title} {...stylex.props(styles.chip, isInline && inline.chip, fill.chip(value))} />
      <span {...stylex.props(styles.caption, isInline && inline.caption)}>{caption}</span>
      {note ? <span {...stylex.props(styles.note)}>{note}</span> : null}
    </div>
  );
}
