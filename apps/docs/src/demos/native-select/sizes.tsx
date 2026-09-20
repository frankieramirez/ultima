import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { NativeSelect } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
});

export default function NativeSelectSizes() {
  return (
    <div {...stylex.props(styles.stack)}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <NativeSelect.Root key={size}>
          <NativeSelect.Select aria-label={`${size} character class`} size={size} defaultValue="warrior">
            <option value="warrior">Warrior</option>
            <option value="mage">Mage</option>
            <option value="rogue">Rogue</option>
          </NativeSelect.Select>
        </NativeSelect.Root>
      ))}
    </div>
  );
}
