import * as stylex from '@stylexjs/stylex';
import { border, color, radius, space } from '@ultima/tokens/tokens.stylex';
import { Combobox, Field } from '@ultima/ui';

const styles = stylex.create({
  box: {
    display: 'grid',
    gap: space['--ult-space-8'],
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
  stack: {
    display: 'grid',
    gap: space['--ult-space-3'],
  },
  triggerBox: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border-strong'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
    minHeight: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
    width: '100%',
  },
});

const ranks = ['Apprentice', 'Adept', 'Magus', 'Archmage'];

function RankPopup() {
  return (
    <Combobox.Portal>
      <Combobox.Positioner sideOffset={4}>
        <Combobox.Popup>
          <Combobox.InputGroup>
            <Combobox.Input placeholder="Search ranks" />
          </Combobox.InputGroup>
          <Combobox.Empty>No rank matches that search.</Combobox.Empty>
          <Combobox.List>
            {(rank: string) => (
              <Combobox.Item key={rank} value={rank}>
                <Combobox.ItemIndicator />
                {rank}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

export default function ComboboxLabelTrap() {
  return (
    <div {...stylex.props(styles.box)}>
      <Field.Root name="rank">
        <Field.Label nativeLabel={false} render={<span />}>
          Guild rank
        </Field.Label>
        <Combobox.Root items={ranks}>
          <Combobox.Trigger style={styles.triggerBox}>
            <Combobox.Value placeholder="Pick a rank" />
            <Combobox.Icon />
          </Combobox.Trigger>
          <RankPopup />
        </Combobox.Root>
      </Field.Root>
      <div {...stylex.props(styles.stack)}>
        <Combobox.Root items={ranks}>
          <Combobox.Label>Guild rank, without a field</Combobox.Label>
          <Combobox.Trigger style={styles.triggerBox}>
            <Combobox.Value placeholder="Pick a rank" />
            <Combobox.Icon />
          </Combobox.Trigger>
          <RankPopup />
        </Combobox.Root>
      </div>
    </div>
  );
}
