import { IconContext, type IconProps } from '@phosphor-icons/react';
import { Outlet } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font } from '@ultima/tokens/tokens.stylex';

import { Header } from '../header';
import { ThemeRoot } from '../theme';

const styles = stylex.create({
  shell: {
    backgroundColor: color['--ult-color-surface'],
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    minHeight: '100vh',
  },
});

// Phosphor's provider replaces its context wholesale and IconBase has no
// fallback for size, so a partial value renders every glyph at zero.
const icons: IconProps = {
  color: 'currentColor',
  size: '1em',
  weight: 'regular',
  mirrored: false,
};

export function Root() {
  return (
    <ThemeRoot>
      <IconContext.Provider value={icons}>
        <div {...stylex.props(styles.shell)}>
          <Header />
          <Outlet />
        </div>
      </IconContext.Provider>
    </ThemeRoot>
  );
}
