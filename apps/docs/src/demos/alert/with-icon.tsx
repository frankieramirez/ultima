import { WarningIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Alert } from '@ultima/ui';

const styles = stylex.create({
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
  },
});

export default function WithIcon() {
  return (
    <Alert.Root tone="warning">
      <Alert.Icon>
        <WarningIcon />
      </Alert.Icon>
      <div {...stylex.props(styles.copy)}>
        <Alert.Title>Disk almost full</Alert.Title>
        <Alert.Description>87% of 500 GB used.</Alert.Description>
      </div>
    </Alert.Root>
  );
}
