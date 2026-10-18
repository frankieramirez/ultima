import { ArrowDownIcon } from 'lucide-react';
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

export default function Basic() {
  return (
    <div {...stylex.props(styles.row)}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Button key={size} size={size} variant="outline">
          <Icon><ArrowDownIcon /></Icon>
          Download
        </Button>
      ))}
    </div>
  );
}
