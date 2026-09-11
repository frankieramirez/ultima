import * as stylex from '@stylexjs/stylex';
import { color, font, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  sample: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-9'],
    lineHeight: font['--ult-font-leading-tight'],
  },
});

const live = stylex.create({
  fontSize: (token: string) => ({ fontSize: `var(${token})` }),
});

export default function TypeSample({ token }: { token?: string }) {
  return (
    <span aria-hidden="true" {...stylex.props(styles.sample, token ? live.fontSize(token) : null)}>
      Ag
    </span>
  );
}
