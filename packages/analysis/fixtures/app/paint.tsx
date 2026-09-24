// Raw paint is advisory; raw arrangement is free; a semantic token passes.
import * as stylex from '@stylexjs/stylex';

import { color, radius } from '@/lib/tokens.stylex';

const styles = stylex.create({
  hex: { color: '#ff0000' },
  padding: { padding: '13px', gap: 7, width: '42rem' },
  token: { color: color['--ult-color-text'], borderRadius: radius['--ult-radius-md'] },
  variable: { backgroundColor: 'var(--ult-color-surface-raised)' },
});

export function Paint() {
  return (
    <div {...stylex.props(styles.hex, styles.padding, styles.token, styles.variable)}>
      <p style={{ color: 'var(--ult-color-text-muted)', margin: '3px' }}>Muted</p>
      <p style={{ fontSize: '17px' }}>Large</p>
    </div>
  );
}
