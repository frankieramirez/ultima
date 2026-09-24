import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';

import { breakpoints } from './breakpoints.stylex';
import { ColorModeToggle } from './color-mode-toggle';
import { layoutStyles } from './layout';
import { Kicker } from './page';
import { TextLink } from './text-link';

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-8'],
  },
  cluster: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
  },
  links: {
    alignItems: 'center',
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    gap: space['--ult-space-6'],
  },
  // Above the breakpoint the header carries the switch, so the footer's copy serves narrow viewports only.
  mode: { display: { default: 'inline-flex', [breakpoints.WIDE]: 'none' } },
});

export function SiteFooter({ wide = false }: { wide?: boolean }) {
  return (
    <footer {...stylex.props(wide ? layoutStyles.gutterWide : layoutStyles.gutter, styles.bar)}>
      <Kicker>ULTIMA / A SYSTEM FOR BUILDING INTERFACES</Kicker>
      <div {...stylex.props(styles.cluster)}>
        <div {...stylex.props(styles.links)}>
          <TextLink variant="muted" render={<Link to="/install" />}>
            Install <ArrowUpRightIcon aria-hidden />
          </TextLink>
          <TextLink variant="muted" href="https://github.com/frankieramirez/ultima">
            GitHub <ArrowUpRightIcon aria-hidden />
          </TextLink>
          <TextLink variant="muted" href="https://github.com/frankieramirez/ultima/blob/main/LICENSE">
            MIT license
          </TextLink>
        </div>
        <ColorModeToggle style={styles.mode} />
      </div>
    </footer>
  );
}
