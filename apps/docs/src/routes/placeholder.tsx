import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  page: {
    marginInline: 'auto',
    maxWidth: '44rem',
    paddingBlock: space['--ult-space-9'],
    paddingInline: space['--ult-space-6'],
  },
  title: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-9'],
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
});

export function Placeholder({ title, ticket }: { title: string; ticket: string }) {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      <p {...stylex.props(styles.lede)}>This page is filled by {ticket}.</p>
    </main>
  );
}
