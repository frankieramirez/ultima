import { StarIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Toggle } from '@ultima/ui';

const styles = stylex.create({
  iconOnly: {
    aspectRatio: 1,
    paddingInline: 0,
  },
});

export default function IconOnlyToggle() {
  return (
    <Toggle aria-label="Favorite" style={styles.iconOnly}>
      <StarIcon />
    </Toggle>
  );
}
