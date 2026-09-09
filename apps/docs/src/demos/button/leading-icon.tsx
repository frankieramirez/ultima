import { ArrowDownIcon } from '@phosphor-icons/react';
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

export default function LeadingIcon() {
  return (
    <div {...stylex.props(styles.row)}>
      <Button>
        <ArrowDownIcon />
        Download
      </Button>
      <Button variant="outline">
        <ArrowDownIcon />
        Download
      </Button>
    </div>
  );
}
