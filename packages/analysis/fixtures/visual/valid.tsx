'use client';

import * as stylex from '@stylexjs/stylex';
import { border, color, filter, shadow } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  surface: {
    borderColor: color['--ult-color-border'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: { default: shadow['--ult-shadow-sm'], ':is([data-pressed])': 'none' },
  },
  scrim: {
    backdropFilter: filter['--ult-filter-backdrop'],
    backgroundColor: color['--ult-color-surface-overlay'],
    opacity: { default: 1, ':is([data-starting-style])': 0 },
  },
  control: {
    borderColor: color['--ult-color-border-strong'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: { default: 'none', ':focus-visible': 'none' },
    outline: { default: 'none', ':focus-visible': `${border.focus} solid ${color['--ult-color-border-focus']}` },
    outlineOffset: border.focusOffset,
  },
  link: {
    borderInlineStartColor: color['--ult-color-accent'],
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: { default: 0, ':is([data-active], [aria-current="page"])': border.focus },
  },
});

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return <hr {...rest} {...stylex.props(styles.surface, styles.scrim, styles.control, styles.link, style)} />;
}

export { Separator };
