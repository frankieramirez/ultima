// ULT-DOCS-001 must pass everything below: page layout, flow spacing, resets that remove paint, and
// painting property names that are not live declarations.
import * as stylex from '@stylexjs/stylex';
import { border, color, space } from '@ultima/tokens/tokens.stylex';

export const example = `stylex.create({ card: { backgroundColor: 'red' } })`;
export const css = ':root { background-color: red; border-radius: 4px }';

const RESET = 'transparent';

export const styles = stylex.create({
  // borderRadius: radius.lg,
  /* boxShadow: shadow.md, */
  column: { overflowY: 'auto', display: 'grid', gap: space['--ult-space-4'] },
  row: { transitionProperty: 'background-color, border-color', outline: `${border.focus} solid ${color['--ult-color-border-focus']}` },
  square: { borderRadius: 0, borderWidth: 0, backgroundColor: 'transparent', boxShadow: 'none', borderStyle: 'solid' },
  cleared: { backgroundColor: { default: RESET, ':hover': null }, backgroundImage: 'none' },
  table: { borderCollapse: 'collapse', borderSpacing: 0 },
  restored: { scrollbarWidth: 'auto' },
});
