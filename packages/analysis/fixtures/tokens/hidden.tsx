'use client';

import { create as make, props } from '@stylexjs/stylex';
import { color as palette, space } from '@ultima/tokens/tokens.stylex';

const gap = space['--ult-space-4'];
const tones = palette;
const offset = `calc(${space['--ult-space-4']} + 2px)`;
const property = 'margin';
const base = { paddingBlock: '6px' };
const hover = ':hover';

const styles = make({
  root: {
    ...base,
    gap,
    color: tones['--ult-color-text'],
    [property]: '3px',
    insetBlockStart: offset,
    outlineColor: { default: palette['--ult-color-border'], [hover]: { default: null, '@media (min-width: 40rem)': 'red' } },
  },
});

function Separator() {
  return <hr {...props(styles.root)} />;
}

export { Separator };
