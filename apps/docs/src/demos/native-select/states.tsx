import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { NativeSelect } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
  field: {
    display: 'grid',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
  },
  error: {
    color: color['--ult-color-danger-text'],
    fontSize: text['--ult-text-3'],
  },
});

export default function NativeSelectStates() {
  return (
    <div {...stylex.props(styles.stack)}>
      <div {...stylex.props(styles.field)}>
        <label htmlFor="rarity">Rarity</label>
        <NativeSelect.Root>
          <NativeSelect.Select
            id="rarity"
            defaultValue="legendary"
            aria-invalid="true"
            aria-describedby="rarity-error"
          >
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="legendary">Legendary</option>
          </NativeSelect.Select>
        </NativeSelect.Root>
        <span id="rarity-error" {...stylex.props(styles.error)}>Rarity is not available in this league.</span>
      </div>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Disabled rarity" defaultValue="rare" disabled>
          <option value="common">Common</option>
          <option value="rare">Rare</option>
          <option value="legendary">Legendary</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
    </div>
  );
}
