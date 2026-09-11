import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { ReactNode } from 'react';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    minWidth: 0,
  },
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

const fill = stylex.create({
  chip: (value: string) => ({ backgroundColor: value }),
});

export function Swatch({
  value,
  caption,
  note,
}: {
  value: string;
  caption: string;
  note?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.root)}>
      <div aria-hidden {...stylex.props(styles.chip, fill.chip(value))} />
      <span {...stylex.props(styles.caption)}>{caption}</span>
      {note ? <span {...stylex.props(styles.note)}>{note}</span> : null}
    </div>
  );
}
