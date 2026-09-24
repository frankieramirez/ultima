'use client';

import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({ root: { margin: 0 } });
const loose = { color: 'red' };

function Separator({ ratio }: { ratio: number }) {
  const { style: injected, ...rest } = stylex.props(styles.root);
  return (
    <div>
      <hr {...rest} style={{ ...injected, aspectRatio: ratio, display: 'block' }} />
      <hr style={{ padding: '4px' }} />
      <hr style={{ padding: space['--ult-space-4'] }} />
      <hr style={loose} />
    </div>
  );
}

export { Separator };
