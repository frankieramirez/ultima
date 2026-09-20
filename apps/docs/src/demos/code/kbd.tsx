import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Code } from '@ultima/ui';

const styles = stylex.create({
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
  },
  line: {
    margin: 0,
  },
});

export default function KbdRecipe() {
  return (
    <div {...stylex.props(styles.column)}>
      <p {...stylex.props(styles.line)}>
        Press <Code render={<kbd />}>Esc</Code> to close the dialog.
      </p>
      <p {...stylex.props(styles.line)}>
        Press <Code render={<kbd />}>Ctrl</Code> + <Code render={<kbd />}>K</Code> to open the
        palette.
      </p>
    </div>
  );
}
