import { StarIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { Icon, Toggle } from '@ultima/ui';

const styles = stylex.create({
  iconOnly: {
    aspectRatio: 1,
    paddingInline: 0,
  },
});

export default function IconOnlyToggle() {
  return (
    <Toggle aria-label="Favorite" style={styles.iconOnly}>
      <Icon><StarIcon /></Icon>
    </Toggle>
  );
}
