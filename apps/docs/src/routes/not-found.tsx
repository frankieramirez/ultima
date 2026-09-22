import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { font } from '@ultima/tokens/tokens.stylex';

import { Page } from '../page';
import { TextLink } from '../text-link';

const styles = stylex.create({
  home: {
    fontWeight: font['--ult-font-weight-medium'],
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
          <TextLink style={styles.home} render={<Link to="/" />}>
            Return to Ultima
          </TextLink>
          .
        </>
      }
      title="Lost in the aether"
    />
  );
}
