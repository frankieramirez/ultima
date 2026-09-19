import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Avatar } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
  },
});

export default function FallbackAvatar() {
  return (
    <div {...stylex.props(styles.row)}>
      <Avatar.Root aria-hidden="true">
        <Avatar.Fallback>FR</Avatar.Fallback>
        <Avatar.Image src="/missing-avatar.png" alt="" />
      </Avatar.Root>
      <span>Frankie Ramirez</span>
    </div>
  );
}
