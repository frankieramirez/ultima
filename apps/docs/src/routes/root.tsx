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

export function Root() {
  return (
    <ThemeRoot>
      <div {...stylex.props(styles.shell)}>
        <Header />
        <Outlet />
      </div>
    </ThemeRoot>
  );
}
