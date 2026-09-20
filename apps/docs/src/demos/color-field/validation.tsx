import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { ColorField, Field } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
  },
});

export default function Validation() {
  return (
    <Field.Root name="accent" invalid>
      <Field.Label>Accent</Field.Label>
      <ColorField.Root defaultValue="#3366ff">
        <div {...stylex.props(styles.row)}>
          <ColorField.Swatch aria-label="Pick accent" />
          <ColorField.Input />
        </div>
        <ColorField.Portal>
          <ColorField.Positioner sideOffset={8}>
            <ColorField.Popup>
              <ColorField.Picker />
            </ColorField.Popup>
          </ColorField.Positioner>
        </ColorField.Portal>
      </ColorField.Root>
      <Field.Error match>Enter a valid six-digit hex.</Field.Error>
    </Field.Root>
  );
}
