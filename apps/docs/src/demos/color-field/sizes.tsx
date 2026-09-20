import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { ColorField } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
    maxWidth: `calc(${space['--ult-space-12']} * 5)`,
  },
});

function Row({ size, name }: { size: 'sm' | 'md' | 'lg'; name: string }) {
  return (
    <ColorField.Root defaultValue="#3366ff" size={size}>
      <div {...stylex.props(styles.row)}>
        <ColorField.Swatch aria-label={`${name} swatch`} />
        <ColorField.Input aria-label={name} />
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

export default function Sizes() {
  return (
    <div {...stylex.props(styles.stack)}>
      <Row size="sm" name="Small" />
      <Row size="md" name="Medium" />
      <Row size="lg" name="Large" />
    </div>
  );
}
