import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@ultima/tokens/tokens.stylex';

import { Page } from '../page';

const styles = stylex.create({
  home: {
    color: color['--ult-color-highlight-text'],
    fontWeight: font['--ult-font-weight-medium'],
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
  },
});

export function NotFound() {
  return (
    <Page
      breadcrumb="NOT FOUND"
      index={false}
      lede={
        <>
          This page is not in the grimoire.{' '}
          <Link to="/" {...stylex.props(styles.home)}>
            Return to Ultima
          </Link>
          .
        </>
      }
      title="Lost in the aether"
    />
  );
}
