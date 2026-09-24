import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({ root: { padding: space['--ult-space-2'] } });

function Separator() {
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
