import { Outlet } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme } from '@ultima/tokens';
import { color, font } from '@ultima/tokens/tokens.stylex';

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
    <div {...stylex.props(colorScheme.system, styles.shell)}>
      <Outlet />
    </div>
  );
}
