import { StarIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Toggle } from '@ultima/ui';

const styles = stylex.create({
  iconOnly: {
    paddingInline: space['--ult-space-4'],
  },
});

export default function IconOnlyToggle() {
  return (
    <Toggle aria-label="Favorite" style={styles.iconOnly}>
      <StarIcon />
    </Toggle>
  );
}
