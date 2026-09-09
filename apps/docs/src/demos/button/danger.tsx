import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
  },
});

export default function Danger() {
  return (
    <div {...stylex.props(styles.row)}>
      <Button tone="danger">Delete account</Button>
      <Button variant="outline" tone="danger">
        Delete account
      </Button>
      <Button variant="ghost" tone="danger">
        Delete account
      </Button>
    </div>
  );
}
