import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({ root: { padding: space['--ult-space-2'] } });

function Separator({ style, ...rest }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  return <hr {...rest} {...stylex.props(styles.root, style)} />;
}

export { Separator };
