import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  page: {
    marginInline: 'auto',
    maxWidth: '44rem',
    paddingBlock: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
  title: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-10'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-5'],
  },
  home: {
    color: color['--ult-color-highlight-text'],
    fontWeight: font['--ult-font-weight-medium'],
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
  },
});

export function NotFound() {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>Lost in the aether</h1>
      <p {...stylex.props(styles.lede)}>
        This page is not in the grimoire.{' '}
        <Link to="/" {...stylex.props(styles.home)}>
          Return to Ultima
        </Link>
        .
      </p>
    </main>
  );
}
