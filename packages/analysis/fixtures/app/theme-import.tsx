import * as stylex from '@stylexjs/stylex';

import { color } from '@/lib/tokens.stylex';

import { brand } from './brand-colors';

// Values from a module the checker does not follow cannot be measured: ULT-ANALYSIS-001, incomplete.
export const imported = stylex.createTheme(color, {
  '--ult-color-accent': brand.accent,
  '--ult-color-accent-hover': brand.accentHover,
  '--ult-color-accent-active': brand.accentActive,
});
