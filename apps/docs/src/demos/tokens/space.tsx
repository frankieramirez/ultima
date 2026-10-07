import * as stylex from '@stylexjs/stylex';
import { color, radius, space } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  bar: {
    backgroundColor: color['--ult-color-text-muted'],
    borderRadius: radius['--ult-radius-xs'],
    height: space['--ult-space-5'],
    width: space['--ult-space-9'],
  },
});

const live = stylex.create({
  width: (token: string) => ({ width: `var(${token})` }),
});

export default function SpaceBar({ token }: { token?: string }) {
  return <div aria-hidden="true" {...stylex.props(styles.bar, token ? live.width(token) : null)} />;
}
