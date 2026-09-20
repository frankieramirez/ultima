import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { ColorField } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
    maxWidth: `calc(${space['--ult-space-12']} * 5)`,
  },
});

export default function Basic() {
  return (
    <ColorField.Root defaultValue="#3366ff">
      <div {...stylex.props(styles.row)}>
        <ColorField.Swatch aria-label="Pick accent" />
        <ColorField.Input aria-label="Hex" />
      </div>
      <ColorField.Portal>
        <ColorField.Positioner sideOffset={8}>
          <ColorField.Popup>
            <ColorField.Picker />
          </ColorField.Popup>
        </ColorField.Positioner>
      </ColorField.Portal>
    </ColorField.Root>
  );
}
