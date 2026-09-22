import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';

import { DocumentLayout } from '../document-layout';
import { TextLink } from '../text-link';

const styles = stylex.create({
  title: {
    color: color['--ult-color-text'],
    fontSize: { default: text['--ult-text-10'], '@media (min-width: 48rem)': text['--ult-text-12'] },
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
  home: {
    fontWeight: font['--ult-font-weight-medium'],
  },
});

export function NotFound() {
  return (
    <DocumentLayout breadcrumb="NOT FOUND" index={false}>
      <h1 {...stylex.props(styles.title)}>Lost in the aether</h1>
      <p {...stylex.props(styles.lede)}>
        This page is not in the grimoire.{' '}
        <TextLink style={styles.home} render={<Link to="/" />}>
          Return to Ultima
        </TextLink>
        .
      </p>
    </DocumentLayout>
  );
}
