import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';

import { breakpoints } from '../breakpoints.stylex';
import { DocumentLayout } from '../document-layout';

const styles = stylex.create({
  title: {
    color: color['--ult-color-text'],
    fontSize: { default: text['--ult-text-10'], [breakpoints.WIDE]: text['--ult-text-12'] },
    fontWeight: font['--ult-font-weight-medium'],
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
    <DocumentLayout breadcrumb={`COMPONENTS / ${title.toUpperCase()}`} index={false}>
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      <p {...stylex.props(styles.lede)}>This page is filled by {ticket}.</p>
    </DocumentLayout>
  );
}
