import { ArrowDownIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Icon } from '@ultima/ui';

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
        <Icon><ArrowDownIcon /></Icon>
        Download
      </Button>
      <Button variant="outline">
        <Icon><ArrowDownIcon /></Icon>
        Download
      </Button>
    </div>
  );
}
