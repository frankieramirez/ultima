import { Outlet } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  shell: {
    backgroundColor: color.surface,
    color: color.text,
    fontFamily: font.sans,
    minHeight: '100vh',
  },
});

export function Root() {
  return (
    <div {...stylex.props(styles.shell)}>
      <Outlet />
    </div>
  );
}
