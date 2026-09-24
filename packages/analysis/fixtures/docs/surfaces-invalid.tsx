// ULT-DOCS-001 must reject each painting declaration below; docs.test.ts asserts every line.
import * as sx from '@stylexjs/stylex';
import { create as make, keyframes } from '@stylexjs/stylex';
import { border, color, radius, shadow } from '@ultima/tokens/tokens.stylex';

const FILL = 'backgroundColor';
const base = { boxShadow: shadow['--ult-shadow-md'] };

export const direct = sx.create({
  panel: {
    backgroundColor: color['--ult-color-surface-raised'],
    'borderRadius': radius['--ult-radius-lg'],
    [FILL]: color['--ult-color-surface'],
    ...base,
    borderTop: `${border.hairline} solid ${color['--ult-color-border']}`,
    backgroundImage: `linear-gradient(${color['--ult-color-surface']}, transparent)`,
    ':hover': { borderColor: color['--ult-color-border-strong'] },
    padding: 0,
  },
});

export const renamed = make({
  toned: { borderInlineStartWidth: { default: 0, ':focus-within': border.hairline } },
  dynamic: (fill: string) => ({ background: fill }),
  hidden: { scrollbarWidth: 'none' },
  tinted: { scrollbarColor: `${color['--ult-color-border']} transparent` },
  webkit: { '::-webkit-scrollbar': { display: 'none' } },
});

export const pulse = keyframes({
  from: { backgroundColor: color['--ult-color-accent'] },
});
