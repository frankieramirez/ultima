import { PlusIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '@ultima/ui';

const styles = stylex.create({
  iconOnly: {
    aspectRatio: 1,
    paddingInline: 0,
  },
});

export default function IconOnly() {
  return (
    <Button aria-label="Add item" style={styles.iconOnly}>
      <PlusIcon />
    </Button>
  );
}
