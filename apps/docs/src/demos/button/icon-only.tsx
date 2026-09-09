import { PlusIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';

const styles = stylex.create({
  iconOnly: {
    paddingInline: space['--ult-space-4'],
  },
});

export default function IconOnly() {
  return (
    <Button aria-label="Add item" style={styles.iconOnly}>
      <PlusIcon />
    </Button>
  );
}
