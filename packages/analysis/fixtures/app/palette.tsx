// A palette read blocks: the scale ignores color mode and every semantic override.
import * as stylex from '@stylexjs/stylex';

import { mithril } from '@/lib/tokens.stylex';

const styles = stylex.create({
  banner: { backgroundColor: mithril.dark3, padding: '12px' },
});

export function Banner() {
  return <div {...stylex.props(styles.banner)}>Banner</div>;
}
