// ULT-DOCS-001 cannot establish these, so each is ULT-ANALYSIS-001 rather than a pass.
import * as stylex from '@stylexjs/stylex';
import { color } from '@ultima/tokens/tokens.stylex';

import { shared } from './layout';

const property = () => 'backgroundColor';

export const styles = stylex.create({
  spread: { ...shared },
  computed: { [property()]: color['--ult-color-surface'] },
});
